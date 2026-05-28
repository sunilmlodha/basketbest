/**
 * stripe-webhook — handles Stripe payment events with idempotency.
 *
 * Handled events:
 * - checkout.session.completed → create order, update delivery status
 * - payment_intent.payment_failed → update delivery to payment_failed
 *
 * Idempotency: stripe_event_id stored in orders.stripe_event_id (unique constraint).
 * Duplicate events are silently ignored (200 returned).
 *
 * stripe_session on deliveries refers to Stripe Checkout Session ID (cs_xxx).
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-11-20.acacia',
  httpClient: Stripe.createFetchHttpClient(),
})

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) return new Response('Missing signature', { status: 400 })

  let event: Stripe.Event
  try {
    const body = await req.text()
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return new Response('Invalid signature', { status: 400 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Idempotency check: has this event already been processed?
  const { data: existing } = await supabase
    .from('orders')
    .select('id')
    .eq('stripe_event_id', event.id)
    .maybeSingle()

  if (existing) {
    // Already processed — return 200 so Stripe stops retrying
    return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    // Find the delivery by stripe_session
    const { data: delivery, error: dErr } = await supabase
      .from('deliveries')
      .select('id, user_id, basket_id')
      .eq('stripe_session', session.id)
      .single()

    if (dErr || !delivery) {
      console.error('Delivery not found for session:', session.id, dErr)
      return new Response('Delivery not found', { status: 404 })
    }

    // Get chosen store from delivery metadata
    const chosenStore = session.metadata?.store

    // Create order (stripe_event_id enforces idempotency via unique constraint)
    const { error: orderErr } = await supabase.from('orders').insert({
      delivery_id: delivery.id,
      user_id: delivery.user_id,
      store: chosenStore,
      stripe_event_id: event.id,
      status: 'confirmed',
      total_paid: (session.amount_total ?? 0) / 100,
      confirmed_at: new Date().toISOString(),
    })

    if (orderErr) {
      // Duplicate key = already processed (race condition guard)
      if (orderErr.code === '23505') {
        return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 })
      }
      console.error('Failed to create order:', orderErr)
      return new Response('Order creation failed', { status: 500 })
    }

    // Update delivery status
    await supabase
      .from('deliveries')
      .update({ status: 'placed', chosen_store: chosenStore, total_price: (session.amount_total ?? 0) / 100 })
      .eq('id', delivery.id)

    console.log('Order confirmed for delivery:', delivery.id)
  }

  if (event.type === 'payment_intent.payment_failed') {
    const pi = event.data.object as Stripe.PaymentIntent
    console.warn('Payment failed for intent:', pi.id)
    // Update delivery to allow retry
    await supabase
      .from('deliveries')
      .update({ status: 'awaiting_approval' })
      .eq('stripe_session', pi.latest_charge?.toString() ?? '')
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 })
})
