import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, Trash2, ToggleLeft, ToggleRight,
  Loader2, CheckCircle, AlertCircle, Calendar,
  Clock, ChevronLeft, ChevronRight, X, Info, Zap,
} from 'lucide-react'
import { availabilityManagementApi } from '@/api/serviceApi'
import type { AvailabilitySlot } from '@/api/serviceApi'

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${period}`
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

// Time options: 7am–8pm in 30-min increments
const TIME_OPTIONS = Array.from({ length: 27 }, (_, i) => {
  const totalMins = 7 * 60 + i * 30
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  const label = `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
  const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
  return { label, value }
})

// Preset schedules for quick add
const PRESETS = [
  { label: 'Morning',   startTime: '08:00:00', endTime: '12:00:00' },
  { label: 'Afternoon', startTime: '12:00:00', endTime: '17:00:00' },
  { label: 'Full Day',  startTime: '08:00:00', endTime: '17:00:00' },
  { label: '9–5',       startTime: '09:00:00', endTime: '17:00:00' },
]

// ── Slot chip ─────────────────────────────────────────────────────────────────
function SlotChip({
  slot,
  onDelete,
  onToggle,
  loading,
}: {
  slot: AvailabilitySlot
  onDelete: () => void
  onToggle: () => void
  loading: boolean
}) {
  return (
    <div className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border-2 transition-all ${
      slot.isBooked
        ? 'border-blue-200 bg-blue-50'
        : slot.isAvailable
          ? 'border-green-200 bg-green-50'
          : 'border-gray-200 bg-gray-50 opacity-60'
    }`}>
      <div className="flex items-center gap-2">
        <Clock className={`w-3.5 h-3.5 flex-shrink-0 ${
          slot.isBooked ? 'text-blue-500' : slot.isAvailable ? 'text-green-500' : 'text-gray-400'
        }`} />
        <span className="text-sm font-semibold text-gray-800">
          {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
        </span>
        {slot.isBooked && (
          <span className="text-xs font-bold px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full">Booked</span>
        )}
        {!slot.isBooked && !slot.isAvailable && (
          <span className="text-xs text-gray-400">Blocked</span>
        )}
      </div>

      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
      ) : (
        <div className="flex items-center gap-1">
          {/* Toggle available/blocked (only if not booked) */}
          {!slot.isBooked && (
            <button
              onClick={onToggle}
              className="p-1 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
              title={slot.isAvailable ? 'Block this slot' : 'Unblock this slot'}
            >
              {slot.isAvailable
                ? <ToggleRight className="w-4 h-4 text-green-500" />
                : <ToggleLeft className="w-4 h-4" />
              }
            </button>
          )}
          {/* Delete (only if not booked) */}
          {!slot.isBooked && (
            <button
              onClick={onDelete}
              className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Delete slot"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Add slot panel ────────────────────────────────────────────────────────────
function AddSlotPanel({
  date,
  onAdd,
  onClose,
  saving,
  error,
}: {
  date: Date
  onAdd: (startTime: string, endTime: string) => void
  onClose: () => void
  saving: boolean
  error: string | null
}) {
  const [startTime, setStartTime] = useState('09:00:00')
  const [endTime,   setEndTime]   = useState('10:00:00')

  const dateLabel = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const selectCls = 'w-full px-3 py-2.5 text-sm border-2 border-gray-200 focus:border-purple-400 rounded-xl focus:outline-none bg-white cursor-pointer'

  return (
    <div className="card p-5 border-2 border-purple-200 bg-purple-50/40">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-bold text-purple-600 uppercase tracking-wide">Add Slot</p>
          <p className="text-sm font-bold text-gray-800 mt-0.5">{dateLabel}</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick presets */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-gray-500 mb-2">Quick presets</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => { setStartTime(p.startTime); setEndTime(p.endTime) }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border-2 transition-colors ${
                startTime === p.startTime && endTime === p.endTime
                  ? 'border-purple-500 bg-purple-100 text-purple-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-purple-300'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom time pickers */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Start Time</label>
          <select value={startTime} onChange={e => setStartTime(e.target.value)} className={selectCls}>
            {TIME_OPTIONS.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">End Time</label>
          <select value={endTime} onChange={e => setEndTime(e.target.value)} className={selectCls}>
            {TIME_OPTIONS.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      <button
        onClick={() => onAdd(startTime, endTime)}
        disabled={saving || startTime >= endTime}
        className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {saving
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding…</>
          : <><Plus className="w-4 h-4" /> Add Slot</>
        }
      </button>
      {startTime >= endTime && (
        <p className="text-xs text-red-500 text-center mt-2">End time must be after start time</p>
      )}
    </div>
  )
}

// ── Day column ────────────────────────────────────────────────────────────────
function DayColumn({
  date,
  slots,
  isSelected,
  onSelect,
  today,
}: {
  date: Date
  slots: AvailabilitySlot[]
  isSelected: boolean
  onSelect: () => void
  today: Date
}) {
  const isPast     = date < today && !isSameDay(date, today)
  const isToday    = isSameDay(date, today)
  const booked     = slots.filter(s => s.isBooked).length
  const available  = slots.filter(s => s.isAvailable && !s.isBooked).length
  const blocked    = slots.filter(s => !s.isAvailable && !s.isBooked).length

  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
  const dayNum  = date.getDate()

  return (
    <button
      onClick={onSelect}
      disabled={isPast}
      className={`flex-1 flex flex-col items-center py-3 px-2 rounded-2xl transition-all border-2 ${
        isPast
          ? 'opacity-30 cursor-not-allowed border-transparent'
          : isSelected
            ? 'border-purple-500 bg-purple-50 shadow-md scale-[1.03]'
            : isToday
              ? 'border-blue-300 bg-blue-50 hover:border-purple-400'
              : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/30'
      }`}
    >
      <span className={`text-xs font-bold uppercase tracking-wide ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>
        {isToday ? 'Today' : dayName}
      </span>
      <span className={`text-xl font-extrabold mt-0.5 ${
        isSelected ? 'text-purple-700' : isToday ? 'text-blue-700' : 'text-gray-800'
      }`}>
        {dayNum}
      </span>

      {/* Slot count indicators */}
      <div className="flex items-center gap-1 mt-2 flex-wrap justify-center">
        {available > 0 && (
          <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold flex items-center justify-center">{available}</span>
        )}
        {booked > 0 && (
          <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center">{booked}</span>
        )}
        {blocked > 0 && (
          <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold flex items-center justify-center">{blocked}</span>
        )}
        {slots.length === 0 && !isPast && (
          <span className="text-[10px] text-gray-300 font-medium">–</span>
        )}
      </div>
    </button>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ProviderAvailabilityPage() {
  const navigate = useNavigate()

  const today    = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d }, [])
  const maxDate  = addDays(today, 10)

  const [slots,        setSlots]        = useState<AvailabilitySlot[]>([])
  const [loading,      setLoading]      = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date>(today)
  const [weekStart,    setWeekStart]    = useState<Date>(today)
  const [showAddPanel, setShowAddPanel] = useState(false)
  const [addError,     setAddError]     = useState<string | null>(null)
  const [saving,       setSaving]       = useState(false)
  const [loadingSlot,  setLoadingSlot]  = useState<number | null>(null)
  const [successMsg,   setSuccessMsg]   = useState<string | null>(null)

  // Build 7-day window from weekStart
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
    .filter(d => d <= maxDate)

  // Load all slots once
  useEffect(() => {
    availabilityManagementApi.getMySlots()
      .then(setSlots)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Slots for the selected date
  const daySlots = useMemo(() =>
    slots
      .filter(s => s.slotDate === toDateStr(selectedDate))
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  , [slots, selectedDate])

  const flashSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 3000)
  }

  const handleAddSlot = async (startTime: string, endTime: string) => {
    setSaving(true)
    setAddError(null)
    try {
      const created = await availabilityManagementApi.createSlot({
        slotDate: toDateStr(selectedDate),
        startTime,
        endTime,
      })
      setSlots(prev => [...prev, created])
      setShowAddPanel(false)
      flashSuccess('Slot added — customers can now book this time.')
    } catch (err: any) {
      setAddError(err?.response?.data?.message ?? 'Failed to add slot. Check for overlaps.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (slot: AvailabilitySlot) => {
    setLoadingSlot(slot.id)
    try {
      await availabilityManagementApi.deleteSlot(slot.id)
      setSlots(prev => prev.filter(s => s.id !== slot.id))
      flashSuccess('Slot removed.')
    } catch (err: any) {
      // Booked slots can't be deleted — shouldn't show button but handle gracefully
      console.error(err)
    } finally {
      setLoadingSlot(null)
    }
  }

  const handleToggle = async (slot: AvailabilitySlot) => {
    setLoadingSlot(slot.id)
    try {
      const updated = await availabilityManagementApi.toggleSlot(slot.id, !slot.isAvailable)
      setSlots(prev => prev.map(s => s.id === updated.id ? updated : s))
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingSlot(null)
    }
  }

  // Bulk add: fill selected date with standard 1-hour slots
  const handleBulkAdd = async (preset: { startTime: string; endTime: string }) => {
    setSaving(true)
    setAddError(null)
    try {
      const created = await availabilityManagementApi.createSlot({
        slotDate: toDateStr(selectedDate),
        startTime: preset.startTime,
        endTime: preset.endTime,
      })
      setSlots(prev => [...prev, created])
      flashSuccess('Slot added!')
    } catch (err: any) {
      setAddError(err?.response?.data?.message ?? 'Slot overlaps with an existing one.')
      setTimeout(() => setAddError(null), 4000)
    } finally {
      setSaving(false)
    }
  }

  // Stats
  const totalAvailable = slots.filter(s => s.isAvailable && !s.isBooked).length
  const totalBooked    = slots.filter(s => s.isBooked).length
  const totalSlots     = slots.length

  return (
    <div className="min-h-screen bg-brand-surface pb-12">
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/provider/dashboard')}
            className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-extrabold text-gray-900">My Availability</h1>
            <p className="text-gray-500 text-sm mt-0.5">Manage when customers can book you</p>
          </div>
        </div>

        {/* ── Stats strip ─────────────────────────────────────────────── */}
        {!loading && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Open Slots',  value: totalAvailable, color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
              { label: 'Booked',      value: totalBooked,    color: 'text-blue-600',  bg: 'bg-blue-50 border-blue-200'  },
              { label: 'Total (10d)', value: totalSlots,     color: 'text-gray-700',  bg: 'bg-gray-50 border-gray-200'  },
            ].map(s => (
              <div key={s.label} className={`card p-4 border-2 ${s.bg} text-center`}>
                <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 font-medium mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── 10-day calendar strip ────────────────────────────────────── */}
        <div className="card p-4 mb-5">
          {/* Week navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setWeekStart(d => addDays(d, -7))}
              disabled={weekStart <= today}
              className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <p className="text-sm font-bold text-gray-700">
              {weekStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
            <button
              onClick={() => setWeekStart(d => addDays(d, 7))}
              disabled={addDays(weekStart, 7) > maxDate}
              className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day columns */}
          <div className="flex gap-2">
            {weekDays.map(date => (
              <DayColumn
                key={toDateStr(date)}
                date={date}
                slots={slots.filter(s => s.slotDate === toDateStr(date))}
                isSelected={isSameDay(date, selectedDate)}
                onSelect={() => { setSelectedDate(date); setShowAddPanel(false) }}
                today={today}
              />
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 flex-wrap">
            {[
              { color: 'bg-green-100 text-green-700', label: 'Available' },
              { color: 'bg-blue-100 text-blue-700',   label: 'Booked'    },
              { color: 'bg-gray-100 text-gray-500',   label: 'Blocked'   },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <span className={`w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center ${l.color}`}>n</span>
                <span className="text-xs text-gray-500">{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Success banner ───────────────────────────────────────────── */}
        {successMsg && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            <p className="text-sm text-green-700 font-medium">{successMsg}</p>
          </div>
        )}

        {/* ── Error banner ─────────────────────────────────────────────── */}
        {addError && !showAddPanel && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{addError}</p>
          </div>
        )}

        {/* ── Selected day detail ──────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-900">
                {isSameDay(selectedDate, today) ? 'Today' : selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {daySlots.length} slot{daySlots.length !== 1 ? 's' : ''} scheduled
              </p>
            </div>
            <button
              onClick={() => setShowAddPanel(v => !v)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                showAddPanel
                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  : 'btn-primary'
              }`}
            >
              {showAddPanel ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showAddPanel ? 'Cancel' : 'Add Slot'}
            </button>
          </div>

          {/* Add slot panel */}
          {showAddPanel && (
            <AddSlotPanel
              date={selectedDate}
              onAdd={handleAddSlot}
              onClose={() => setShowAddPanel(false)}
              saving={saving}
              error={addError}
            />
          )}

          {/* Slot list */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-7 h-7 text-purple-400 animate-spin" />
            </div>
          ) : daySlots.length === 0 ? (
            <div className="card p-10 text-center border-2 border-dashed border-gray-200">
              <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="font-semibold text-gray-500">No slots for this day</p>
              <p className="text-sm text-gray-400 mt-1 mb-4">Add a slot so customers can book you</p>
              <button
                onClick={() => setShowAddPanel(true)}
                className="btn-primary mx-auto inline-flex items-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" /> Add First Slot
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {daySlots.map(slot => (
                <SlotChip
                  key={slot.id}
                  slot={slot}
                  onDelete={() => handleDelete(slot)}
                  onToggle={() => handleToggle(slot)}
                  loading={loadingSlot === slot.id}
                />
              ))}
            </div>
          )}

          {/* Info callout */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-700 space-y-1">
              <p className="font-bold">How availability works</p>
              <p>Slots are available for the next 10 days. <strong>Green</strong> slots are open for booking. <strong>Blue</strong> slots are already booked — they can't be deleted. Use the toggle to temporarily block a slot without deleting it.</p>
            </div>
          </div>

          {/* Quick fill strip */}
          <div className="card p-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1.5 mb-3">
              <Zap className="w-3.5 h-3.5 text-purple-400" /> Quick Add for This Day
            </p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => handleBulkAdd(p)}
                  disabled={saving}
                  className="px-3 py-2 text-xs font-bold border-2 border-gray-200 rounded-xl hover:border-purple-400 hover:bg-purple-50 hover:text-purple-700 transition-colors disabled:opacity-50"
                >
                  + {p.label} ({formatTime(p.startTime)}–{formatTime(p.endTime)})
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}