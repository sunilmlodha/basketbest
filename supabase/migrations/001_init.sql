-- ============================================================
-- BasketBest UK — Supabase Database Schema
-- ============================================================

-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists "vector";  -- pgvector for product embeddings

-- ── Stores enum ──────────────────────────────────────────────
create type store_id as enum (
  'tesco', 'asda', 'sainsburys', 'morrisons', 'ocado', 'waitrose'
);

create type delivery_slot as enum ('AM', 'PM', 'EVENING');

-- ── Profiles (extends auth.users) ────────────────────────────
create table if not exists profiles (
  id           uuid primary key references auth.users on delete cascade,
  full_name    text,
  phone        text,
  postcode     text,
  loyalty_cards jsonb not null default '{}',  -- { tesco: true, asda: false }
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, full_name, postcode)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'postcode'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ── Delivery addresses ────────────────────────────────────────
create table if not exists addresses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles on delete cascade,
  label       text not null default 'Home',
  line1       text not null,
  line2       text,
  city        text not null,
  postcode    text not null,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists idx_addresses_user_id on addresses(user_id);

-- ── Products catalogue ────────────────────────────────────────
create table if not exists products (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  brand        text,
  category     text not null,
  subcategory  text,
  unit_type    text not null default 'each',
  image_url    text,
  barcode      text unique,
  -- pgvector embedding for semantic cross-store matching
  embedding    vector(1536),
  created_at   timestamptz not null default now()
);

create index if not exists idx_products_barcode on products(barcode) where barcode is not null;
-- Approximate nearest neighbour index for embedding search
create index if not exists idx_products_embedding on products using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- ── Shopping baskets ──────────────────────────────────────────
create table if not exists baskets (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references profiles on delete cascade,
  name             text not null default 'My Basket',
  status           text not null default 'draft',
  is_recurring     boolean not null default false,
  recurring_dow    smallint,  -- 0=Sun..6=Sat
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_baskets_user_id on baskets(user_id);

-- ── Basket items ──────────────────────────────────────────────
create table if not exists basket_items (
  id          uuid primary key default gen_random_uuid(),
  basket_id   uuid not null references baskets on delete cascade,
  product_id  uuid not null references products on delete restrict,
  quantity    numeric(10,3) not null default 1 check (quantity > 0),
  unit        text not null default 'each',
  notes       text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_basket_items_basket_id on basket_items(basket_id);

-- ── Deliveries ────────────────────────────────────────────────
create table if not exists deliveries (
  id               uuid primary key default gen_random_uuid(),
  basket_id        uuid not null references baskets on delete restrict,
  user_id          uuid not null references profiles on delete restrict,
  address_id       uuid not null references addresses on delete restrict,
  scheduled_date   date not null,
  scheduled_slot   delivery_slot not null,
  status           text not null default 'pending',
  chosen_store     store_id,
  total_price      numeric(10,2),
  delivery_fee     numeric(10,2) not null default 3.99,
  stripe_session   text,
  created_at       timestamptz not null default now()
);

create index if not exists idx_deliveries_user_id on deliveries(user_id);
create index if not exists idx_deliveries_basket_id on deliveries(basket_id);

-- ── Price cache (latest price per product per store) ─────────
create table if not exists price_cache (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references products on delete cascade,
  store         store_id not null,
  price         numeric(10,2) not null check (price >= 0),
  unit_price    numeric(10,4),      -- price per 100g or per unit
  available     boolean not null default true,
  substitute_id uuid references products,
  fetched_at    timestamptz not null default now(),
  -- Only one live price per product per store
  unique(product_id, store)
);

create index if not exists idx_price_cache_store_fetched on price_cache(store, fetched_at desc);
create index if not exists idx_price_cache_product_id on price_cache(product_id);

-- ── Price history (for savings charts) ───────────────────────
create table if not exists price_history (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products on delete cascade,
  store       store_id not null,
  price       numeric(10,2) not null,
  fetched_at  timestamptz not null default now()
);

create index if not exists idx_price_history_product_store on price_history(product_id, store, fetched_at desc);

-- ── Comparison line items (normalised from JSONB) ─────────────
create table if not exists comparison_results (
  id              uuid primary key default gen_random_uuid(),
  delivery_id     uuid not null references deliveries on delete cascade,
  recommendations jsonb not null,
  savings_vs_max  numeric(10,2),
  created_at      timestamptz not null default now()
);

create table if not exists comparison_line_items (
  id                 uuid primary key default gen_random_uuid(),
  comparison_id      uuid not null references comparison_results on delete cascade,
  product_id         uuid references products,
  product_name       text not null,
  quantity           numeric(10,3) not null,
  unit               text not null,
  cheapest_store     store_id,
  -- Per-store prices as JSONB (small, bounded by 6 stores)
  store_prices       jsonb not null default '{}'
);

create index if not exists idx_comparison_line_items_comparison_id on comparison_line_items(comparison_id);

-- ── Orders ────────────────────────────────────────────────────
create table if not exists orders (
  id              uuid primary key default gen_random_uuid(),
  delivery_id     uuid not null references deliveries on delete restrict,
  user_id         uuid not null references profiles on delete restrict,
  store           store_id not null,
  store_order_id  text,
  -- Idempotency: one order per delivery
  constraint orders_delivery_unique unique (delivery_id),
  status          text not null default 'placed',
  total_paid      numeric(10,2),
  stripe_event_id text unique,  -- Idempotency: prevent duplicate processing
  confirmed_at    timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists idx_orders_user_id on orders(user_id);

-- ── Row Level Security ────────────────────────────────────────
alter table profiles        enable row level security;
alter table addresses       enable row level security;
alter table baskets         enable row level security;
alter table basket_items    enable row level security;
alter table deliveries      enable row level security;
alter table comparison_results enable row level security;
alter table comparison_line_items enable row level security;
alter table orders          enable row level security;

-- Profiles: users see only their own
create policy "profiles_own" on profiles for all using (auth.uid() = id);

-- Addresses: users see only their own
create policy "addresses_own" on addresses for all using (auth.uid() = user_id);

-- Baskets: users see only their own
create policy "baskets_own" on baskets for all using (auth.uid() = user_id);

-- Basket items: users see items from their baskets
create policy "basket_items_own" on basket_items for all
  using (basket_id in (select id from baskets where user_id = auth.uid()));

-- Deliveries: users see only their own
create policy "deliveries_own" on deliveries for all using (auth.uid() = user_id);

-- Comparison results: via delivery ownership
create policy "comparison_results_own" on comparison_results for all
  using (delivery_id in (select id from deliveries where user_id = auth.uid()));

-- Comparison line items: via comparison ownership
create policy "comparison_line_items_own" on comparison_line_items for all
  using (comparison_id in (
    select cr.id from comparison_results cr
    join deliveries d on d.id = cr.delivery_id
    where d.user_id = auth.uid()
  ));

-- Orders: users see only their own
create policy "orders_own" on orders for all using (auth.uid() = user_id);

-- Products and price_cache are readable by all authenticated users
create policy "products_read" on products for select using (auth.role() = 'authenticated');
create policy "price_cache_read" on price_cache for select using (auth.role() = 'authenticated');
create policy "price_history_read" on price_history for select using (auth.role() = 'authenticated');
