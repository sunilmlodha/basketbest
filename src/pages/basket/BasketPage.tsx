import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, Trash2, ShoppingBasket, ChevronRight,
  Minus, Package, Edit3, X, Check,
} from 'lucide-react'
import { useAppStore, searchProducts } from '../../store'
import { EmptyState } from '../../components/EmptyState'
import type { Product, ProductCategory } from '../../types'

const CATEGORIES: { id: ProductCategory; label: string; emoji: string }[] = [
  { id: 'fresh',        label: 'Fresh',     emoji: '🥦' },
  { id: 'dairy',        label: 'Dairy',     emoji: '🥛' },
  { id: 'meat-fish',    label: 'Meat & Fish',emoji: '🍗' },
  { id: 'bakery',       label: 'Bakery',    emoji: '🍞' },
  { id: 'pantry',       label: 'Pantry',    emoji: '🥫' },
  { id: 'frozen',       label: 'Frozen',    emoji: '🧊' },
  { id: 'drinks',       label: 'Drinks',    emoji: '🧃' },
  { id: 'snacks',       label: 'Snacks',    emoji: '🍪' },
  { id: 'household',    label: 'Household', emoji: '🧴' },
  { id: 'personal-care',label: 'Personal',  emoji: '🪥' },
]

export function BasketPage() {
  const navigate = useNavigate()
  const {
    baskets, activeBasketId, getActiveBasket, setActiveBasket,
    addItemToBasket, removeItemFromBasket, updateItemQuantity,
    addBasket, renameBasket, deleteBasket,
  } = useAppStore()

  const basket = getActiveBasket()
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<ProductCategory | null>(null)
  const [showSearch, setShowSearch] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(basket?.name || '')
  const [showNewBasket, setShowNewBasket] = useState(false)
  const [newBasketName, setNewBasketName] = useState('')

  const products = searchProducts(query).filter(
    p => !activeCategory || p.category === activeCategory
  )

  const totalItems = basket?.items.reduce((s, i) => s + i.quantity, 0) ?? 0

  function handleSchedule() {
    if (!basket || basket.items.length === 0) return
    navigate('/delivery/schedule')
  }

  function handleSaveName() {
    if (basket && nameInput.trim()) {
      renameBasket(basket.id, nameInput.trim())
    }
    setEditingName(false)
  }

  function handleCreateBasket() {
    if (!newBasketName.trim()) return
    addBasket(newBasketName.trim())
    setNewBasketName('')
    setShowNewBasket(false)
    setShowSearch(false)
  }

  return (
    <div className="pb-32">
      {/* Basket selector */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {baskets.map((b) => (
            <button
              key={b.id}
              onClick={() => setActiveBasket(b.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                b.id === activeBasketId
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {b.name}
            </button>
          ))}
          <button
            onClick={() => setShowNewBasket(true)}
            className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-sm text-gray-500 border border-dashed border-gray-300 hover:border-brand-300 hover:text-brand-600"
          >
            <Plus className="w-3.5 h-3.5" />New
          </button>
        </div>
      </div>

      {/* New basket modal */}
      {showNewBasket && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/30" onClick={() => setShowNewBasket(false)}>
          <div className="w-full bg-white rounded-t-2xl p-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 mb-3">New basket</h3>
            <input className="input mb-3" value={newBasketName} onChange={e => setNewBasketName(e.target.value)} placeholder="e.g. Weekly Shop, BBQ Party" autoFocus onKeyDown={e => e.key === 'Enter' && handleCreateBasket()} />
            <div className="flex gap-2">
              <button onClick={() => setShowNewBasket(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleCreateBasket} className="btn-primary flex-1">Create</button>
            </div>
          </div>
        </div>
      )}

      {basket ? (
        <>
          {/* Basket header */}
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-center justify-between mb-1">
              {editingName ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    className="input text-base font-semibold py-1"
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false) }}
                  />
                  <button onClick={handleSaveName} className="text-brand-600"><Check className="w-5 h-5" /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-gray-900">{basket.name}</h2>
                  <button onClick={() => { setNameInput(basket.name); setEditingName(true) }} className="text-gray-400"><Edit3 className="w-4 h-4" /></button>
                </div>
              )}
              {baskets.length > 1 && (
                <button onClick={() => deleteBasket(basket.id)} className="text-gray-400 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-sm text-gray-500">{totalItems} {totalItems === 1 ? 'item' : 'items'}</p>
          </div>

          {/* Search toggle */}
          <div className="px-4 pb-3">
            <button
              onClick={() => setShowSearch(s => !s)}
              className="w-full flex items-center gap-2 px-3.5 py-2.5 bg-gray-100 rounded-xl text-sm text-gray-500 hover:bg-gray-200 transition-colors"
            >
              <Search className="w-4 h-4" />
              <span>Search or browse products…</span>
            </button>
          </div>

          {/* Search / browse panel */}
          {showSearch && (
            <div className="px-4 pb-4">
              <input
                className="input mb-3"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="e.g. Whole milk, Eggs, Chicken..."
                autoFocus
              />
              {/* Category pills */}
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-3">
                <button
                  onClick={() => setActiveCategory(null)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!activeCategory ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                >
                  All
                </button>
                {CATEGORIES.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setActiveCategory(ac => ac === c.id ? null : c.id)}
                    className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${activeCategory === c.id ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                  >
                    {c.emoji} {c.label}
                  </button>
                ))}
              </div>

              {/* Product results */}
              {products.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No products found</p>
              ) : (
                <div className="space-y-2">
                  {products.map(product => {
                    const inBasket = basket.items.find(i => i.product.id === product.id)
                    return (
                      <ProductRow
                        key={product.id}
                        product={product}
                        inBasket={inBasket?.quantity}
                        onAdd={() => addItemToBasket(basket.id, product)}
                        onRemove={() => inBasket && removeItemFromBasket(basket.id, inBasket.id)}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Basket items */}
          <div className="px-4">
            {basket.items.length === 0 ? (
              <EmptyState
                icon={ShoppingBasket}
                title="Your basket is empty"
                description="Search or browse above to add groceries to your basket"
              />
            ) : (
              <div className="space-y-2">
                {basket.items.map(item => (
                  <div key={item.id} className="card px-4 py-3 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Package className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.product.name}</p>
                      {item.product.brand && <p className="text-xs text-gray-400">{item.product.brand}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => updateItemQuantity(basket.id, item.id, item.quantity - 1)}
                        className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                      >
                        <Minus className="w-3.5 h-3.5 text-gray-600" />
                      </button>
                      <span className="text-sm font-semibold text-gray-900 w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateItemQuantity(basket.id, item.id, item.quantity + 1)}
                        className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center hover:bg-brand-200"
                      >
                        <Plus className="w-3.5 h-3.5 text-brand-600" />
                      </button>
                      <button onClick={() => removeItemFromBasket(basket.id, item.id)} className="text-gray-300 hover:text-red-400 ml-1">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <EmptyState
          icon={ShoppingBasket}
          title="No basket selected"
          description="Create a basket to get started"
          action={<button onClick={() => setShowNewBasket(true)} className="btn-primary"><Plus className="w-4 h-4" />New basket</button>}
        />
      )}

      {/* Sticky bottom CTA */}
      {basket && basket.items.length > 0 && (
        <div className="sticky-bottom">
          <button onClick={handleSchedule} className="btn-primary-lg w-full">
            Schedule delivery &amp; compare prices
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  )
}

function ProductRow({
  product, inBasket, onAdd, onRemove,
}: {
  product: Product
  inBasket?: number
  onAdd: () => void
  onRemove: () => void
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100">
      <div className="w-9 h-9 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
        <Package className="w-4 h-4 text-gray-300" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{product.name}</p>
        {product.brand && <p className="text-xs text-gray-400">{product.brand}</p>}
      </div>
      {inBasket ? (
        <div className="flex items-center gap-1.5">
          <button onClick={onRemove} className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center"><Minus className="w-3 h-3 text-brand-700" /></button>
          <span className="text-xs font-semibold text-brand-700 w-5 text-center">{inBasket}</span>
          <button onClick={onAdd} className="w-6 h-6 rounded-full bg-brand-600 flex items-center justify-center"><Plus className="w-3 h-3 text-white" /></button>
        </div>
      ) : (
        <button onClick={onAdd} className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center hover:bg-brand-700">
          <Plus className="w-3.5 h-3.5 text-white" />
        </button>
      )}
    </div>
  )
}
