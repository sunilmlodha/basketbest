-- ============================================================
-- BasketBest UK — Subscription & Usage Tracking
-- Migration 002
-- ============================================================

-- Required for gen_random_bytes() used in invite/share tokens
create extension if not exists "pgcrypto";

-- ── Subscription tiers ────────────────────────────────────────
create type subscription_tier as enum ('free', 'plus', 'family');
create type subscription_status as enum ('active', 'cancelled', 'past_due', 'trialing', 'paused');

-- ── Subscriptions ─────────────────────────────────────────────
create table if not exists subscriptions (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references profiles on delete cascade,
  tier                 subscription_tier not null default 'free',
  status               subscription_status not null default 'active',
  stripe_customer_id   text unique,
  stripe_subscription_id text unique,
  stripe_price_id      text,
  current_period_start timestamptz,
  current_period_end   timestamptz,
  cancel_at_period_end boolean not null default false,
  trial_end            timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists idx_subscriptions_user_id on subscriptions(user_id);
create index if not exists idx_subscriptions_stripe_customer on subscriptions(stripe_customer_id) where stripe_customer_id is not null;

-- Auto-create free subscription on profile creation
create or replace function handle_new_profile()
returns trigger language plpgsql security definer as $$
begin
  insert into subscriptions (user_id, tier, status)
  values (new.id, 'free', 'active')
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_profile_created on profiles;
create trigger on_profile_created
  after insert on profiles
  for each row execute procedure handle_new_profile();

-- ── Usage tracking ────────────────────────────────────────────
create table if not exists usage_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles on delete cascade,
  event_type text not null,  -- 'comparison', 'ai_query', 'receipt_scan', 'price_alert_set'
  metadata   jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_usage_events_user_month
  on usage_events(user_id, event_type, created_at);

-- Monthly usage count function
create or replace function get_monthly_usage(p_user_id uuid, p_event_type text)
returns int language sql stable security definer as $$
  select count(*)::int
  from usage_events
  where user_id = p_user_id
    and event_type = p_event_type
    and created_at >= date_trunc('month', now());
$$;

-- ── Price alerts ──────────────────────────────────────────────
create table if not exists price_alerts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles on delete cascade,
  product_id  text not null,
  product_name text not null,
  target_price numeric(8,2) not null,
  store_id    store_id,  -- null = any store
  is_active   boolean not null default true,
  triggered_at timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists idx_price_alerts_user on price_alerts(user_id) where is_active = true;
create index if not exists idx_price_alerts_product on price_alerts(product_id) where is_active = true;

-- ── Household members ─────────────────────────────────────────
create table if not exists household_members (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references profiles on delete cascade,
  member_id   uuid references profiles on delete set null,
  invite_email text not null,
  invite_token text unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  status      text not null default 'pending',  -- 'pending', 'accepted', 'revoked'
  role        text not null default 'member',   -- 'owner', 'member'
  created_at  timestamptz not null default now()
);

create index if not exists idx_household_owner on household_members(owner_id);
create index if not exists idx_household_member on household_members(member_id) where member_id is not null;

-- ── Shared baskets ────────────────────────────────────────────
-- basket_id references the client-side basket UUID
-- No FK because baskets live in Zustand / will be migrated to Supabase later
create table if not exists basket_shares (
  id          uuid primary key default gen_random_uuid(),
  basket_id   text not null,
  owner_id    uuid not null references profiles on delete cascade,
  share_token text unique default replace(gen_random_uuid()::text, '-', ''),
  expires_at  timestamptz,
  created_at  timestamptz not null default now()
);

-- ── RLS Policies ──────────────────────────────────────────────

alter table subscriptions enable row level security;
create policy "Users can read own subscription"
  on subscriptions for select
  using (auth.uid() = user_id);

alter table usage_events enable row level security;
create policy "Users can insert own events"
  on usage_events for insert
  with check (auth.uid() = user_id);
create policy "Users can read own events"
  on usage_events for select
  using (auth.uid() = user_id);

alter table price_alerts enable row level security;
create policy "Users manage own alerts"
  on price_alerts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table household_members enable row level security;
create policy "Owners manage household"
  on household_members for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);
create policy "Members can read their household"
  on household_members for select
  using (auth.uid() = member_id);

alter table basket_shares enable row level security;
create policy "Owners manage basket shares"
  on basket_shares for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- ── Stripe webhook helper ─────────────────────────────────────
-- Called by stripe-webhook Edge Function to sync subscription state
create or replace function upsert_subscription(
  p_user_id uuid,
  p_stripe_customer_id text,
  p_stripe_subscription_id text,
  p_stripe_price_id text,
  p_tier subscription_tier,
  p_status subscription_status,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_cancel_at_period_end boolean default false,
  p_trial_end timestamptz default null
) returns void language plpgsql security definer as $$
begin
  insert into subscriptions (
    user_id, stripe_customer_id, stripe_subscription_id, stripe_price_id,
    tier, status, current_period_start, current_period_end,
    cancel_at_period_end, trial_end, updated_at
  ) values (
    p_user_id, p_stripe_customer_id, p_stripe_subscription_id, p_stripe_price_id,
    p_tier, p_status, p_period_start, p_period_end,
    p_cancel_at_period_end, p_trial_end, now()
  )
  on conflict (user_id) do update set
    stripe_customer_id      = excluded.stripe_customer_id,
    stripe_subscription_id  = excluded.stripe_subscription_id,
    stripe_price_id         = excluded.stripe_price_id,
    tier                    = excluded.tier,
    status                  = excluded.status,
    current_period_start    = excluded.current_period_start,
    current_period_end      = excluded.current_period_end,
    cancel_at_period_end    = excluded.cancel_at_period_end,
    trial_end               = excluded.trial_end,
    updated_at              = now();
end;
$$;
