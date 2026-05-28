/**
 * CSV → Supabase price_cache importer
 *
 * Usage:
 *   npx tsx scripts/import-prices.ts
 *   npx tsx scripts/import-prices.ts --csv data/uk-grocery-prices.csv
 *   npx tsx scripts/import-prices.ts --dry-run   (preview without writing)
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// ─── Config ────────────────────────────────────────────────────────────────

const CSV_PATH = process.argv.includes('--csv')
  ? process.argv[process.argv.indexOf('--csv') + 1]
  : 'data/uk-grocery-prices.csv'

const DRY_RUN = process.argv.includes('--dry-run')

const STORE_COLUMNS = ['tesco', 'asda', 'sainsburys', 'morrisons', 'ocado', 'waitrose'] as const
type StoreId = typeof STORE_COLUMNS[number]

// TTL: 26 hours (covers BST/GMT shift; daily job runs at 2am)
const TTL_HOURS = 26

// ─── Env ────────────────────────────────────────────────────────────────────

function loadEnv() {
  try {
    const envFile = readFileSync('.env.local', 'utf8')
    for (const line of envFile.split('\n')) {
      const [key, ...rest] = line.split('=')
      if (key && rest.length) process.env[key.trim()] = rest.join('=').trim()
    }
  } catch {
    // .env.local not found — rely on environment
  }
}

// ─── CSV Parser ─────────────────────────────────────────────────────────────

interface CsvRow {
  product_id: string
  product_name: string
  brand: string
  category: string
  unit_type: string
  unit_size: string
  prices: Record<StoreId, number | null>
}

function parseCSV(filePath: string): CsvRow[] {
  const raw = readFileSync(resolve(filePath), 'utf8')
  const lines = raw.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim())

  const rows: CsvRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const values = line.split(',')
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => { row[h] = (values[idx] ?? '').trim() })

    const prices: Record<string, number | null> = {}
    for (const store of STORE_COLUMNS) {
      const val = parseFloat(row[store])
      prices[store] = isNaN(val) ? null : val
    }

    rows.push({
      product_id: row.product_id,
      product_name: row.product_name,
      brand: row.brand,
      category: row.category,
      unit_type: row.unit_type,
      unit_size: row.unit_size,
      prices: prices as Record<StoreId, number | null>,
    })
  }

  return rows
}

// ─── Upsert ─────────────────────────────────────────────────────────────────

interface PriceCacheRow {
  product_id: string
  store_id: StoreId
  price: number
  available: boolean
  fetched_at: string
  expires_at: string
}

async function importPrices() {
  loadEnv()

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || supabaseUrl.includes('placeholder') || !serviceKey || serviceKey.includes('placeholder')) {
    console.log('\n⚠️  No Supabase credentials found — running in preview mode only\n')
    previewOnly()
    return
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  console.log(`\n📂  Reading ${CSV_PATH}...`)
  const rows = parseCSV(CSV_PATH)
  console.log(`    Found ${rows.length} products × ${STORE_COLUMNS.length} stores = ${rows.length * STORE_COLUMNS.length} price records\n`)

  const now = new Date().toISOString()
  const expiresAt = new Date(Date.now() + TTL_HOURS * 60 * 60 * 1000).toISOString()

  const records: PriceCacheRow[] = []

  for (const row of rows) {
    for (const store of STORE_COLUMNS) {
      const price = row.prices[store]
      if (price === null) continue
      records.push({
        product_id: row.product_id,
        store_id: store,
        price,
        available: true,
        fetched_at: now,
        expires_at: expiresAt,
      })
    }
  }

  if (DRY_RUN) {
    console.log('🔍  DRY RUN — first 5 records that would be upserted:')
    console.table(records.slice(0, 5))
    console.log(`\n    Total records: ${records.length}`)
    return
  }

  // Batch upsert in chunks of 500 to avoid request size limits
  const CHUNK_SIZE = 500
  let inserted = 0

  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    const chunk = records.slice(i, i + CHUNK_SIZE)
    const { error } = await supabase
      .from('price_cache')
      .upsert(chunk, { onConflict: 'product_id,store_id' })

    if (error) {
      console.error(`❌  Error at chunk ${i}–${i + chunk.length}:`, error.message)
      process.exit(1)
    }
    inserted += chunk.length
    process.stdout.write(`    Upserted ${inserted}/${records.length} records...\r`)
  }

  console.log(`\n✅  Done. ${inserted} price records upserted into price_cache.`)
  console.log(`    TTL: prices expire at ${expiresAt}\n`)

  // Also upsert products into products table
  await upsertProducts(supabase, rows)
}

async function upsertProducts(supabase: ReturnType<typeof createClient>, rows: CsvRow[]) {
  console.log('📦  Syncing product catalogue...')

  const products = rows.map(r => ({
    id: r.product_id,
    name: r.product_name,
    brand: r.brand || null,
    category: r.category,
    unit_type: r.unit_type,
    unit_size: r.unit_size,
  }))

  const { error } = await supabase
    .from('products')
    .upsert(products, { onConflict: 'id' })

  if (error) {
    console.warn('⚠️  Could not sync products table (may not exist yet):', error.message)
  } else {
    console.log(`✅  ${products.length} products synced.\n`)
  }
}

// ─── Preview mode (no Supabase) ─────────────────────────────────────────────

function previewOnly() {
  const rows = parseCSV(CSV_PATH)

  console.log(`📂  Loaded ${CSV_PATH}`)
  console.log(`    ${rows.length} products × ${STORE_COLUMNS.length} stores\n`)

  console.log('Sample prices (first 8 products):\n')

  const header = ['Product', 'Brand', ...STORE_COLUMNS.map(s => s.charAt(0).toUpperCase() + s.slice(1))]
  const tableRows = rows.slice(0, 8).map(r => ({
    Product: r.product_name.slice(0, 30),
    Brand: r.brand.slice(0, 12),
    Tesco: r.prices.tesco ? `£${r.prices.tesco.toFixed(2)}` : '—',
    Asda: r.prices.asda ? `£${r.prices.asda.toFixed(2)}` : '—',
    Sainsburys: r.prices.sainsburys ? `£${r.prices.sainsburys.toFixed(2)}` : '—',
    Morrisons: r.prices.morrisons ? `£${r.prices.morrisons.toFixed(2)}` : '—',
    Ocado: r.prices.ocado ? `£${r.prices.ocado.toFixed(2)}` : '—',
    Waitrose: r.prices.waitrose ? `£${r.prices.waitrose.toFixed(2)}` : '—',
  }))

  console.table(tableRows)

  // Price range summary
  console.log('\nPrice range by category:\n')
  const byCategory: Record<string, { min: number; max: number; count: number }> = {}
  for (const row of rows) {
    const prices = Object.values(row.prices).filter(p => p !== null) as number[]
    if (!prices.length) continue
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    if (!byCategory[row.category]) byCategory[row.category] = { min: Infinity, max: 0, count: 0 }
    byCategory[row.category].min = Math.min(byCategory[row.category].min, min)
    byCategory[row.category].max = Math.max(byCategory[row.category].max, max)
    byCategory[row.category].count++
  }

  const summaryRows = Object.entries(byCategory).map(([cat, v]) => ({
    Category: cat,
    Products: v.count,
    'Min price': `£${v.min.toFixed(2)}`,
    'Max price': `£${v.max.toFixed(2)}`,
  }))
  console.table(summaryRows)

  console.log('\nTo import into Supabase, add credentials to .env.local and re-run:')
  console.log('  VITE_SUPABASE_URL=https://xxxx.supabase.co')
  console.log('  SUPABASE_SERVICE_ROLE_KEY=eyJh...\n')
}

// ─── Run ────────────────────────────────────────────────────────────────────

importPrices().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
