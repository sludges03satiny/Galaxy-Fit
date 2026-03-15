import React, { useState } from 'react'
import { getActivities, saveActivity } from '../../lib/storage'
import { categorizeActivity, INTERVAL_LIBRARY } from '../../types/activity'
import type { ZActivity, ActivityType } from '../../types/activity'
import { Button } from '../../components/Button'
import { Tag } from '../../components/Tag'
import { StatBlock } from '../../components/StatBlock'

const ACTIVITY_TYPES: ActivityType[] = [
  'bike','run','hike','ski','swim','yoga','sport','gym-other','other'
]

const ACTIVITY_ICONS: Record<ActivityType, string> = {
  bike: '🚵', run: '🏃', hike: '🥾', ski: '⛷️',
  swim: '🏊', yoga: '🧘', sport: '⚽', 'gym-other': '🏋️', other: '◎'
}

const CATEGORY_COLORS: Record<string, 'lime' | 'blue' | 'neutral'> = {
  cardio: 'lime', mobility: 'blue', 'logged-only': 'neutral'
}

export const Move: React.FC = () => {
  const [activities, setActivities] = useState<ZActivity[]>(() =>
    getActivities().sort((a, b) => b.date.localeCompare(a.date))
  )
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<{
    type: ActivityType; durationMinutes: number; peakBPM: string; notes: string
  }>({ type: 'bike', durationMinutes: 60, peakBPM: '', notes: '' })

  const handleSave = () => {
    const peakBPM = form.peakBPM ? Number(form.peakBPM) : undefined
    const counted = categorizeActivity(form.type, form.durationMinutes, peakBPM)
    const activity: ZActivity = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      type: form.type,
      durationMinutes: form.durationMinutes,
      peakBPM,
      notes: form.notes || undefined,
      ...counted,
    }
    saveActivity(activity)
    setActivities(getActivities().sort((a, b) => b.date.localeCompare(a.date)))
    setShowForm(false)
    setForm({ type: 'bike', durationMinutes: 60, peakBPM: '', notes: '' })
  }

  const thisWeek = activities.filter(a => {
    const d = new Date(a.date)
    const now = new Date()
    const weekAgo = new Date(now)
    weekAgo.setDate(now.getDate() - 7)
    return d >= weekAgo
  })

  const cardioThisWeek = thisWeek.filter(a => a.countsAsCardio).length
  const mobilityThisWeek = thisWeek.filter(a => a.countsAsMobility).length
  const minutesThisWeek = thisWeek.reduce((sum, a) => sum + a.durationMinutes, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <h1 className="font-heading text-display-md text-text leading-none">MOVE</h1>
        <Button variant="secondary" size="sm" onClick={() => setShowForm(v => !v)}>
          {showForm ? 'Cancel' : '+ Log Activity'}
        </Button>
      </div>

      {/* This week stats */}
      <div className="grid grid-cols-3 gap-0 bg-bg-2 border border-line rounded overflow-hidden">
        <div className="p-3 border-r border-line">
          <StatBlock value={cardioThisWeek} label="Cardio" accent="lime" size="sm" />
        </div>
        <div className="p-3 border-r border-line">
          <StatBlock value={mobilityThisWeek} label="Mobility" accent="blue" size="sm" />
        </div>
        <div className="p-3">
          <StatBlock value={minutesThisWeek} label="Min/Week" size="sm" />
        </div>
      </div>

      {/* Log form */}
      {showForm && (
        <div className="bg-bg-2 border border-line rounded p-4 space-y-4 animate-fade-up">
          {/* Activity type grid */}
          <div>
            <label className="font-mono uppercase tracking-widest text-mono-xs text-text-3 block mb-2">
              Activity Type
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {ACTIVITY_TYPES.map(type => (
                <button
                  key={type}
                  onClick={() => setForm(f => ({ ...f, type }))}
                  className={[
                    'flex items-center gap-1.5 px-2 py-2 rounded border text-left transition-colors',
                    'font-mono text-mono-xs',
                    form.type === type
                      ? 'border-lime bg-accent-dim text-lime'
                      : 'border-line text-text-3 hover:border-line-2 hover:text-text-2',
                  ].join(' ')}
                >
                  <span>{ACTIVITY_ICONS[type]}</span>
                  <span className="capitalize">{type}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-mono uppercase tracking-widest text-mono-xs text-text-3 block mb-1">
                Duration (min)
              </label>
              <input
                type="number"
                value={form.durationMinutes}
                onChange={e => setForm(f => ({ ...f, durationMinutes: Number(e.target.value) }))}
                className="w-full bg-bg border border-line rounded px-3 py-2 font-mono text-sm text-text focus:outline-none focus:border-lime"
              />
            </div>
            <div>
              <label className="font-mono uppercase tracking-widest text-mono-xs text-text-3 block mb-1">
                Peak BPM (optional)
              </label>
              <input
                type="number"
                value={form.peakBPM}
                placeholder="—"
                onChange={e => setForm(f => ({ ...f, peakBPM: e.target.value }))}
                className="w-full bg-bg border border-line rounded px-3 py-2 font-mono text-sm text-text focus:outline-none focus:border-lime"
              />
            </div>
          </div>

          {/* Preview counting */}
          {form.durationMinutes > 0 && (() => {
            const peak = form.peakBPM ? Number(form.peakBPM) : undefined
            const { countsAsCardio, countsAsMobility } = categorizeActivity(form.type, form.durationMinutes, peak)
            return (
              <div className="flex gap-2">
                {countsAsCardio && <Tag variant="lime" dot>Counts as Cardio</Tag>}
                {countsAsMobility && <Tag variant="blue" dot>Counts as Mobility</Tag>}
                {!countsAsCardio && !countsAsMobility && (
                  <Tag variant="dim">Logged only</Tag>
                )}
              </div>
            )
          })()}

          <div>
            <label className="font-mono uppercase tracking-widest text-mono-xs text-text-3 block mb-1">
              Note (optional)
            </label>
            <input
              type="text"
              value={form.notes}
              placeholder="Add a note..."
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full bg-bg border border-line rounded px-3 py-2 font-body text-sm text-text focus:outline-none focus:border-lime"
            />
          </div>

          <Button variant="primary" fullWidth onClick={handleSave}>
            Log Activity
          </Button>
        </div>
      )}

      {/* Interval library */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <span className="font-mono uppercase tracking-widest text-mono-xs text-text-3">
            Interval Library
          </span>
          <span className="flex-1 h-px bg-line" />
        </div>
        <div className="space-y-2">
          {INTERVAL_LIBRARY.map(protocol => (
            <div key={protocol.id} className="bg-bg-2 border border-line rounded p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-heading text-display-sm text-text leading-none">
                    {protocol.name}
                  </p>
                  <p className="font-body text-xs text-text-2 mt-1">{protocol.description}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <Tag variant="neutral">{protocol.durationMinutes} min</Tag>
                  <Tag variant="yellow">{protocol.targetZone}</Tag>
                </div>
              </div>
              <p className="font-mono text-mono-xs text-text-3 mt-2">{protocol.blockPhase}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Activity log */}
      {activities.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="font-mono uppercase tracking-widest text-mono-xs text-text-3">
              Activity Log
            </span>
            <span className="flex-1 h-px bg-line" />
          </div>
          <div className="space-y-2">
            {activities.slice(0, 15).map(a => (
              <div key={a.id} className="bg-bg-2 border border-line rounded p-3 flex items-center gap-3">
                <span className="text-xl">{ACTIVITY_ICONS[a.type]}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-body text-sm text-text capitalize">{a.type}</p>
                    <Tag variant={CATEGORY_COLORS[a.category]} dot>
                      {a.category === 'logged-only' ? 'Logged' : a.category}
                    </Tag>
                  </div>
                  <p className="font-mono text-mono-xs text-text-3 mt-0.5">
                    {a.durationMinutes} min
                    {a.peakBPM ? ` · ${a.peakBPM} BPM` : ''}
                    {a.notes ? ` · ${a.notes}` : ''}
                  </p>
                </div>
                <span className="font-mono text-mono-xs text-text-3 flex-shrink-0">{a.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activities.length === 0 && (
        <div className="bg-bg-2 border border-line rounded p-6 text-center">
          <p className="font-heading text-display-sm text-text-3">NO ACTIVITIES YET</p>
          <p className="font-body text-sm text-text-3 mt-2">
            Log a ride, run, hike, or any free movement here. Z days never interrupt your A/B/C sequence.
          </p>
        </div>
      )}
    </div>
  )
}

export default Move
