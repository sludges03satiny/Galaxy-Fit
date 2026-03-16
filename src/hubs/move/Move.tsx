import React, { useState, useRef } from 'react'
import { getActivities, saveActivity } from '../../lib/storage'
import { categorizeActivity, INTERVAL_LIBRARY } from '../../types/activity'
import type { ZActivity, ActivityType } from '../../types/activity'

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTIVITY_TYPES: ActivityType[] = [
  'bike', 'run', 'hike', 'ski', 'swim', 'yoga', 'sport', 'gym-other', 'other',
]

const ACTIVITY_ICONS: Record<ActivityType, string> = {
  bike: '🚵', run: '🏃', hike: '🥾', ski: '⛷️',
  swim: '🏊', yoga: '🧘', sport: '⚽', 'gym-other': '🏋️', other: '◎',
}

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  bike: 'Bike', run: 'Run', hike: 'Hike', ski: 'Ski',
  swim: 'Swim', yoga: 'Yoga', sport: 'Sport', 'gym-other': 'Gym', other: 'Other',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getThisMonthRange(): { from: string; to: string } {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const to = now.toISOString().split('T')[0]
  return { from, to }
}

function getRolling4WeeksActivities(activities: ZActivity[]): ZActivity[] {
  const now = new Date()
  const cutoff = new Date(now)
  cutoff.setDate(now.getDate() - 28)
  const from = cutoff.toISOString().split('T')[0]
  return activities.filter(a => a.date >= from)
}

function avgMinutesPerWeek(activities: ZActivity[]): number {
  const rolling = getRolling4WeeksActivities(activities)
  const total = rolling.reduce((sum, a) => sum + a.durationMinutes, 0)
  return Math.round(total / 4)
}

function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface StatBlockProps {
  value: number | string
  label: string
  accent?: 'lime' | 'yellow' | 'blue' | 'default'
}

const StatBlock: React.FC<StatBlockProps> = ({ value, label, accent = 'default' }) => {
  const colorMap = {
    lime: 'text-lime',
    yellow: 'text-yellow',
    blue: 'text-blue',
    default: 'text-text',
  }
  return (
    <div className="flex flex-col gap-0.5">
      <span className={`font-heading text-3xl leading-none ${colorMap[accent]}`}>{value}</span>
      <span className="font-mono uppercase tracking-widest text-[10px] text-text-3">{label}</span>
    </div>
  )
}

interface BadgeProps {
  variant: 'lime' | 'blue' | 'neutral'
  children: React.ReactNode
}

const Badge: React.FC<BadgeProps> = ({ variant, children }) => {
  const styles = {
    lime: 'bg-lime/10 text-lime border-lime/30',
    blue: 'bg-blue/10 text-blue border-blue/30',
    neutral: 'bg-bg border-line text-text-3',
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border font-mono text-[10px] uppercase tracking-widest ${styles[variant]}`}>
      {variant !== 'neutral' && (
        <span className={`w-1 h-1 rounded-full ${variant === 'lime' ? 'bg-lime' : 'bg-blue'}`} />
      )}
      {children}
    </span>
  )
}

// ─── Activity Row ─────────────────────────────────────────────────────────────

const ActivityRow: React.FC<{ activity: ZActivity }> = ({ activity: a }) => {
  const [expanded, setExpanded] = useState(false)

  return (
    <button
      onClick={() => setExpanded(v => !v)}
      className="w-full text-left bg-bg-2 border border-line rounded overflow-hidden transition-colors hover:border-line-2 focus:outline-none"
    >
      <div className="flex items-center gap-3 px-3 py-2.5">
        <span className="text-xl w-7 text-center flex-shrink-0">{ACTIVITY_ICONS[a.type]}</span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-body text-sm text-text capitalize">{ACTIVITY_LABELS[a.type]}</span>
            {a.countsAsCardio && <Badge variant="lime">Cardio</Badge>}
            {a.countsAsMobility && <Badge variant="blue">Mobility</Badge>}
          </div>
          <p className="font-mono text-[11px] text-text-3 mt-0.5">
            {a.durationMinutes} min
            {a.peakBPM ? ` · ${a.peakBPM} bpm` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="font-mono text-[11px] text-text-3">{formatDate(a.date)}</span>
          <span className={`font-mono text-text-3 text-xs transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
            ▾
          </span>
        </div>
      </div>

      {expanded && a.notes && (
        <div className="px-3 pb-2.5 pt-0 border-t border-line">
          <p className="font-body text-xs text-text-2 mt-2">{a.notes}</p>
        </div>
      )}
      {expanded && !a.notes && (
        <div className="px-3 pb-2.5 pt-0 border-t border-line">
          <p className="font-mono text-[11px] text-text-3 mt-2 italic">No note</p>
        </div>
      )}
    </button>
  )
}

// ─── Log Sheet ────────────────────────────────────────────────────────────────

interface LogSheetProps {
  onClose: () => void
  onSaved: () => void
}

const LogSheet: React.FC<LogSheetProps> = ({ onClose, onSaved }) => {
  const [step, setStep] = useState<'type' | 'details'>('type')
  const [selectedType, setSelectedType] = useState<ActivityType | null>(null)
  const [duration, setDuration] = useState('')
  const [peakBPM, setPeakBPM] = useState('')
  const [notes, setNotes] = useState('')
  const sheetRef = useRef<HTMLDivElement>(null)

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  const handleTypeSelect = (type: ActivityType) => {
    setSelectedType(type)
    setStep('details')
  }

  const handleBack = () => {
    setStep('type')
  }

  const durationNum = parseInt(duration, 10)
  const peakBPMNum = peakBPM ? parseInt(peakBPM, 10) : undefined
  const previewCounted = selectedType && durationNum > 0
    ? categorizeActivity(selectedType, durationNum, peakBPMNum)
    : null

  const canSave = selectedType && durationNum > 0 && !isNaN(durationNum)

  const handleSave = () => {
    if (!selectedType || !canSave) return
    const counted = categorizeActivity(selectedType, durationNum, peakBPMNum)
    const activity: ZActivity = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      type: selectedType,
      durationMinutes: durationNum,
      peakBPM: peakBPMNum,
      notes: notes.trim() || undefined,
      ...counted,
    }
    saveActivity(activity)
    onSaved()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: 'rgba(10,10,8,0.8)' }}
      onClick={handleBackdrop}
    >
      <div
        ref={sheetRef}
        className="w-full max-w-lg bg-bg border border-line rounded-t-2xl overflow-hidden"
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Sheet handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-line" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-line">
          <div className="flex items-center gap-3">
            {step === 'details' && (
              <button
                onClick={handleBack}
                className="font-mono text-xs text-text-3 hover:text-text transition-colors"
              >
                ← Back
              </button>
            )}
            <h2 className="font-heading text-xl text-text leading-none">
              {step === 'type' ? 'LOG ACTIVITY' : `${ACTIVITY_ICONS[selectedType!]} ${ACTIVITY_LABELS[selectedType!].toUpperCase()}`}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="font-mono text-xs text-text-3 hover:text-text transition-colors w-6 h-6 flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* Step 1 — Type selection */}
        {step === 'type' && (
          <div className="p-4">
            <p className="font-mono uppercase tracking-widest text-[10px] text-text-3 mb-3">
              What did you do?
            </p>
            <div className="grid grid-cols-3 gap-2">
              {ACTIVITY_TYPES.map(type => (
                <button
                  key={type}
                  onClick={() => handleTypeSelect(type)}
                  className="flex flex-col items-center gap-2 px-2 py-4 rounded border border-line bg-bg-2 hover:border-lime hover:bg-accent-dim transition-colors group focus:outline-none focus:border-lime"
                >
                  <span className="text-2xl">{ACTIVITY_ICONS[type]}</span>
                  <span className="font-mono text-[11px] uppercase tracking-wider text-text-2 group-hover:text-lime transition-colors">
                    {ACTIVITY_LABELS[type]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2 — Details */}
        {step === 'details' && selectedType && (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-mono uppercase tracking-widest text-[10px] text-text-3 block mb-1.5">
                  Duration (min)
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={duration}
                  onChange={e => setDuration(e.target.value)}
                  placeholder="60"
                  autoFocus
                  className="w-full bg-bg-2 border border-line rounded px-3 py-2.5 font-mono text-sm text-text placeholder-text-3 focus:outline-none focus:border-lime transition-colors"
                />
              </div>
              <div>
                <label className="font-mono uppercase tracking-widest text-[10px] text-text-3 block mb-1.5">
                  Peak BPM <span className="normal-case tracking-normal">(optional)</span>
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={peakBPM}
                  onChange={e => setPeakBPM(e.target.value)}
                  placeholder="—"
                  className="w-full bg-bg-2 border border-line rounded px-3 py-2.5 font-mono text-sm text-text placeholder-text-3 focus:outline-none focus:border-lime transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="font-mono uppercase tracking-widest text-[10px] text-text-3 block mb-1.5">
                Note <span className="normal-case tracking-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add a note..."
                className="w-full bg-bg-2 border border-line rounded px-3 py-2.5 font-body text-sm text-text placeholder-text-3 focus:outline-none focus:border-lime transition-colors"
              />
            </div>

            {/* Preview badge */}
            {previewCounted && (
              <div className="flex gap-2 items-center min-h-[24px]">
                {previewCounted.countsAsCardio && <Badge variant="lime">Counts as Cardio</Badge>}
                {previewCounted.countsAsMobility && <Badge variant="blue">Counts as Mobility</Badge>}
                {previewCounted.isFullOutdoorSession && !previewCounted.countsAsCardio && !previewCounted.countsAsMobility && (
                  <Badge variant="neutral">Full session logged</Badge>
                )}
                {!previewCounted.countsAsCardio && !previewCounted.countsAsMobility && !previewCounted.isFullOutdoorSession && durationNum > 0 && (
                  <Badge variant="neutral">Logged only</Badge>
                )}
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={!canSave}
              className={[
                'w-full py-3 rounded font-heading text-lg leading-none transition-all',
                canSave
                  ? 'bg-lime text-bg hover:bg-lime/90 active:scale-[0.98]'
                  : 'bg-bg-2 border border-line text-text-3 cursor-not-allowed',
              ].join(' ')}
            >
              SAVE ACTIVITY
            </button>
          </div>
        )}

        {/* Safe area spacer for mobile */}
        <div className="h-4" />
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const Move: React.FC = () => {
  const [activities, setActivities] = useState<ZActivity[]>(() =>
    getActivities().sort((a, b) => b.date.localeCompare(a.date))
  )
  const [showLogSheet, setShowLogSheet] = useState(false)

  const refresh = () => {
    setActivities(getActivities().sort((a, b) => b.date.localeCompare(a.date)))
  }

  // Stat calculations
  const { from: monthFrom, to: monthTo } = getThisMonthRange()
  const thisMonth = activities.filter(a => a.date >= monthFrom && a.date <= monthTo)
  const cardioThisMonth = thisMonth.filter(a => a.countsAsCardio).length
  const mobilityThisMonth = thisMonth.filter(a => a.countsAsMobility).length
  const avgMin = avgMinutesPerWeek(activities)

  const recentActivities = activities.slice(0, 10)

  return (
    <>
      <div className="space-y-6 pb-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <h1 className="font-heading text-display-md text-text leading-none">MOVE</h1>
          <span className="font-mono text-[10px] text-text-3 uppercase tracking-widest pt-1">Z Days</span>
        </div>

        {/* Section 1 — Stats */}
        <div className="grid grid-cols-3 gap-0 bg-bg-2 border border-line rounded overflow-hidden">
          <div className="p-4 border-r border-line">
            <StatBlock value={cardioThisMonth} label="Cardio / mo" accent="lime" />
          </div>
          <div className="p-4 border-r border-line">
            <StatBlock value={mobilityThisMonth} label="Mobility / mo" accent="blue" />
          </div>
          <div className="p-4">
            <StatBlock value={avgMin} label="Avg min/wk" />
          </div>
        </div>

        {/* Section 2 — Log button */}
        <button
          onClick={() => setShowLogSheet(true)}
          className="w-full py-4 rounded border border-lime/40 bg-lime/5 hover:bg-lime/10 hover:border-lime/70 transition-all active:scale-[0.99] group focus:outline-none"
        >
          <span className="font-heading text-xl text-lime leading-none group-hover:tracking-wider transition-all">
            + LOG ACTIVITY
          </span>
        </button>

        {/* Section 3 — Recent activity feed */}
        {recentActivities.length > 0 ? (
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="font-mono uppercase tracking-widest text-[10px] text-text-3">
                Recent Activity
              </span>
              <span className="flex-1 h-px bg-line" />
              {activities.length > 10 && (
                <span className="font-mono text-[10px] text-text-3">{activities.length} total</span>
              )}
            </div>
            <div className="space-y-1.5">
              {recentActivities.map(a => (
                <ActivityRow key={a.id} activity={a} />
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-bg-2 border border-line rounded p-6 text-center">
            <p className="font-heading text-display-sm text-text-3">NO ACTIVITIES YET</p>
            <p className="font-body text-sm text-text-3 mt-2 max-w-xs mx-auto">
              Log a ride, run, hike, or any free movement here. Z days never interrupt your A/B/C sequence.
            </p>
          </div>
        )}

        {/* Section 4 — Interval Library */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="font-mono uppercase tracking-widest text-[10px] text-text-3">
              Interval Library
            </span>
            <span className="flex-1 h-px bg-line" />
          </div>
          <div className="space-y-2">
            {INTERVAL_LIBRARY.map(protocol => (
              <div key={protocol.id} className="bg-bg-2 border border-line rounded p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-heading text-xl text-text leading-none">
                      {protocol.name}
                    </p>
                    <p className="font-body text-xs text-text-2 mt-1 pr-2">
                      {protocol.description}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <Badge variant="neutral">{protocol.durationMinutes} min</Badge>
                    <span className="font-mono text-[10px] text-yellow uppercase tracking-widest">
                      {protocol.targetZone}
                    </span>
                  </div>
                </div>
                <p className="font-mono text-[10px] text-text-3 mt-2 uppercase tracking-widest">
                  {protocol.blockPhase}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Log sheet overlay */}
      {showLogSheet && (
        <LogSheet
          onClose={() => setShowLogSheet(false)}
          onSaved={refresh}
        />
      )}
    </>
  )
}

export default Move
