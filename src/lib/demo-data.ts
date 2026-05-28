import type { Product, Basket, ComparisonResult, StoreRecommendation } from '../types'

export const DEMO_PRODUCTS: Product[] = [
  // Dairy
  { id: 'p1',  name: 'Whole Milk 6 Pints',          brand: 'Own Label',     category: 'dairy',      unitType: 'each'  },
  { id: 'p4',  name: 'Cheddar Cheese 400g',          brand: 'Own Label',     category: 'dairy',      unitType: 'each'  },
  { id: 'p10', name: 'Greek Yoghurt 500g',           brand: 'Fage',          category: 'dairy',      unitType: 'each'  },
  { id: 'p16', name: 'Butter Unsalted 250g',         brand: 'Own Label',     category: 'dairy',      unitType: 'each'  },
  { id: 'p17', name: 'Semi-Skimmed Milk 6 Pints',   brand: 'Own Label',     category: 'dairy',      unitType: 'each'  },
  // Eggs & Fresh
  { id: 'p2',  name: 'Free Range Eggs 12 Pack',      brand: 'Own Label',     category: 'fresh',      unitType: 'pack'  },
  { id: 'p6',  name: 'Broccoli',                     brand: undefined,       category: 'fresh',      unitType: 'each'  },
  { id: 'p13', name: 'Baby Spinach 200g',            brand: 'Own Label',     category: 'fresh',      unitType: 'each'  },
  { id: 'p18', name: 'Bananas 5 Pack',               brand: 'Own Label',     category: 'fresh',      unitType: 'pack'  },
  { id: 'p19', name: 'Carrots 1kg',                  brand: 'Own Label',     category: 'fresh',      unitType: 'each'  },
  { id: 'p20', name: 'Maris Piper Potatoes 2.5kg',  brand: 'Own Label',     category: 'fresh',      unitType: 'each'  },
  { id: 'p21', name: 'Cherry Tomatoes 400g',         brand: 'Own Label',     category: 'fresh',      unitType: 'each'  },
  { id: 'p22', name: 'Onions 1kg',                   brand: 'Own Label',     category: 'fresh',      unitType: 'each'  },
  { id: 'p23', name: 'Mixed Peppers 3 Pack',         brand: 'Own Label',     category: 'fresh',      unitType: 'pack'  },
  { id: 'p24', name: 'Mushrooms 400g',               brand: 'Own Label',     category: 'fresh',      unitType: 'each'  },
  // Bakery
  { id: 'p3',  name: 'Sliced White Bread 800g',      brand: 'Own Label',     category: 'bakery',     unitType: 'each'  },
  { id: 'p25', name: 'Wholemeal Bread 800g',         brand: 'Hovis',         category: 'bakery',     unitType: 'each'  },
  { id: 'p26', name: 'Bagels 5 Pack',                brand: 'Own Label',     category: 'bakery',     unitType: 'pack'  },
  // Meat & Fish
  { id: 'p5',  name: 'Chicken Breast Fillets 500g', brand: 'Own Label',     category: 'meat-fish',  unitType: 'each'  },
  { id: 'p11', name: 'Salmon Fillets 2 Pack',        brand: 'Own Label',     category: 'meat-fish',  unitType: 'pack'  },
  { id: 'p27', name: 'Chicken Thighs Boneless 800g', brand: 'Own Label',     category: 'meat-fish',  unitType: 'each'  },
  { id: 'p28', name: 'British Beef Mince 500g',      brand: 'Own Label',     category: 'meat-fish',  unitType: 'each'  },
  { id: 'p29', name: 'Pork Sausages 8 Pack',         brand: 'Own Label',     category: 'meat-fish',  unitType: 'pack'  },
  { id: 'p30', name: 'Back Bacon Smoked 200g',       brand: 'Own Label',     category: 'meat-fish',  unitType: 'each'  },
  // Pantry
  { id: 'p7',  name: 'Tinned Tomatoes 400g',         brand: 'Napolina',      category: 'pantry',     unitType: 'each'  },
  { id: 'p8',  name: 'Pasta Penne 500g',             brand: 'Barilla',       category: 'pantry',     unitType: 'each'  },
  { id: 'p12', name: 'Olive Oil Extra Virgin 500ml', brand: 'Filippo Berio', category: 'pantry',     unitType: 'ml'    },
  { id: 'p31', name: 'Spaghetti 500g',               brand: 'Own Label',     category: 'pantry',     unitType: 'each'  },
  { id: 'p32', name: 'Basmati Rice 1kg',             brand: 'Tilda',         category: 'pantry',     unitType: 'each'  },
  { id: 'p33', name: 'Baked Beans 415g',             brand: 'Heinz',         category: 'pantry',     unitType: 'each'  },
  { id: 'p34', name: 'Chicken Stock Cubes 10 Pack',  brand: 'Knorr',         category: 'pantry',     unitType: 'pack'  },
  { id: 'p35', name: 'Plain Flour 1.5kg',            brand: 'Own Label',     category: 'pantry',     unitType: 'each'  },
  { id: 'p36', name: 'Caster Sugar 1kg',             brand: 'Own Label',     category: 'pantry',     unitType: 'each'  },
  // Breakfast
  { id: 'p37', name: 'Porridge Oats 1kg',            brand: 'Own Label',     category: 'breakfast',  unitType: 'each'  },
  { id: 'p38', name: 'Cornflakes 500g',              brand: 'Kelloggs',      category: 'breakfast',  unitType: 'each'  },
  // Drinks
  { id: 'p9',  name: 'Orange Juice 1L',              brand: 'Tropicana',     category: 'drinks',     unitType: 'L'     },
  { id: 'p39', name: 'Instant Coffee 100g',          brand: 'Nescafe',       category: 'drinks',     unitType: 'each'  },
  { id: 'p40', name: 'Tea Bags 80 Pack',             brand: 'PG Tips',       category: 'drinks',     unitType: 'pack'  },
  // Frozen
  { id: 'p41', name: 'Frozen Peas 900g',             brand: 'Own Label',     category: 'frozen',     unitType: 'each'  },
  { id: 'p42', name: 'Frozen Chips 1.5kg',           brand: 'McCain',        category: 'frozen',     unitType: 'each'  },
  // Household
  { id: 'p14', name: 'Toilet Roll 9 Pack',           brand: 'Andrex',        category: 'household',  unitType: 'pack'  },
  { id: 'p15', name: 'Washing Up Liquid 500ml',      brand: 'Fairy',         category: 'household',  unitType: 'ml'    },
  { id: 'p43', name: 'Kitchen Roll 2 Pack',          brand: 'Own Label',     category: 'household',  unitType: 'pack'  },
]

// Approximate prices per product (used by agent for cost estimates)
export const PRODUCT_PRICES: Record<string, number> = {
  p1: 1.89, p2: 2.99, p3: 1.10, p4: 2.75, p5: 3.50, p6: 0.69, p7: 0.89,
  p8: 1.45, p9: 2.25, p10: 2.99, p11: 4.50, p12: 4.50, p13: 1.25, p14: 4.50,
  p15: 1.99, p16: 1.75, p17: 1.89, p18: 0.68, p19: 0.55, p20: 1.85, p21: 1.25,
  p22: 0.79, p23: 1.45, p24: 0.89, p25: 1.45, p26: 1.25, p27: 3.10, p28: 2.89,
  p29: 2.25, p30: 2.50, p31: 0.65, p32: 2.99, p33: 0.99, p34: 1.35, p35: 1.09,
  p36: 0.99, p37: 1.15, p38: 2.49, p39: 3.50, p40: 2.50, p41: 1.25, p42: 2.99, p43: 1.45,
}

export const DEMO_BASKET: Basket = {
  id: 'demo-basket-1',
  userId: 'demo-user',
  name: 'Weekly Shop',
  status: 'draft',
  items: [
    { id: 'bi1',  basketId: 'demo-basket-1', product: DEMO_PRODUCTS[0],  quantity: 1, unit: 'each' },
    { id: 'bi2',  basketId: 'demo-basket-1', product: DEMO_PRODUCTS[1],  quantity: 1, unit: 'pack' },
    { id: 'bi3',  basketId: 'demo-basket-1', product: DEMO_PRODUCTS[2],  quantity: 2, unit: 'each' },
    { id: 'bi4',  basketId: 'demo-basket-1', product: DEMO_PRODUCTS[4],  quantity: 1, unit: 'each' },
    { id: 'bi5',  basketId: 'demo-basket-1', product: DEMO_PRODUCTS[6],  quantity: 3, unit: 'each' },
    { id: 'bi6',  basketId: 'demo-basket-1', product: DEMO_PRODUCTS[7],  quantity: 1, unit: 'each' },
    { id: 'bi7',  basketId: 'demo-basket-1', product: DEMO_PRODUCTS[9],  quantity: 1, unit: 'each' },
    { id: 'bi8',  basketId: 'demo-basket-1', product: DEMO_PRODUCTS[13], quantity: 1, unit: 'pack' },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

export const DEMO_RECOMMENDATIONS: StoreRecommendation[] = [
  {
    rank: 1,
    store: 'asda',
    totalPrice: 28.45,
    totalAfterLoyalty: 28.17,
    loyaltySaving: 0.28,
    savingsVsMax: 11.32,
    itemsCovered: 8,
    totalItems: 8,
    unavailableItems: [],
    substitutions: 0,
    deliveryFee: 3.99,
    deliveryEta: '09:00 - 11:00',
  },
  {
    rank: 2,
    store: 'tesco',
    totalPrice: 31.20,
    totalAfterLoyalty: 30.89,
    loyaltySaving: 0.31,
    savingsVsMax: 8.57,
    itemsCovered: 8,
    totalItems: 8,
    unavailableItems: [],
    substitutions: 1,
    deliveryFee: 3.99,
    deliveryEta: '09:00 - 11:00',
  },
  {
    rank: 3,
    store: 'morrisons',
    totalPrice: 33.10,
    totalAfterLoyalty: 32.77,
    loyaltySaving: 0.33,
    savingsVsMax: 6.67,
    itemsCovered: 7,
    totalItems: 8,
    unavailableItems: ['Greek Yoghurt 500g'],
    substitutions: 0,
    deliveryFee: 3.99,
    deliveryEta: '10:00 - 12:00',
  },
]

export const DEMO_COMPARISON: ComparisonResult = {
  id: 'demo-comparison-1',
  deliveryId: 'demo-delivery-1',
  storeResults: [
    { store: 'tesco',      status: 'done',    percent: 100, itemsMatched: 8, totalItems: 8, totalPrice: 31.20, totalAfterLoyalty: 30.89, loyaltySaving: 0.31, fetchedAt: new Date().toISOString() },
    { store: 'asda',       status: 'done',    percent: 100, itemsMatched: 8, totalItems: 8, totalPrice: 28.45, totalAfterLoyalty: 28.17, loyaltySaving: 0.28, fetchedAt: new Date().toISOString() },
    { store: 'sainsburys', status: 'done',    percent: 100, itemsMatched: 8, totalItems: 8, totalPrice: 32.60, totalAfterLoyalty: 32.44, loyaltySaving: 0.16, fetchedAt: new Date().toISOString() },
    { store: 'morrisons',  status: 'done',    percent: 100, itemsMatched: 7, totalItems: 8, totalPrice: 33.10, totalAfterLoyalty: 32.77, loyaltySaving: 0.33, reason: 'Greek Yoghurt 500g not available', fetchedAt: new Date().toISOString() },
    { store: 'ocado',      status: 'done',    percent: 100, itemsMatched: 8, totalItems: 8, totalPrice: 38.20, totalAfterLoyalty: 38.20, loyaltySaving: 0,    fetchedAt: new Date().toISOString() },
    { store: 'waitrose',   status: 'done',    percent: 100, itemsMatched: 8, totalItems: 8, totalPrice: 39.77, totalAfterLoyalty: 39.77, loyaltySaving: 0,    fetchedAt: new Date().toISOString() },
  ],
  lineItems: [
    {
      productId: 'p1', productName: 'Whole Milk 6 Pints', quantity: 1, unit: 'each',
      results: {
        tesco:      { price: 1.89, available: true,  isSubstitute: false },
        asda:       { price: 1.79, available: true,  isSubstitute: false },
        sainsburys: { price: 1.95, available: true,  isSubstitute: false },
        morrisons:  { price: 1.85, available: true,  isSubstitute: false },
        ocado:      { price: 2.10, available: true,  isSubstitute: false },
        waitrose:   { price: 2.15, available: true,  isSubstitute: false },
      },
      cheapestStore: 'asda',
    },
    {
      productId: 'p2', productName: 'Free Range Eggs 12 Pack', quantity: 1, unit: 'pack',
      results: {
        tesco:      { price: 2.99, available: true,  isSubstitute: false },
        asda:       { price: 2.69, available: true,  isSubstitute: false },
        sainsburys: { price: 3.10, available: true,  isSubstitute: false },
        morrisons:  { price: 2.89, available: true,  isSubstitute: false },
        ocado:      { price: 3.45, available: true,  isSubstitute: false },
        waitrose:   { price: 3.60, available: true,  isSubstitute: false },
      },
      cheapestStore: 'asda',
    },
  ],
  recommendations: DEMO_RECOMMENDATIONS,
  savingsVsMax: 11.32,
  createdAt: new Date().toISOString(),
}
