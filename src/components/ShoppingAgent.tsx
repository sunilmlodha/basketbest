/**
 * ShoppingAgent — floating conversational AI assistant
 *
 * Demo mode:  calls runDemoAgent() locally (no API key needed)
 * Production: calls the Supabase shopping-agent Edge Function
 *             which uses Claude with real tool use
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Send, ChevronDown, ShoppingBasket, Loader2 } from 'lucide-react'
import { cn } from '../lib/utils'
import { useAppStore } from '../store'
import { runDemoAgent, type AgentAction } from '../lib/demo-agent'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Message {
  id: string
  role: 'user' | 'assistant'
  text: string
  isStreaming?: boolean
  toolLabel?: string   // shown as a pill while "tool" is being called
}

// ─── Quick-reply chips shown when chat is empty ────────────────────────────

const QUICK_CHIPS = [
  { label: "What's in my basket?", icon: '🛒' },
  { label: 'Suggest a meal',        icon: '🍽️' },
  { label: 'Add ingredients for pasta bolognese', icon: '🍝' },
  { label: 'Compare prices',        icon: '💰' },
]

// ─── Markdown-lite renderer (bold only) ───────────────────────────────────

function renderText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={i} className="italic text-gray-500">{part.slice(1, -1)}</em>
    }
    // Render newlines
    return part.split('\n').map((line, j, arr) => (
      <span key={`${i}-${j}`}>
        {line}
        {j < arr.length - 1 && <br />}
      </span>
    ))
  })
}

// ─── Streaming hook ───────────────────────────────────────────────────────

function useStreamText(target: string, active: boolean, onDone: () => void) {
  const [displayed, setDisplayed] = useState('')
  const indexRef = useRef(0)

  useEffect(() => {
    if (!active) { setDisplayed(target); return }
    indexRef.current = 0
    setDisplayed('')
    const interval = setInterval(() => {
      indexRef.current++
      setDisplayed(target.slice(0, indexRef.current))
      if (indexRef.current >= target.length) {
        clearInterval(interval)
        onDone()
      }
    }, 12)
    return () => clearInterval(interval)
  }, [target, active]) // eslint-disable-line react-hooks/exhaustive-deps

  return displayed
}

// ─── Individual message bubble ────────────────────────────────────────────

function MessageBubble({ message, isLast }: { message: Message; isLast: boolean }) {
  const [streamDone, setStreamDone] = useState(false)
  const displayed = useStreamText(message.text, !!message.isStreaming && isLast, () => setStreamDone(true))
  const text = (message.isStreaming && isLast && !streamDone) ? displayed : message.text

  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[82%] bg-brand-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed shadow-sm">
          {message.text}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2">
      {/* Avatar */}
      <div className="w-7 h-7 bg-gradient-to-br from-violet-500 to-brand-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
        <Sparkles className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="flex flex-col gap-1 max-w-[82%]">
        {/* Tool pill */}
        {message.toolLabel && (
          <div className="flex items-center gap-1.5 text-xs text-violet-600 bg-violet-50 border border-violet-100 rounded-full px-3 py-1 w-fit">
            <Loader2 className="w-3 h-3 animate-spin" />
            {message.toolLabel}
          </div>
        )}
        {/* Text bubble */}
        {text && (
          <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm leading-relaxed text-gray-800 shadow-sm border border-gray-100">
            {renderText(text)}
            {message.isStreaming && isLast && !streamDone && (
              <span className="inline-block w-1 h-3.5 bg-brand-500 ml-0.5 animate-pulse rounded-sm" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────

export function ShoppingAgent() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const isDemoMode        = useAppStore((s) => s.isDemoMode)
  const user              = useAppStore((s) => s.user)
  const activeBasketId    = useAppStore((s) => s.activeBasketId)
  const getActiveBasket   = useAppStore((s) => s.getActiveBasket)
  const addItemToBasket   = useAppStore((s) => s.addItemToBasket)
  const removeItemFromBasket = useAppStore((s) => s.removeItemFromBasket)
  const clearBasket       = useAppStore((s) => s.clearBasket)

  // ── Auto-scroll to bottom on new messages ──────────────────────────────

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
      }, 50)
    }
  }, [messages, open])

  // ── Focus input when drawer opens ─────────────────────────────────────

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300)
  }, [open])

  // ── Welcome message ────────────────────────────────────────────────────

  const showWelcome = useCallback(() => {
    const firstName = user?.fullName?.split(' ')[0] || 'there'
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      text: `Hi ${firstName}! 👋 I'm your BasketBest AI assistant. I can add items to your basket, plan meals, check prices, or compare stores across Tesco, Asda, Sainsbury's and more.\n\nWhat can I help you with?`,
      isStreaming: true,
    }])
  }, [user])

  useEffect(() => {
    if (open && messages.length === 0) showWelcome()
  }, [open, messages.length, showWelcome])

  // ── Execute basket actions from agent ─────────────────────────────────

  const executeActions = useCallback((actions: AgentAction[]) => {
    const basketId = activeBasketId
    if (!basketId) return

    for (const action of actions) {
      switch (action.type) {
        case 'add':
          if (action.product) addItemToBasket(basketId, action.product, action.quantity ?? 1)
          break
        case 'remove':
          if (action.itemId) removeItemFromBasket(basketId, action.itemId)
          break
        case 'clear':
          clearBasket(basketId)
          break
        case 'navigate':
          if (action.path) navigate(action.path)
          break
      }
    }
  }, [activeBasketId, addItemToBasket, removeItemFromBasket, clearBasket, navigate])

  // ── Send message ───────────────────────────────────────────────────────

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isLoading) return

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', text: trimmed }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    // Add a thinking indicator
    const thinkingId = `t-${Date.now()}`
    setMessages((prev) => [...prev, {
      id: thinkingId,
      role: 'assistant',
      text: '',
      toolLabel: 'Thinking…',
    }])

    try {
      let responseText: string
      let actions: AgentAction[] = []

      if (isDemoMode) {
        // Small artificial delay for realism
        await new Promise<void>((r) => setTimeout(r, 600 + Math.random() * 400))
        const basket = getActiveBasket()
        const firstName = user?.fullName?.split(' ')[0] || 'there'
        const result = runDemoAgent(trimmed, basket, firstName)
        responseText = result.text
        actions = result.actions
      } else {
        // Production: call Supabase Edge Function
        const basket = getActiveBasket()
        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopping-agent`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              message: trimmed,
              basket,
              userId: user?.id,
            }),
          }
        )
        if (!resp.ok) throw new Error(`Edge Function error: ${resp.status}`)
        const data = await resp.json()
        responseText = data.text
        actions = data.basketActions ?? []
      }

      // Replace thinking bubble with streaming response
      const assistantId = `a-${Date.now()}`
      setMessages((prev) => prev
        .filter((m) => m.id !== thinkingId)
        .concat({ id: assistantId, role: 'assistant', text: responseText, isStreaming: true })
      )

      // Execute basket actions
      if (actions.length > 0) {
        setTimeout(() => executeActions(actions), 400)
      }
    } catch (err) {
      console.error('Agent error:', err)
      setMessages((prev) => prev
        .filter((m) => m.id !== thinkingId)
        .concat({
          id: `err-${Date.now()}`,
          role: 'assistant',
          text: `Sorry, I ran into a problem. Please try again in a moment.`,
          isStreaming: false,
        })
      )
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, isDemoMode, getActiveBasket, user, executeActions])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleChip = (label: string) => sendMessage(label)

  // ─────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Floating button ─────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'fixed bottom-[4.5rem] right-4 z-50',
          'w-14 h-14 rounded-full shadow-lg',
          'bg-gradient-to-br from-violet-500 to-brand-600',
          'flex items-center justify-center',
          'transition-all duration-200 hover:scale-105 active:scale-95',
          open && 'opacity-0 pointer-events-none'
        )}
        aria-label="Open shopping assistant"
      >
        <Sparkles className="w-6 h-6 text-white" />
        {/* Pulse ring */}
        <span className="absolute inset-0 rounded-full animate-ping bg-brand-400 opacity-20" />
      </button>

      {/* ── Backdrop ────────────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[1px]"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Bottom sheet drawer ──────────────────────────────────────── */}
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 flex flex-col',
          'bg-gray-50 rounded-t-2xl shadow-2xl',
          'transition-transform duration-300 ease-out',
          open ? 'translate-y-0' : 'translate-y-full'
        )}
        style={{ height: '72vh', maxHeight: 640 }}
      >
        {/* ── Header ────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white rounded-t-2xl flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-brand-600 rounded-full flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 leading-none">BasketBest AI</p>
              <p className="text-xs text-green-500 font-medium mt-0.5">
                {isDemoMode ? 'Demo mode' : 'Online'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setMessages([]); setTimeout(showWelcome, 50) }}
              className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              title="New chat"
            >
              <ShoppingBasket className="w-4 h-4" />
            </button>
            <button
              onClick={() => setOpen(false)}
              className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Message list ──────────────────────────────────────────── */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-4 overscroll-contain"
        >
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-violet-100 to-brand-100 rounded-full flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-brand-500" />
              </div>
              <p className="text-gray-500 text-sm max-w-[220px] leading-relaxed">
                Your AI shopping assistant — add items, plan meals, compare prices.
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isLast={i === messages.length - 1}
            />
          ))}
        </div>

        {/* ── Quick chips (shown when only welcome message) ──────────── */}
        {messages.length <= 1 && (
          <div className="px-4 pb-2 flex gap-2 overflow-x-auto flex-shrink-0 scrollbar-hide">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip.label}
                onClick={() => handleChip(chip.label)}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-700 hover:border-brand-400 hover:text-brand-600 transition-colors shadow-sm"
              >
                <span>{chip.icon}</span>
                {chip.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Input bar ─────────────────────────────────────────────── */}
        <div className="px-4 pb-4 pt-2 bg-gray-50 flex-shrink-0 border-t border-gray-100">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything about your shopping…"
              disabled={isLoading}
              className={cn(
                'flex-1 bg-white border border-gray-200 rounded-full px-4 py-2.5 text-sm',
                'placeholder-gray-400 text-gray-900',
                'focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'transition-all shadow-sm'
              )}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                'bg-brand-600 text-white shadow-sm',
                'transition-all hover:bg-brand-700 active:scale-95',
                'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-brand-600'
              )}
              aria-label="Send"
            >
              {isLoading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Send className="w-4 h-4" />
              }
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
