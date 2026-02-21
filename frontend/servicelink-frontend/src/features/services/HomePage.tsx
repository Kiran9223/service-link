import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Zap, Search, MessageSquare, Timer, ArrowRight,
  CheckCircle, Clock, Star, Shield, ChevronDown,
  Wrench, Zap as ZapIcon, Snowflake, Sparkles,
  Leaf, Hammer, Paintbrush, TreePine, Home, Lock,
  Bot, BarChart3, TrendingDown, X, Send, Loader2,
  MapPin, ChevronRight,
} from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/hooks/useAppDispatch'
import { openAIChat, closeAIChat } from '@/store/slices/uiSlice'

// ── Types ─────────────────────────────────────────────────────────────────────
interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  typing?: boolean
}

interface QuickReply {
  label: string
  value: string
}

// ── Category data ─────────────────────────────────────────────────────────────
const CATEGORIES = [
  { name: 'Plumbing',   icon: Wrench,     gradient: 'from-blue-500 to-blue-600',     providers: '1,234' },
  { name: 'Electrical', icon: ZapIcon,    gradient: 'from-yellow-500 to-orange-500', providers: '892'   },
  { name: 'HVAC',       icon: Snowflake,  gradient: 'from-cyan-500 to-blue-500',     providers: '567'   },
  { name: 'Cleaning',   icon: Sparkles,   gradient: 'from-purple-500 to-pink-500',   providers: '2,103' },
  { name: 'Lawn Care',  icon: Leaf,       gradient: 'from-green-500 to-emerald-500', providers: '1,456' },
  { name: 'Handyman',   icon: Hammer,     gradient: 'from-orange-500 to-red-500',    providers: '987'   },
  { name: 'Painting',   icon: Paintbrush, gradient: 'from-pink-500 to-rose-500',     providers: '734'   },
  { name: 'Carpentry',  icon: TreePine,   gradient: 'from-amber-600 to-orange-600',  providers: '456'   },
  { name: 'Roofing',    icon: Home,       gradient: 'from-slate-600 to-gray-700',    providers: '321'   },
  { name: 'Locksmith',  icon: Lock,       gradient: 'from-indigo-500 to-purple-500', providers: '289'   },
]

const TRADITIONAL_STEPS = [
  { step: 1, title: 'Browse Categories',  desc: 'Scroll through all service types and find the right one',     time: '2–5 min'   },
  { step: 2, title: 'Compare Providers',  desc: 'Read profiles, ratings, and reviews for multiple providers',  time: '10–15 min' },
  { step: 3, title: 'Select a Service',   desc: "Choose from the provider's list of offered services",         time: '3–5 min'   },
  { step: 4, title: 'Pick Date & Time',   desc: 'Navigate availability calendar and find an open slot',        time: '5–10 min'  },
  { step: 5, title: 'Review & Confirm',   desc: 'Check all details, pricing, and submit your booking request', time: '2–3 min'   },
]

// ── Simulated AI conversation flow ────────────────────────────────────────────
// In future this will call your FastAPI AI service.
// For now it simulates the conversation to demonstrate the UX.
const AI_FLOWS: Record<string, { reply: string; quickReplies?: QuickReply[] }> = {
  default: {
    reply: "I'd be happy to help you find a service provider! Could you tell me what kind of service you need? For example: plumbing, electrical, cleaning, HVAC, or something else?",
    quickReplies: [
      { label: '🔧 Plumbing', value: 'I need a plumber' },
      { label: '⚡ Electrical', value: 'I need an electrician' },
      { label: '✨ Cleaning', value: 'I need house cleaning' },
      { label: '❄️ HVAC', value: 'I need HVAC service' },
    ],
  },
  plumb: {
    reply: "Got it — plumbing! When do you need this done, and do you have a budget in mind? For example: *\"Tomorrow morning, under $150\"*",
    quickReplies: [
      { label: '📅 Today', value: 'Today, flexible budget' },
      { label: '📅 Tomorrow morning', value: 'Tomorrow morning, under $150' },
      { label: '📅 This weekend', value: 'This weekend, under $200' },
    ],
  },
  electric: {
    reply: "Electrical work — noted! When would work best for you, and what's your approximate budget?",
    quickReplies: [
      { label: '📅 Today', value: 'Today, flexible budget' },
      { label: '📅 Tomorrow', value: 'Tomorrow, under $200' },
      { label: '📅 This weekend', value: 'This weekend, flexible' },
    ],
  },
  clean: {
    reply: "House cleaning — great! When do you need it, and how large is the space? I'll match you with the best available cleaner.",
    quickReplies: [
      { label: '📅 Today', value: 'Today, 2-bedroom apartment' },
      { label: '📅 Tomorrow', value: 'Tomorrow, 3-bedroom house' },
      { label: '📅 This weekend', value: 'This weekend, flexible' },
    ],
  },
  hvac: {
    reply: "HVAC service — on it! Is this for maintenance, repair, or installation? And when works best for you?",
    quickReplies: [
      { label: '🔨 Repair', value: 'Repair, as soon as possible' },
      { label: '🔧 Maintenance', value: 'Maintenance, this week' },
      { label: '🆕 Installation', value: 'New installation, flexible' },
    ],
  },
  time: {
    reply: "Perfect. Let me search for available providers in your area...",
    quickReplies: [],
  },
  searching: {
    reply: "✅ Found **3 top-rated providers** near Fullerton, CA:\n\n**1. Mike's Pro Plumbing** ⭐ 4.9 · 203 reviews · $95/hr\n**2. QuickFix Services** ⭐ 4.7 · 127 reviews · $85/hr\n**3. AllStar Home Services** ⭐ 4.8 · 89 reviews · $110/hr\n\nI recommend **Mike's Pro Plumbing** — highest rated, available tomorrow at 9 AM. Shall I book that slot?",
    quickReplies: [
      { label: '✅ Yes, book Mike\'s!', value: 'Yes, book Mike\'s Pro Plumbing for tomorrow 9 AM' },
      { label: '👀 Show all options', value: 'Show me all available providers' },
    ],
  },
  confirm: {
    reply: "🎉 **Booking Confirmed!**\n\nHere's your summary:\n- **Provider:** Mike's Pro Plumbing\n- **Date:** Tomorrow, 9:00 AM\n- **Service:** Plumbing\n- **Est. Cost:** $95/hr\n- **Booking ID:** #SL-2024-8841\n\nYou'll receive a confirmation notification shortly. Total time: under 60 seconds! 🚀",
    quickReplies: [
      { label: '📋 View Booking', value: 'view booking' },
      { label: '🏠 Back to Home', value: 'done' },
    ],
  },
}

function getAIResponse(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('plumb') || m.includes('pipe') || m.includes('leak')) return 'plumb'
  if (m.includes('electric') || m.includes('wire') || m.includes('outlet')) return 'electric'
  if (m.includes('clean')) return 'clean'
  if (m.includes('hvac') || m.includes('heat') || m.includes('cool') || m.includes('ac')) return 'hvac'
  if (m.includes('yes') && m.includes('book')) return 'confirm'
  if (m.includes('yes') || m.includes('book') || m.includes('confirm')) return 'confirm'
  if (m.includes('tomorrow') || m.includes('today') || m.includes('weekend') || m.includes('morning')) return 'time'
  return 'default'
}

// ── Hooks ─────────────────────────────────────────────────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setInView(true); obs.disconnect() }
    }, { threshold })
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, inView }
}

function useStopwatch() {
  const [running, setRunning]   = useState(false)
  const [elapsed, setElapsed]   = useState(0)
  const intervalRef             = useRef<ReturnType<typeof setInterval> | null>(null)
  const start = useCallback(() => { setElapsed(0); setRunning(true) }, [])
  const stop  = useCallback(() => setRunning(false), [])
  const reset = useCallback(() => { setRunning(false); setElapsed(0) }, [])
  useEffect(() => {
    if (running) intervalRef.current = setInterval(() => setElapsed(p => p + 1), 1000)
    else if (intervalRef.current) clearInterval(intervalRef.current)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running])
  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  return { elapsed, running, start, stop, reset, fmt }
}

// ── AI Chat Panel ─────────────────────────────────────────────────────────────
function AIChatPanel({
  isOpen,
  onClose,
  onBookingComplete,
}: {
  isOpen: boolean
  onClose: () => void
  onBookingComplete: () => void
}) {
  const [messages,    setMessages]    = useState<ChatMessage[]>([])
  const [input,       setInput]       = useState('')
  const [isTyping,    setIsTyping]    = useState(false)
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([])
  const [step,        setStep]        = useState<string>('default')
  const [booked,      setBooked]      = useState(false)
  const messagesEndRef                = useRef<HTMLDivElement>(null)
  const inputRef                      = useRef<HTMLInputElement>(null)

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // When panel opens — show greeting
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setTimeout(() => {
        setIsTyping(true)
        setTimeout(() => {
          setIsTyping(false)
          const flow = AI_FLOWS['default']
          setMessages([{
            id: '0',
            role: 'assistant',
            content: flow.reply,
            timestamp: new Date(),
          }])
          setQuickReplies(flow.quickReplies ?? [])
        }, 1200)
      }, 400)
    }
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300)
  }, [isOpen, messages.length])

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setMessages([])
        setInput('')
        setIsTyping(false)
        setQuickReplies([])
        setStep('default')
        setBooked(false)
      }, 400)
    }
  }, [isOpen])

  const sendMessage = useCallback((text: string) => {
    if (!text.trim() || isTyping) return

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setQuickReplies([])
    setIsTyping(true)

    // Determine next flow step
    const nextStep = step === 'time' ? 'searching'
      : step === 'searching' ? 'confirm'
      : getAIResponse(text)

    const delay = nextStep === 'searching' ? 2000 : 1200

    setTimeout(() => {
      setIsTyping(false)
      const flow = AI_FLOWS[nextStep] ?? AI_FLOWS['default']
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: flow.reply,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, assistantMsg])
      setQuickReplies(flow.quickReplies ?? [])
      setStep(nextStep)

      if (nextStep === 'confirm') {
        setBooked(true)
        onBookingComplete()
      }
    }, delay)
  }, [isTyping, step, onBookingComplete])

  // Render markdown-like bold (**text**)
  const renderContent = (content: string) => {
    const parts = content.split(/\*\*(.*?)\*\*/g)
    return parts.map((part, i) =>
      i % 2 === 1
        ? <strong key={i} className="font-semibold">{part}</strong>
        : <span key={i}>{part}</span>
    )
  }

  return (
    <>
      {/* Backdrop — subtle dim behind panel */}
      <div
        className={`fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40 transition-opacity duration-400 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Slide panel */}
      <div className={`fixed top-0 right-0 h-full w-full sm:w-[420px] z-50 flex flex-col
        transition-transform duration-400 ease-in-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Glass panel body */}
        <div className="flex flex-col h-full bg-white/95 backdrop-blur-xl shadow-2xl border-l border-white/60">

          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-5 py-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-purple-600 rounded-full" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">ServiceLink AI</p>
                <p className="text-purple-200 text-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  Online · Powered by Claude
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <p className="text-purple-200 text-xs">avg. booking time</p>
                <p className="text-white font-bold text-sm">&lt; 60 seconds</p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors ml-2"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          {/* Progress bar — fills as conversation progresses */}
          <div className="h-1 bg-gray-100 flex-shrink-0">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-700"
              style={{
                width: booked ? '100%'
                  : step === 'confirm' ? '100%'
                  : step === 'searching' ? '80%'
                  : step === 'time' ? '60%'
                  : ['plumb','electric','clean','hvac'].includes(step) ? '40%'
                  : messages.length > 0 ? '20%'
                  : '0%'
              }}
            />
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 scroll-smooth">

            {/* Empty state */}
            {messages.length === 0 && !isTyping && (
              <div className="flex flex-col items-center justify-center h-full text-center px-6 gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl flex items-center justify-center">
                  <MessageSquare className="w-8 h-8 text-purple-500" />
                </div>
                <div>
                  <p className="text-gray-700 font-semibold">Start your conversation</p>
                  <p className="text-gray-400 text-sm mt-1">Describe the service you need and I'll handle everything else</p>
                </div>
              </div>
            )}

            {/* Message bubbles */}
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex items-end gap-2.5 animate-fadeInUp ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}

                {/* Bubble */}
                <div className={`max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}>
                    {renderContent(msg.content)}
                  </div>
                  <span className="text-xs text-gray-400 px-1">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex items-end gap-2.5 animate-fadeInUp">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-typing-1" />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-typing-2" />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-typing-3" />
                </div>
              </div>
            )}

            {/* Booking success card */}
            {booked && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-4 animate-fadeInUp">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="text-green-700 font-bold text-sm">Booking Confirmed!</p>
                </div>
                <p className="text-green-600 text-xs">
                  Notification sent · Provider notified · Slot reserved
                </p>
                <button
                  onClick={onClose}
                  className="mt-3 w-full py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5" /> View My Bookings
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick replies */}
          {quickReplies.length > 0 && (
            <div className="px-4 pb-2 flex flex-wrap gap-2 flex-shrink-0">
              {quickReplies.map(qr => (
                <button
                  key={qr.value}
                  onClick={() => sendMessage(qr.value)}
                  className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-xs font-medium rounded-full transition-all duration-200 hover:scale-[1.03] active:scale-95"
                >
                  {qr.label}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-4 pb-5 pt-2 flex-shrink-0 border-t border-gray-100">
            <div className="flex gap-2 items-center bg-gray-50 border-2 border-gray-200 focus-within:border-purple-400 rounded-2xl px-4 py-2.5 transition-colors">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
                placeholder={booked ? 'Booking complete!' : 'Type your message…'}
                disabled={booked}
                className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isTyping || booked}
                className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-md transition-all duration-200 hover:scale-105 active:scale-95 flex-shrink-0"
              >
                {isTyping
                  ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                  : <Send className="w-3.5 h-3.5 text-white" />
                }
              </button>
            </div>
            <p className="text-center text-xs text-gray-400 mt-2">
              AI assistant · Responses may vary
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Floating AI Button ────────────────────────────────────────────────────────
function FloatingAIButton({ onClick, isOpen }: { onClick: () => void; isOpen: boolean }) {
  return (
    <div className={`fixed bottom-8 right-8 z-30 transition-all duration-300 ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}>
      {/* Pulse ring */}
      <span className="absolute inset-0 rounded-full bg-purple-400 animate-ping opacity-30" />
      <button
        onClick={onClick}
        className="relative w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform duration-200"
      >
        <Bot className="w-7 h-7 text-white" />
      </button>
      {/* Tooltip */}
      <div className="absolute bottom-full right-0 mb-3 bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none">
        Book with AI · &lt;60s
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const isAIOpen = useAppSelector(s => s.ui.isAIChatOpen)

  const [bookingMode,    setBookingMode]    = useState<'traditional' | 'ai'>('traditional')
  const [showTimer,      setShowTimer]      = useState(false)
  const [searchQuery,    setSearchQuery]    = useState('')
  const [searchLocation, setSearchLocation] = useState('')
  const [bookingDone,    setBookingDone]    = useState(false)

  const aiTimer   = useStopwatch()
  const tradTimer = useStopwatch()

  const heroSection       = useInView()
  const howItWorksSection = useInView()
  const categoriesSection = useInView()
  const comparisonSection = useInView()

  // AI timer: starts when panel opens, stops when closed
  useEffect(() => {
    if (isAIOpen && !aiTimer.running) aiTimer.start()
    if (!isAIOpen && aiTimer.running) aiTimer.stop()
  }, [isAIOpen, aiTimer])

  const handleOpenAI = () => {
    setBookingMode('ai')
    dispatch(openAIChat())
  }

  const handleCloseAI = () => {
    dispatch(closeAIChat())
    if (!bookingDone) setBookingMode('traditional')
  }

  const handleModeSwitch = (mode: 'traditional' | 'ai') => {
    setBookingMode(mode)
    if (mode === 'ai') {
      dispatch(openAIChat())
      aiTimer.reset()
      setBookingDone(false)
    } else {
      dispatch(closeAIChat())
      tradTimer.reset()
    }
  }

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (searchQuery)    params.set('q', searchQuery)
    if (searchLocation) params.set('location', searchLocation)
    tradTimer.start()
    navigate(`/services?${params.toString()}`)
  }

  const handleCategoryClick = (categoryName: string) => {
    tradTimer.start()
    navigate(`/services?category=${encodeURIComponent(categoryName)}`)
  }

  const handleBookingComplete = () => {
    setBookingDone(true)
    aiTimer.stop()
  }

  return (
    <div className="overflow-x-hidden">

      {/* ── AI CHAT PANEL (rendered at top level, slides over everything) ── */}
      <AIChatPanel
        isOpen={isAIOpen}
        onClose={handleCloseAI}
        onBookingComplete={handleBookingComplete}
      />

      {/* ── FLOATING AI BUTTON ──────────────────────────────────────────── */}
      <FloatingAIButton onClick={handleOpenAI} isOpen={isAIOpen} />

      {/* ════════════════════════════════════════════════════════════════════
          HERO
      ════════════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center pt-16 pb-24 px-4 overflow-hidden bg-brand-surface">

        {/* Layered background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 opacity-30"
            style={{ backgroundImage: 'radial-gradient(circle, #9333ea22 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
          <div className="absolute top-24 left-[8%]  w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-2xl opacity-25 animate-float" />
          <div className="absolute top-44 right-[8%] w-80 h-80 bg-blue-300   rounded-full mix-blend-multiply filter blur-2xl opacity-25 animate-float-delayed-2" />
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-2xl opacity-20 animate-float-delayed-4" />
        </div>

        <div className="max-w-5xl mx-auto relative z-10 w-full">
          <div
            ref={heroSection.ref}
            className={`text-center transition-all duration-700 ${heroSection.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            {/* Badge */}
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-purple-200 rounded-full text-sm font-medium text-purple-700 shadow-sm mb-8">
              <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
              AI-Powered Service Marketplace · CSUF Thesis Project
            </span>

            {/* Headline */}
            <h1 className="text-5xl md:text-7xl font-extrabold leading-tight mb-6 tracking-tight">
              <span className="bg-gradient-to-r from-purple-600 via-blue-600 to-pink-500 bg-clip-text text-transparent">
                Find Local Services
              </span>
              <br />
              <span className="text-gray-800 font-light text-4xl md:text-6xl">
                in Under <span className="font-extrabold text-gray-900">60 Seconds</span>
              </span>
            </h1>

            <p className="text-lg md:text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
              Connect with trusted local service providers instantly.
              Choose traditional search or let AI handle everything in one conversation.
            </p>

            {/* Mode toggle pill */}
            <div className="inline-flex bg-white shadow-lg rounded-2xl p-1.5 mb-6 border border-gray-100">
              {(['traditional', 'ai'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => handleModeSwitch(mode)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    bookingMode === mode
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md scale-[1.02]'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {mode === 'traditional'
                    ? <><Search className="w-4 h-4" /> Traditional Search</>
                    : <><Bot    className="w-4 h-4" /> AI-Powered Chat</>
                  }
                </button>
              ))}
            </div>

            {/* Timer toggle */}
            <div className="flex justify-center mb-8">
              <button
                onClick={() => setShowTimer(t => !t)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold border-2 transition-all duration-300 ${
                  showTimer
                    ? 'border-purple-400 bg-purple-50 text-purple-700'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-purple-300'
                }`}
              >
                <Timer className="w-3.5 h-3.5" />
                {showTimer ? 'Hide Speed Comparison' : 'Show Speed Comparison'}
              </button>
            </div>

            {/* Speed comparison card */}
            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${showTimer ? 'max-h-56 opacity-100 mb-8' : 'max-h-0 opacity-0'}`}>
              <div className="max-w-2xl mx-auto bg-white/90 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-lg p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4 flex items-center justify-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5" /> Live Speed Comparison
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {/* Traditional */}
                  <div className="text-center p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex items-center justify-center gap-1.5 mb-2">
                      <Search className="w-4 h-4 text-gray-500" />
                      <p className="text-xs font-semibold text-gray-500">Traditional</p>
                    </div>
                    <p className="text-3xl font-bold text-gray-700 font-mono tracking-widest">
                      {tradTimer.running ? tradTimer.fmt(tradTimer.elapsed) : '45:00'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {tradTimer.running ? 'Booking in progress…' : 'avg. booking time'}
                    </p>
                    {tradTimer.running && (
                      <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-gray-400 rounded-full animate-[shimmer_2s_infinite]" style={{ width: '60%' }} />
                      </div>
                    )}
                  </div>
                  {/* AI */}
                  <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border border-purple-200">
                    <div className="flex items-center justify-center gap-1.5 mb-2">
                      <Bot className="w-4 h-4 text-purple-600" />
                      <p className="text-xs font-semibold text-purple-600">AI Chat</p>
                    </div>
                    <p className={`text-3xl font-bold font-mono tracking-widest ${
                      bookingDone
                        ? 'text-green-600'
                        : 'bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent'
                    }`}>
                      {aiTimer.fmt(aiTimer.elapsed)}
                    </p>
                    <p className="text-xs text-purple-400 mt-1 flex items-center justify-center gap-1">
                      <TrendingDown className="w-3 h-3" />
                      {bookingDone ? '🎉 Booking complete!' : isAIOpen ? 'Booking in progress…' : 'Open AI to measure'}
                    </p>
                    {isAIOpen && !bookingDone && (
                      <div className="mt-2 h-1 bg-purple-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full w-3/4 animate-pulse" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Traditional search glass card ──────────────────────────── */}
            <div className={`max-w-3xl mx-auto transition-all duration-500 ${
              bookingMode === 'traditional' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none h-0 overflow-hidden'
            }`}>
              <div className="glass rounded-2xl p-3 shadow-2xl">
                <div className="flex flex-col md:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="What service do you need? (e.g., Plumber, Electrician)"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSearch()}
                      className="w-full pl-12 pr-4 py-4 bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 border-2 border-transparent"
                    />
                  </div>
                  <div className="relative md:w-56">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Location (e.g., Fullerton, CA)"
                      value={searchLocation}
                      onChange={e => setSearchLocation(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSearch()}
                      className="w-full pl-12 pr-4 py-4 bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 border-2 border-transparent"
                    />
                  </div>
                  <button
                    onClick={handleSearch}
                    className="btn-primary px-8 py-4 whitespace-nowrap text-sm flex items-center gap-2 shadow-lg"
                  >
                    <Search className="w-4 h-4" /> Search
                  </button>
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-400 text-center flex items-center justify-center gap-1.5">
                <Clock className="w-3 h-3" />
                5 steps to complete · avg. 45 minutes
              </p>
            </div>

            {/* ── AI mode card (when toggle switched to AI) ──────────────── */}
            <div className={`max-w-3xl mx-auto transition-all duration-500 ${
              bookingMode === 'ai' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none h-0 overflow-hidden'
            }`}>
              {/* Animated chat preview */}
              <div className="glass rounded-2xl p-5 shadow-2xl text-left">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">AI Assistant · Live Preview</p>
                </div>

                {/* Sample conversation */}
                <div className="space-y-3 mb-5">
                  <div className="flex items-end gap-2">
                    <div className="w-7 h-7 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="bg-white rounded-2xl rounded-bl-none px-4 py-2.5 shadow-sm border border-gray-100 max-w-xs">
                      <p className="text-gray-700 text-sm">Hi! What service do you need today?</p>
                    </div>
                  </div>
                  <div className="flex items-end gap-2 flex-row-reverse">
                    <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs">👤</div>
                    <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl rounded-br-none px-4 py-2.5 max-w-xs">
                      <p className="text-white text-sm">I need a plumber tomorrow morning, under $150</p>
                    </div>
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="w-7 h-7 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="bg-white rounded-2xl rounded-bl-none px-4 py-2.5 shadow-sm border border-gray-100 max-w-xs">
                      <p className="text-gray-700 text-sm">✅ Found 3 providers! <strong>Mike's Pro Plumbing</strong> ⭐ 4.9 is available at 9 AM for $95/hr. Book it?</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleOpenAI}
                  className="btn-primary w-full py-4 flex items-center justify-center gap-2 text-sm shadow-lg group"
                >
                  <MessageSquare className="w-4 h-4" />
                  Start Your AI Conversation
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
              <p className="mt-3 text-xs text-gray-400 text-center flex items-center justify-center gap-1.5">
                <Zap className="w-3 h-3 text-purple-400" />
                1 conversation · under 60 seconds · no forms, no browsing
              </p>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-3 gap-6 max-w-2xl mx-auto">
              {[
                { value: '10K+', label: 'Service Providers',  gradient: 'from-purple-600 to-blue-600' },
                { value: '50K+', label: 'Bookings Completed', gradient: 'from-blue-600 to-pink-500'   },
                { value: '<60s', label: 'AI Booking Time',    gradient: 'from-pink-500 to-purple-600' },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <div className={`text-3xl md:text-4xl font-extrabold bg-gradient-to-r ${s.gradient} bg-clip-text text-transparent`}>{s.value}</div>
                  <div className="text-gray-500 text-sm mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Scroll cue */}
            <div className="mt-14 flex justify-center">
              <button
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                className="flex flex-col items-center gap-1 text-gray-400 hover:text-purple-500 transition-colors"
              >
                <span className="text-xs font-medium">See how it works</span>
                <ChevronDown className="w-5 h-5 animate-bounce" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          HOW IT WORKS
      ════════════════════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="py-24 px-4 bg-white">
        <div
          ref={howItWorksSection.ref}
          className={`max-w-6xl mx-auto transition-all duration-700 ${howItWorksSection.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
        >
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Two Ways to Book.{' '}
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                One Clear Winner.
              </span>
            </h2>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">
              See exactly why AI booking is 45× faster than traditional search.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-start">
            {/* Traditional */}
            <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-8 hover:border-gray-300 transition-colors">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gray-200 rounded-2xl flex items-center justify-center">
                  <Search className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Traditional Booking</h3>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Average time: <strong>45+ minutes</strong>
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {TRADITIONAL_STEPS.map((s, i) => (
                  <div key={s.step} className="flex items-start gap-3">
                    <div className="flex flex-col items-center mt-1">
                      <div className="w-7 h-7 rounded-full bg-gray-300 text-gray-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {s.step}
                      </div>
                      {i < TRADITIONAL_STEPS.length - 1 && <div className="w-0.5 h-6 bg-gray-200 mt-1" />}
                    </div>
                    <div className="flex-1 pb-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-700">{s.title}</p>
                        <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">{s.time}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-5 border-t border-gray-200 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 font-medium">Total steps</span>
                  <span className="font-bold text-gray-700 bg-gray-200 px-3 py-1 rounded-full">5 steps</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 font-medium">Estimated time</span>
                  <span className="font-bold text-red-600 bg-red-50 px-3 py-1 rounded-full">22–38 minutes</span>
                </div>
              </div>
            </div>

            {/* AI */}
            <div className="bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 border-2 border-purple-300 rounded-2xl p-8 relative overflow-hidden hover:border-purple-400 transition-colors">
              <div className="absolute top-5 right-5 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md flex items-center gap-1">
                <Star className="w-3 h-3 fill-white" /> RECOMMENDED
              </div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-md">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">AI-Powered Booking</h3>
                  <p className="text-sm text-purple-600 flex items-center gap-1 font-medium">
                    <Zap className="w-3.5 h-3.5 fill-purple-600" /> Average time: <strong>&lt;60 seconds</strong>
                  </p>
                </div>
              </div>
              <div className="space-y-3 mb-6">
                {[
                  { msg: 'You say what you need',    sub: '"I need a plumber tomorrow morning under $150"',              isUser: true  },
                  { msg: 'AI finds the best match',  sub: 'Analyzes providers using fairness-aware algorithm',           isUser: false },
                  { msg: 'You confirm in one click', sub: 'Slot reserved, booking confirmed, notification sent',         isUser: true  },
                ].map((item, i) => (
                  <div key={i} className={`flex items-start gap-3 ${item.isUser ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm ${item.isUser ? 'bg-blue-600 text-white' : 'bg-gradient-to-br from-purple-600 to-blue-600 text-white'}`}>
                      {item.isUser ? '👤' : <Bot className="w-4 h-4" />}
                    </div>
                    <div className={`flex-1 ${item.isUser ? 'text-right' : ''}`}>
                      <div className={`inline-block px-4 py-2.5 rounded-2xl ${item.isUser ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white shadow-sm rounded-tl-none border border-gray-100'}`}>
                        <p className={`text-sm font-semibold ${item.isUser ? 'text-white' : 'text-gray-800'}`}>{item.msg}</p>
                        <p className={`text-xs mt-0.5 ${item.isUser ? 'text-blue-100' : 'text-gray-500'}`}>{item.sub}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-5 border-t border-purple-200 space-y-2 mb-5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 font-medium">Total steps</span>
                  <span className="font-bold text-purple-700 bg-purple-100 px-3 py-1 rounded-full">1 conversation</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 font-medium">Estimated time</span>
                  <span className="font-bold text-green-700 bg-green-100 px-3 py-1 rounded-full">Under 60 seconds</span>
                </div>
              </div>
              <button
                onClick={handleOpenAI}
                className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 text-sm shadow-lg group"
              >
                <MessageSquare className="w-4 h-4" /> Try AI Booking Now
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          CATEGORIES
      ════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 px-4 bg-brand-surface">
        <div
          ref={categoriesSection.ref}
          className={`max-w-7xl mx-auto transition-all duration-700 ${categoriesSection.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
        >
          <div className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Browse by{' '}
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Category</span>
            </h2>
            <p className="text-lg text-gray-500">Find the perfect service provider for any home need</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {CATEGORIES.map((cat, i) => {
              const Icon = cat.icon
              return (
                <button
                  key={cat.name}
                  onClick={() => handleCategoryClick(cat.name)}
                  style={{ animationDelay: `${i * 60}ms` }}
                  className={`category-card group bg-gradient-to-br ${cat.gradient} rounded-2xl p-6 text-white shadow-lg text-left`}
                >
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-white/30 transition-colors">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold mb-1">{cat.name}</h3>
                  <p className="text-xs opacity-75">{cat.providers} providers</p>
                </button>
              )
            })}
          </div>
          <div className="text-center mt-10">
            <button
              onClick={() => navigate('/services')}
              className="btn-outline flex items-center gap-2 mx-auto"
            >
              View All Services <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          TRUST SIGNALS
      ════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 px-4 bg-white">
        <div
          ref={comparisonSection.ref}
          className={`max-w-5xl mx-auto transition-all duration-700 ${comparisonSection.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Why Providers and Customers{' '}
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Trust ServiceLink</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Shield,      color: 'from-purple-500 to-purple-600', title: 'Verified Providers',      desc: 'Every provider is vetted — background checks, certifications verified, and insurance confirmed.' },
              { icon: Zap,         color: 'from-blue-500 to-blue-600',     title: 'Instant Confirmation',    desc: 'Real-time availability powered by event-driven backend. Your slot is reserved the moment you confirm.' },
              { icon: CheckCircle, color: 'from-green-500 to-emerald-500', title: 'Fairness-Aware Matching', desc: 'Our algorithm ensures equitable provider exposure — not just the highest bidder gets bookings.' },
            ].map(item => {
              const Icon = item.icon
              return (
                <div key={item.title} className="card p-8 hover:shadow-xl transition-shadow duration-300 text-center group">
                  <div className={`w-14 h-14 bg-gradient-to-br ${item.color} rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-md group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          CTA STRIP
      ════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 px-4 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
            Ready to book a service?
          </h2>
          <p className="text-blue-100 text-lg mb-8">
            Try AI booking — most bookings complete in under 60 seconds.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleOpenAI}
              className="px-8 py-4 bg-white text-purple-700 rounded-xl font-bold text-sm hover:bg-purple-50 transition shadow-lg flex items-center justify-center gap-2"
            >
              <Bot className="w-5 h-5" /> Try AI Booking
            </button>
            <button
              onClick={() => navigate('/services')}
              className="px-8 py-4 bg-white/10 backdrop-blur border-2 border-white/40 text-white rounded-xl font-bold text-sm hover:bg-white/20 transition flex items-center justify-center gap-2"
            >
              <Search className="w-5 h-5" /> Browse Services
            </button>
          </div>
        </div>
      </section>

    </div>
  )
}