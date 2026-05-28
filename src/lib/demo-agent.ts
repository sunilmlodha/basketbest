/**
 * Demo-mode shopping agent — no API key required.
 * Parses user intent, manipulates the basket, and returns natural responses.
 * In production this is replaced by the Supabase shopping-agent Edge Function
 * which calls Claude with real tool use.
 */

import { DEMO_PRODUCTS, PRODUCT_PRICES } from './demo-data'
import { searchProducts } from '../store'
import type { Product, Basket } from '../types'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AgentAction {
  type: 'add' | 'remove' | 'clear' | 'navigate'
  product?: Product
  quantity?: number
  itemId?: string
  path?: string
  label: string
}

export interface AgentResponse {
  text: string
  actions: AgentAction[]
}

// ─── Meal kits ──────────────────────────────────────────────────────────────

const MEAL_KITS: Record<string, { title: string; productIds: string[]; note?: string }> = {
  pasta: {
    title: 'pasta dinner',
    productIds: ['p8', 'p7', 'p12', 'p4'],
    note: 'penne, tomatoes, olive oil & cheese',
  },
  bolognese: {
    title: 'spaghetti bolognese',
    productIds: ['p31', 'p28', 'p7', 'p22', 'p34'],
    note: 'spaghetti, beef mince, tinned tomatoes, onions & stock',
  },
  stir_fry: {
    title: 'chicken stir fry',
    productIds: ['p5', 'p23', 'p13', 'p12'],
    note: 'chicken breast, peppers, spinach & olive oil',
  },
  roast: {
    title: 'Sunday roast',
    productIds: ['p27', 'p20', 'p19', 'p6', 'p22'],
    note: 'chicken thighs, potatoes, carrots, broccoli & onions',
  },
  salmon: {
    title: 'salmon dinner',
    productIds: ['p11', 'p13', 'p12', 'p20'],
    note: 'salmon fillets, spinach, olive oil & potatoes',
  },
  breakfast: {
    title: 'healthy breakfast',
    productIds: ['p2', 'p37', 'p10', 'p18'],
    note: 'eggs, oats, yoghurt & bananas',
  },
  burger: {
    title: 'homemade burgers',
    productIds: ['p28', 'p3', 'p4', 'p22'],
    note: 'beef mince, bread rolls, cheese & onions',
  },
  soup: {
    title: 'vegetable soup',
    productIds: ['p19', 'p22', 'p6', 'p34', 'p12'],
    note: 'potatoes, onions, broccoli, stock & olive oil',
  },
}

// ─── Intent detection ────────────────────────────────────────────────────────

function detectIntent(msg: string): string {
  const m = msg.toLowerCase()
  if (/^(hi|hello|hey|morning|afternoon|evening)[\s!.,]?$/.test(m.trim())) return 'greeting'
  if (/what('?s| is) in (my )?basket|show (my )?basket|basket summary|what have i (got|added)/i.test(m)) return 'basket_summary'
  if (/how much|total (cost|price)|basket (cost|price|total)|what('?s| will it) cost/i.test(m)) return 'basket_cost'
  if (/clear (my )?basket|empty (my )?basket|start (fresh|again|over)|remove everything/i.test(m)) return 'clear_basket'
  if (/compare|best price|find (the )?cheapest|which store|check prices/i.test(m)) return 'compare'
  if (/(can you do|what can you|help|how do you work|capabilities|what are you)/i.test(m)) return 'help'
  if (/remove|delete|take out|get rid of/i.test(m)) return 'remove_item'
  if (/suggest|recommend|what should|ideas for|what (can|shall) (i|we) (make|cook|have)/i.test(m)) return 'suggest'
  if (/sunday roast|roast dinner/i.test(m)) return 'meal:roast'
  if (/bolognese|spag bol/i.test(m)) return 'meal:bolognese'
  if (/stir.?fry/i.test(m)) return 'meal:stir_fry'
  if (/pasta/i.test(m) && /dinner|meal|recipe|tonight|cook/i.test(m)) return 'meal:pasta'
  if (/salmon/i.test(m) && /dinner|meal|recipe|tonight|cook/i.test(m)) return 'meal:salmon'
  if (/breakfast/i.test(m) && /healthy|ingredients|set up|sort/i.test(m)) return 'meal:breakfast'
  if (/burger/i.test(m)) return 'meal:burger'
  if (/soup/i.test(m)) return 'meal:soup'
  if (/add|need|get|buy|grab|put in|include/i.test(m)) return 'add_item'
  return 'search'
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPrice(id: string): string {
  const p = PRODUCT_PRICES[id]
  return p ? `£${p.toFixed(2)}` : ''
}

function basketTotal(basket: Basket | null): number {
  if (!basket) return 0
  return basket.items.reduce((sum, item) => {
    const price = PRODUCT_PRICES[item.product.id] ?? 0
    return sum + price * item.quantity
  }, 0)
}

function findProductInMessage(msg: string): Product | undefined {
  const lower = msg.toLowerCase()
  // Try exact search first, then broader
  const results = searchProducts(lower)
  if (results.length) return results[0]
  // Try individual words
  const words = lower.split(/\s+/).filter(w => w.length > 3)
  for (const word of words) {
    const r = searchProducts(word)
    if (r.length) return r[0]
  }
  return undefined
}

function findBasketItemByName(basket: Basket | null, msg: string): string | undefined {
  if (!basket) return undefined
  const lower = msg.toLowerCase()
  const item = basket.items.find(i =>
    lower.includes(i.product.name.toLowerCase().split(' ')[0].toLowerCase())
  )
  return item?.id
}

// ─── Intent handlers ─────────────────────────────────────────────────────────

function handleGreeting(userName: string): AgentResponse {
  const greetings = [
    `Hi ${userName}! 👋 What can I help you with today? I can add items to your basket, plan meals, check prices, or compare stores.`,
    `Hello ${userName}! Ready to sort your shopping? Tell me what you need — I can plan a meal, add items, or find the best prices.`,
    `Hey ${userName}! 🛒 I'm your BasketBest AI assistant. Ask me to add groceries, plan a meal, or compare prices across 6 stores.`,
  ]
  return { text: greetings[Math.floor(Math.random() * greetings.length)], actions: [] }
}

function handleHelp(): AgentResponse {
  return {
    text: `Here's what I can do for you:\n\n**🛒 Basket management**\n• "Add milk and eggs" — I'll find and add them\n• "Remove the chicken" — I'll take it out\n• "Clear my basket" — fresh start\n\n**🍽️ Meal planning**\n• "Add ingredients for a Sunday roast"\n• "I want to make pasta bolognese"\n• "Suggest something for dinner"\n\n**💰 Price intelligence**\n• "How much is my basket?"\n• "Compare prices across stores"\n• "What's cheapest this week?"\n\nJust ask naturally — I'll figure out what you need!`,
    actions: [],
  }
}

function handleBasketSummary(basket: Basket | null): AgentResponse {
  if (!basket || basket.items.length === 0) {
    return {
      text: `Your basket is empty 🛒 Want me to add something? Try asking for a meal kit like *"Add ingredients for pasta bolognese"* or just *"Add milk and eggs"*.`,
      actions: [],
    }
  }
  const lines = basket.items.map(item => {
    const price = PRODUCT_PRICES[item.product.id]
    const lineTotal = price ? `£${(price * item.quantity).toFixed(2)}` : ''
    const qty = item.quantity > 1 ? `×${item.quantity}` : ''
    return `• ${item.product.name} ${qty} ${lineTotal}`.trim()
  })
  const total = basketTotal(basket)
  return {
    text: `Here's your current basket (${basket.items.length} items):\n\n${lines.join('\n')}\n\n**Estimated total: £${total.toFixed(2)}** at an average-price store.\n\nShall I compare prices to find the cheapest store?`,
    actions: [],
  }
}

function handleBasketCost(basket: Basket | null): AgentResponse {
  if (!basket || basket.items.length === 0) {
    return { text: `Your basket is empty — add some items first and I'll give you a price estimate!`, actions: [] }
  }
  const total = basketTotal(basket)
  return {
    text: `Your basket of ${basket.items.length} items comes to approximately **£${total.toFixed(2)}** at mid-range prices.\n\nWant me to run a full comparison? I'll check all 6 stores and find you the cheapest option — you could save up to £8–12 depending on the week.`,
    actions: [{ type: 'navigate', path: '/delivery/schedule', label: 'Start price comparison' }],
  }
}

function handleCompare(): AgentResponse {
  return {
    text: `Let's find the best price! I'll take you to the scheduling page where you can pick a delivery date and time, then I'll compare all 6 stores — Tesco, Asda, Sainsbury's, Morrisons, Ocado, and Waitrose — and show you the cheapest option. 🔍`,
    actions: [{ type: 'navigate', path: '/delivery/schedule', label: 'Schedule & compare' }],
  }
}

function handleClearBasket(): AgentResponse {
  return {
    text: `Done — your basket has been cleared. Fresh start! 🗑️\n\nWhat would you like to add? I can build a meal kit for you or you can just tell me what you need.`,
    actions: [{ type: 'clear', label: 'Cleared basket' }],
  }
}

function handleAddItem(msg: string, basket: Basket | null): AgentResponse {
  // Try to find multiple products in one message
  const words = msg.toLowerCase()
  const found: Product[] = []
  const notFound: string[] = []

  // Check for common items in the message
  const searchTerms = words
    .replace(/add|need|get|buy|grab|put in|include|some|a few|couple of/gi, '')
    .split(/,|and|&/)
    .map(s => s.trim())
    .filter(s => s.length > 2)

  for (const term of searchTerms) {
    const results = searchProducts(term)
    if (results.length && !found.find(f => f.id === results[0].id)) {
      found.push(results[0])
    } else if (!results.length) {
      notFound.push(term)
    }
  }

  if (found.length === 0) {
    const product = findProductInMessage(msg)
    if (product) found.push(product)
  }

  if (found.length === 0) {
    return {
      text: `I couldn't find that in the catalogue. Try being more specific, e.g. *"Add whole milk 6 pints"* or browse the basket page to search manually.`,
      actions: [],
    }
  }

  const actions: AgentAction[] = found.map(p => ({
    type: 'add' as const,
    product: p,
    quantity: 1,
    label: p.name,
  }))

  const addedList = found.map(p => `• **${p.name}** ${formatPrice(p.id)}`).join('\n')
  const notFoundText = notFound.length ? `\n\nI couldn't find: ${notFound.join(', ')} — try searching from the basket page.` : ''

  const total = basketTotal(basket) + found.reduce((s, p) => s + (PRODUCT_PRICES[p.id] ?? 0), 0)

  return {
    text: `Added to your basket:\n\n${addedList}${notFoundText}\n\nBasket total now approx **£${total.toFixed(2)}**.`,
    actions,
  }
}

function handleRemoveItem(msg: string, basket: Basket | null): AgentResponse {
  const itemId = findBasketItemByName(basket, msg)
  if (!itemId) {
    return {
      text: `I couldn't find that item in your basket. Your basket has: ${basket?.items.map(i => i.product.name).join(', ') || 'nothing'}.`,
      actions: [],
    }
  }
  const item = basket?.items.find(i => i.id === itemId)
  return {
    text: `Removed **${item?.product.name}** from your basket. ✓`,
    actions: [{ type: 'remove', itemId, label: `Removed ${item?.product.name}` }],
  }
}

function handleMeal(kitKey: string, basket: Basket | null): AgentResponse {
  const kit = MEAL_KITS[kitKey]
  if (!kit) return { text: `I don't have a kit for that yet — try asking for pasta, bolognese, stir fry, or a Sunday roast!`, actions: [] }

  const products = kit.productIds
    .map(id => DEMO_PRODUCTS.find(p => p.id === id))
    .filter(Boolean) as Product[]

  const kitCost = products.reduce((s, p) => s + (PRODUCT_PRICES[p.id] ?? 0), 0)
  const newTotal = basketTotal(basket) + kitCost

  const actions: AgentAction[] = products.map(p => ({
    type: 'add' as const,
    product: p,
    quantity: 1,
    label: p.name,
  }))

  const itemList = products.map(p => `• ${p.name} ${formatPrice(p.id)}`).join('\n')

  return {
    text: `Great choice! I've added ${products.length} ingredients for ${kit.title} (${kit.note}):\n\n${itemList}\n\n**Kit total: £${kitCost.toFixed(2)}** · Basket now approx **£${newTotal.toFixed(2)}**\n\nWant me to compare prices to find the cheapest store for this?`,
    actions,
  }
}

function handleSuggest(basket: Basket | null): AgentResponse {
  const hasChicken = basket?.items.some(i => i.product.id === 'p5' || i.product.id === 'p27')
  const hasSalmon = basket?.items.some(i => i.product.id === 'p11')
  const hasPasta = basket?.items.some(i => i.product.id === 'p8' || i.product.id === 'p31')

  const suggestions = []
  if (!hasChicken && !hasSalmon) suggestions.push('🍗 **Chicken stir fry** — quick, healthy, ~£6')
  if (!hasPasta) suggestions.push('🍝 **Pasta bolognese** — family favourite, ~£5.50')
  if (!hasSalmon) suggestions.push('🐟 **Salmon with spinach** — ready in 20 min, ~£6.50')
  suggestions.push('🥣 **Healthy breakfast set** — eggs, oats, yoghurt & bananas, ~£7')
  suggestions.push('🍲 **Vegetable soup** — budget-friendly, ~£4')

  return {
    text: `Here are some meal ideas based on your basket:\n\n${suggestions.slice(0, 4).join('\n')}\n\nJust say *"add ingredients for [meal]"* and I'll sort it out!`,
    actions: [],
  }
}

function handleSearch(msg: string, basket: Basket | null): AgentResponse {
  const results = searchProducts(msg)
  if (results.length === 0) {
    return {
      text: `I couldn't find anything matching "${msg}". Try different words, or browse the catalogue on the Basket page where you can search and filter by category.`,
      actions: [],
    }
  }
  if (results.length === 1) {
    return handleAddItem(msg, basket)
  }

  const list = results.slice(0, 4).map(p => `• **${p.name}** ${p.brand ? `(${p.brand}) ` : ''}${formatPrice(p.id)}`).join('\n')
  return {
    text: `I found ${results.length} matching products:\n\n${list}\n\nShall I add the first one, or a specific one?`,
    actions: [],
  }
}

// ─── Main entry point ────────────────────────────────────────────────────────

export function runDemoAgent(
  message: string,
  basket: Basket | null,
  userName: string = 'there'
): AgentResponse {
  const intent = detectIntent(message)

  if (intent === 'greeting') return handleGreeting(userName)
  if (intent === 'help') return handleHelp()
  if (intent === 'basket_summary') return handleBasketSummary(basket)
  if (intent === 'basket_cost') return handleBasketCost(basket)
  if (intent === 'compare') return handleCompare()
  if (intent === 'clear_basket') return handleClearBasket()
  if (intent === 'remove_item') return handleRemoveItem(message, basket)
  if (intent === 'suggest') return handleSuggest(basket)
  if (intent.startsWith('meal:')) return handleMeal(intent.replace('meal:', ''), basket)
  if (intent === 'add_item') return handleAddItem(message, basket)
  return handleSearch(message, basket)
}
