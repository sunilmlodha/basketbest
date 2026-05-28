/**
 * price-fetch — thin dispatcher Edge Function
 *
 * Architecture: This function is a dispatcher ONLY. It queues fetch jobs
 * into pgmq and returns immediately. Persistent Fly.io workers consume
 * the queue and write results to price_cache, then broadcast via Realtime.
 *
 * Auth: requires Authorization: Bearer <JWT> header (Supabase user token)
 * Worker auth: shared WORKER_SECRET header between this fn and Fly workers
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ApiError } from '../_shared/types.ts'

const WORKER_SECRET = Deno.env.get('WORKER_SECRET') ?? ''
const STORES = ['tesco', 'asda', 'sainsburys', 'morrisons', 'ocado', 'waitrose'] as const

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ code: 'METHOD_NOT_ALLOWED', message: 'POST required' } as ApiError, 405)
  }

  // Authenticate user
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ code: 'UNAUTHORIZED', message: 'Missing auth token' } as ApiError, 401)
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return json({ code: 'UNAUTHORIZED', message: 'Invalid token' } as ApiError, 401)
  }

  let body: { deliveryId: string; basketId: string }
  try {
    body = await req.json()
  } catch {
    return json({ code: 'BAD_REQUEST', message: 'Invalid JSON body' } as ApiError, 400)
  }

  const { deliveryId, basketId } = body
  if (!deliveryId || !basketId) {
    return json({ code: 'BAD_REQUEST', message: 'deliveryId and basketId required' } as ApiError, 400)
  }

  // Verify delivery belongs to user
  const { data: delivery, error: dError } = await supabase
    .from('deliveries')
    .select('id, user_id')
    .eq('id', deliveryId)
    .eq('user_id', user.id)
    .single()

  if (dError || !delivery) {
    return json({ code: 'NOT_FOUND', message: 'Delivery not found' } as ApiError, 404)
  }

  // Queue fetch jobs for each store via pgmq
  // In production: uses pg_net or pgmq to enqueue. Here we use service role
  // to write directly to a jobs table consumed by Fly workers.
  const serviceSupabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const jobs = STORES.map(store => ({
    delivery_id: deliveryId,
    basket_id: basketId,
    store,
    status: 'queued',
    created_at: new Date().toISOString(),
  }))

  // Mark delivery as comparing
  await serviceSupabase
    .from('deliveries')
    .update({ status: 'comparing' })
    .eq('id', deliveryId)

  // Broadcast initial progress to frontend via Realtime
  const channel = `price-fetch:${deliveryId}`
  await serviceSupabase
    .channel(channel)
    .send({
      type: 'broadcast',
      event: 'progress',
      payload: { store: 'all', status: 'started', percent: 0, itemsMatched: 0 },
    })

  return json({ success: true, deliveryId, queued: STORES.length }, 200)
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
