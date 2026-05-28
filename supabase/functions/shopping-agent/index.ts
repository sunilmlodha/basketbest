/**
 * shopping-agent — Supabase Edge Function
 *
 * Receives: { message, basket, userId }
 * Returns:  { text, basketActions }
 *
 * Uses the Anthropic Messages API with tool use.
 * Claude reasons about the basket and calls tools to:
 *   - search_products        → find products by name/category
 *   - add_product            → add item to basket (returned as action)
 *   - remove_product         → remove item from basket (returned as action)
 *   - get_basket_summary     → read current basket state
 *   - clear_basket           → empty basket (returned as action)
 *   - navigate               → deep-link to a page in the app
 *
 * Basket mutations are NOT applied server-side — they are returned as
 * `basketActions` for the React frontend to execute against Zustand.
 */

import Anthropic from 'npm:@anthropic-ai/sdk@0.26.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ─── Types (mirrored from frontend) ──────────────────────────────────────────

interface Product {
  id: string
  name: string
  brand?: string
  category: string
  unitType: string
}

interface BasketItem {
  id: string
  basketId: string
  product: Product
  quantity: number
  unit: string
}

interface Basket {
  id: string
  items: BasketItem[]
}

interface BasketAction {
  type: 'add' | 'remove' | 'clear' | 'navigate'
  product?: Product
  quantity?: number
  itemId?: string
  path?: string
  label: string
}

// ─── Embedded product catalogue (edge-function copy) ─────────────────────────

const PRODUCTS: Product[] = [
  { id: 'p1',  name: 'Whole Milk 6 Pints',           brand: 'Own Label',     category: 'dairy',      unitType: 'each' },
  { id: 'p2',  name: 'Free Range Eggs 12 Pack',       brand: 'Own Label',     category: 'fresh',      unitType: 'pack' },
  { id: 'p3',  name: 'Sliced White Bread 800g',       brand: 'Own Label',     category: 'bakery',     unitType: 'each' },
  { id: 'p4',  name: 'Cheddar Cheese 400g',           brand: 'Own Label',     category: 'dairy',      unitType: 'each' },
  { id: 'p5',  name: 'Chicken Breast Fillets 500g',   brand: 'Own Label',     category: 'meat-fish',  unitType: 'each' },
  { id: 'p6',  name: 'Broccoli',                      brand: undefined,       category: 'fresh',      unitType: 'each' },
  { id: 'p7',  name: 'Tinned Tomatoes 400g',          brand: 'Napolina',      category: 'pantry',     unitType: 'each' },
  { id: 'p8',  name: 'Pasta Penne 500g',              brand: 'Barilla',       category: 'pantry',     unitType: 'each' },
  { id: 'p9',  name: 'Orange Juice 1L',               brand: 'Tropicana',     category: 'drinks',     unitType: 'L'    },
  { id: 'p10', name: 'Greek Yoghurt 500g',            brand: 'Fage',          category: 'dairy',      unitType: 'each' },
  { id: 'p11', name: 'Salmon Fillets 2 Pack',         brand: 'Own Label',     category: 'meat-fish',  unitType: 'pack' },
  { id: 'p12', name: 'Olive Oil Extra Virgin 500ml',  brand: 'Filippo Berio', category: 'pantry',     unitType: 'ml'   },
  { id: 'p13', name: 'Baby Spinach 200g',             brand: 'Own Label',     category: 'fresh',      unitType: 'each' },
  { id: 'p14', name: 'Toilet Roll 9 Pack',            brand: 'Andrex',        category: 'household',  unitType: 'pack' },
  { id: 'p15', name: 'Washing Up Liquid 500ml',       brand: 'Fairy',         category: 'household',  unitType: 'ml'   },
  { id: 'p16', name: 'Butter Unsalted 250g',          brand: 'Own Label',     category: 'dairy',      unitType: 'each' },
  { id: 'p17', name: 'Semi-Skimmed Milk 6 Pints',    brand: 'Own Label',     category: 'dairy',      unitType: 'each' },
  { id: 'p18', name: 'Bananas 5 Pack',                brand: 'Own Label',     category: 'fresh',      unitType: 'pack' },
  { id: 'p19', name: 'Carrots 1kg',                   brand: 'Own Label',     category: 'fresh',      unitType: 'each' },
  { id: 'p20', name: 'Maris Piper Potatoes 2.5kg',   brand: 'Own Label',     category: 'fresh',      unitType: 'each' },
  { id: 'p21', name: 'Cherry Tomatoes 400g',          brand: 'Own Label',     category: 'fresh',      unitType: 'each' },
  { id: 'p22', name: 'Onions 1kg',                    brand: 'Own Label',     category: 'fresh',      unitType: 'each' },
  { id: 'p23', name: 'Mixed Peppers 3 Pack',          brand: 'Own Label',     category: 'fresh',      unitType: 'pack' },
  { id: 'p24', name: 'Mushrooms 400g',                brand: 'Own Label',     category: 'fresh',      unitType: 'each' },
  { id: 'p25', name: 'Wholemeal Bread 800g',          brand: 'Hovis',         category: 'bakery',     unitType: 'each' },
  { id: 'p26', name: 'Bagels 5 Pack',                 brand: 'Own Label',     category: 'bakery',     unitType: 'pack' },
  { id: 'p27', name: 'Chicken Thighs Boneless 800g',  brand: 'Own Label',     category: 'meat-fish',  unitType: 'each' },
  { id: 'p28', name: 'British Beef Mince 500g',       brand: 'Own Label',     category: 'meat-fish',  unitType: 'each' },
  { id: 'p29', name: 'Pork Sausages 8 Pack',          brand: 'Own Label',     category: 'meat-fish',  unitType: 'pack' },
  { id: 'p30', name: 'Back Bacon Smoked 200g',        brand: 'Own Label',     category: 'meat-fish',  unitType: 'each' },
  { id: 'p31', name: 'Spaghetti 500g',                brand: 'Own Label',     category: 'pantry',     unitType: 'each' },
  { id: 'p32', name: 'Basmati Rice 1kg',              brand: 'Tilda',         category: 'pantry',     unitType: 'each' },
  { id: 'p33', name: 'Baked Beans 415g',              brand: 'Heinz',         category: 'pantry',     unitType: 'each' },
  { id: 'p34', name: 'Chicken Stock Cubes 10 Pack',   brand: 'Knorr',         category: 'pantry',     unitType: 'pack' },
  { id: 'p35', name: 'Plain Flour 1.5kg',             brand: 'Own Label',     category: 'pantry',     unitType: 'each' },
  { id: 'p36', name: 'Caster Sugar 1kg',              brand: 'Own Label',     category: 'pantry',     unitType: 'each' },
  { id: 'p37', name: 'Porridge Oats 1kg',             brand: 'Own Label',     category: 'breakfast',  unitType: 'each' },
  { id: 'p38', name: 'Cornflakes 500g',               brand: 'Kelloggs',      category: 'breakfast',  unitType: 'each' },
  { id: 'p39', name: 'Instant Coffee 100g',           brand: 'Nescafe',       category: 'drinks',     unitType: 'each' },
  { id: 'p40', name: 'Tea Bags 80 Pack',              brand: 'PG Tips',       category: 'drinks',     unitType: 'pack' },
  { id: 'p41', name: 'Frozen Peas 900g',              brand: 'Own Label',     category: 'frozen',     unitType: 'each' },
  { id: 'p42', name: 'Frozen Chips 1.5kg',            brand: 'McCain',        category: 'frozen',     unitType: 'each' },
  { id: 'p43', name: 'Kitchen Roll 2 Pack',           brand: 'Own Label',     category: 'household',  unitType: 'pack' },
]

const PRODUCT_PRICES: Record<string, number> = {
  p1: 1.89, p2: 2.99, p3: 1.10, p4: 2.75, p5: 3.50, p6: 0.69, p7: 0.89,
  p8: 1.45, p9: 2.25, p10: 2.99, p11: 4.50, p12: 4.50, p13: 1.25, p14: 4.50,
  p15: 1.99, p16: 1.75, p17: 1.89, p18: 0.68, p19: 0.55, p20: 1.85, p21: 1.25,
  p22: 0.79, p23: 1.45, p24: 0.89, p25: 1.45, p26: 1.25, p27: 3.10, p28: 2.89,
  p29: 2.25, p30: 2.50, p31: 0.65, p32: 2.99, p33: 0.99, p34: 1.35, p35: 1.09,
  p36: 0.99, p37: 1.15, p38: 2.49, p39: 3.50, p40: 2.50, p41: 1.25, p42: 2.99, p43: 1.45,
}

// ─── Tool implementations ─────────────────────────────────────────────────────

function searchProducts(query: string, limit = 5): Product[] {
  if (!query.trim()) return PRODUCTS.slice(0, limit)
  const q = query.toLowerCase()
  return PRODUCTS
    .filter((p) =>
      p.name.toLowerCase().includes(q) ||
      (p.brand ?? '').toLowerCase().includes(q) ||
      p.category.includes(q)
    )
    .slice(0, limit)
}

function getBasketSummary(basket: Basket | null): object {
  if (!basket || basket.items.length === 0) {
    return { isEmpty: true, itemCount: 0, items: [], estimatedTotal: '£0.00' }
  }
  const total = basket.items.reduce((sum, item) => {
    return sum + (PRODUCT_PRICES[item.product.id] ?? 0) * item.quantity
  }, 0)
  return {
    isEmpty: false,
    itemCount: basket.items.length,
    items: basket.items.map((i) => ({
      id: i.id,
      name: i.product.name,
      quantity: i.quantity,
      unitPrice: PRODUCT_PRICES[i.product.id] ? `£${PRODUCT_PRICES[i.product.id].toFixed(2)}` : 'unknown',
    })),
    estimatedTotal: `£${total.toFixed(2)}`,
  }
}

// ─── Tool definitions for Claude ─────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'search_products',
    description: 'Search the product catalogue by name, brand, or category. Returns matching products with IDs and prices.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search term (e.g. "milk", "chicken breast", "pasta")' },
        limit: { type: 'number', description: 'Maximum results to return (default 5)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'add_product',
    description: 'Add a product to the shopping basket. Must call search_products first to get the product ID.',
    input_schema: {
      type: 'object',
      properties: {
        productId: { type: 'string', description: 'Product ID from search_products results' },
        productName: { type: 'string', description: 'Human-readable product name for confirmation' },
        quantity: { type: 'number', description: 'Number of units to add (default 1)' },
      },
      required: ['productId', 'productName'],
    },
  },
  {
    name: 'remove_product',
    description: 'Remove an item from the shopping basket using its basket item ID.',
    input_schema: {
      type: 'object',
      properties: {
        itemId: { type: 'string', description: 'Basket item ID from get_basket_summary' },
        itemName: { type: 'string', description: 'Product name for confirmation message' },
      },
      required: ['itemId', 'itemName'],
    },
  },
  {
    name: 'get_basket_summary',
    description: 'Get the current contents of the shopping basket including all items, quantities, and estimated total.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'clear_basket',
    description: 'Remove all items from the shopping basket.',
    input_schema: {
      type: 'object',
      properties: {
        confirmed: { type: 'boolean', description: 'Must be true to confirm clearing' },
      },
      required: ['confirmed'],
    },
  },
  {
    name: 'navigate',
    description: 'Navigate the app to a specific page.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          enum: ['/basket', '/dashboard', '/delivery/schedule', '/orders', '/profile'],
          description: 'App route to navigate to',
        },
        reason: { type: 'string', description: 'Brief reason for navigating' },
      },
      required: ['path', 'reason'],
    },
  },
]

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are BasketBest AI, a friendly UK grocery shopping assistant built into the BasketBest app.

Your job is to help users manage their shopping basket, plan meals, find products, and compare grocery prices across Tesco, Asda, Sainsbury's, Morrisons, Ocado and Waitrose.

Guidelines:
- Be concise and helpful — users are on mobile so keep responses short
- Use British English (basket not cart, crisps not chips, courgette not zucchini)
- Show prices in £ format with 2 decimal places
- When adding multiple items for a meal, do it in one go (call add_product multiple times in your tool use)
- Always call get_basket_summary before answering questions about basket contents
- When a user asks to "add ingredients for X meal", search for and add all the key ingredients
- For price comparisons, navigate to /delivery/schedule to start the comparison flow
- Be proactive: after adding items, mention the new basket total
- Never make up product IDs — always search first

Respond naturally and conversationally. Use markdown sparingly (bold for product names and totals only).`

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, basket, userId } = await req.json()

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const anthropic = new Anthropic({ apiKey })

    // Inject basket context into the user message
    const contextualMessage = basket?.items?.length > 0
      ? `[Context: user has ${basket.items.length} items in their basket]\n\n${message}`
      : `[Context: user's basket is empty]\n\n${message}`

    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: contextualMessage },
    ]

    // ── Agentic tool-use loop ────────────────────────────────────────────────
    const basketActions: BasketAction[] = []
    let finalText = ''
    let iterations = 0
    const MAX_ITERATIONS = 10

    while (iterations < MAX_ITERATIONS) {
      iterations++

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages,
      })

      // Collect any text content
      const textBlocks = response.content.filter((b): b is Anthropic.TextBlock => b.type === 'text')
      if (textBlocks.length > 0) {
        finalText = textBlocks.map((b) => b.text).join('\n')
      }

      // If stop_reason is end_turn or no tools, we're done
      if (response.stop_reason === 'end_turn') break

      // Process tool calls
      const toolUses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
      if (toolUses.length === 0) break

      // Add assistant message with tool calls to conversation
      messages.push({ role: 'assistant', content: response.content })

      // Process each tool call and build results
      const toolResults: Anthropic.ToolResultBlockParam[] = []

      for (const toolUse of toolUses) {
        let result: unknown

        switch (toolUse.name) {
          case 'search_products': {
            const { query, limit } = toolUse.input as { query: string; limit?: number }
            const products = searchProducts(query, limit ?? 5)
            result = {
              products: products.map((p) => ({
                id: p.id,
                name: p.name,
                brand: p.brand,
                category: p.category,
                price: PRODUCT_PRICES[p.id] ? `£${PRODUCT_PRICES[p.id].toFixed(2)}` : 'price unknown',
              })),
              count: products.length,
            }
            break
          }

          case 'add_product': {
            const { productId, productName, quantity = 1 } = toolUse.input as {
              productId: string
              productName: string
              quantity?: number
            }
            const product = PRODUCTS.find((p) => p.id === productId)
            if (product) {
              basketActions.push({ type: 'add', product, quantity, label: productName })
              const price = PRODUCT_PRICES[productId]
              result = {
                success: true,
                added: productName,
                quantity,
                unitPrice: price ? `£${price.toFixed(2)}` : 'unknown',
                lineTotal: price ? `£${(price * quantity).toFixed(2)}` : 'unknown',
              }
            } else {
              result = { success: false, error: `Product ${productId} not found` }
            }
            break
          }

          case 'remove_product': {
            const { itemId, itemName } = toolUse.input as { itemId: string; itemName: string }
            basketActions.push({ type: 'remove', itemId, label: itemName })
            result = { success: true, removed: itemName }
            break
          }

          case 'get_basket_summary': {
            result = getBasketSummary(basket)
            break
          }

          case 'clear_basket': {
            const { confirmed } = toolUse.input as { confirmed: boolean }
            if (confirmed) {
              basketActions.push({ type: 'clear', label: 'Cleared basket' })
              result = { success: true, message: 'Basket cleared' }
            } else {
              result = { success: false, message: 'Not confirmed' }
            }
            break
          }

          case 'navigate': {
            const { path, reason } = toolUse.input as { path: string; reason: string }
            basketActions.push({ type: 'navigate', path, label: reason })
            result = { success: true, navigating: path }
            break
          }

          default:
            result = { error: `Unknown tool: ${toolUse.name}` }
        }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        })
      }

      // Add tool results and continue loop
      messages.push({ role: 'user', content: toolResults })
    }

    if (!finalText) {
      finalText = "I've updated your basket. Is there anything else I can help with?"
    }

    return new Response(
      JSON.stringify({ text: finalText, basketActions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('shopping-agent error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal error', details: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
