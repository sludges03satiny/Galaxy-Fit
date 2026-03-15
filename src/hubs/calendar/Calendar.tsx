import React, { useState } from 'react'
import { useSessions } from '../../hooks/useSessions'
import { SessionCard } from '../../components/SessionCard'
import { StatBlock } from '../../components/StatBlock'
import { Tag } from '../../components/Tag'
import type { Session } from '../../types/session'

const MONTH_NAMES = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec',
]

const DAY_COLORS: Record<string, string> = {
  A: '#c8f050',
  B: '#50c8f0',
  C: '#f0c828',
  Z: '#9e9b8e',
}

export const Calendar: React.FC = () => {
  const { sessions, sessionsByDate } = useSessions()
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)

  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())

  // Build a map of date string → sessions
  const sessionsByDateMap = new Map<string, Session[]>()
  for (const s of sessions) {
    const arr = sessionsByDateMap.get(s.date) ?? []
    arr.push(s)
    sessionsByDateMap.set(s.date, arr)
  }

  // Calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1)
  const lastDay = new Date(viewYear, viewMonth + 1, 0)
  const startOffset = firstDay.getDay() // 0=Sun

  const days: (null | number)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: lastDay.getDate() }, (_, i) => i + 1),
  ]

  const pad = (n: number) => String(n).padStart(2, '0')
  const dateStr = (d: number) =>
    `${viewYear}-${pad(viewMonth + 1)}-${pad(d)}`

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  // Stats
  const thisMonthSessions = sessions.filter(s => {
    const d = new Date(s.date)
    return d.getFullYear() === viewYear && d.getMonth() === viewMonth
  })

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-display-md text-text leading-none">CALENDAR</h1>

      {/* Month stats */}
      <div className="grid grid-cols-3 gap-0 bg-bg-2 border border-line rounded overflow-hidden">
        <div className="p-3 border-r border-line">
          <StatBlock value={thisMonthSessions.length} label="Sessions" size="sm" />
        </div>
        <div className="p-3 border-r border-line">
          <StatBlock
            value={thisMonthSessions.filter(s => s.feel === 'strong').length}
            label="Strong"
            accent="lime"
            size="sm"
          />
        </div>
        <div className="p-3">
          <StatBlock
            value={sessions.length}
            label="All Time"
            accent="neutral"
            size="sm"
          />
        </div>
      </div>

      {/* Month navigation */}
      <div className="bg-bg-2 border border-line rounded overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-line">
          <button
            onClick={prevMonth}
            className="text-text-3 hover:text-lime transition-colors font-mono text-sm w-8 h-8 flex items-center justify-center"
          >
            ‹
          </button>
          <span className="font-heading text-display-sm text-text tracking-widest">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <button
            onClick={nextMonth}
            className="text-text-3 hover:text-lime transition-colors font-mono text-sm w-8 h-8 flex items-center justify-center"
          >
            ›
          </button>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 border-b border-line">
          {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
            <div key={d} className="text-center py-2 font-mono text-mono-xs text-text-3">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            if (day === null) {
              return <div key={`empty-${i}`} className="aspect-square border-r border-b border-line last:border-r-0" />
            }
            const ds = dateStr(day)
            const daySessions = sessionsByDateMap.get(ds) ?? []
            const isToday =
              day === now.getDate() &&
              viewMonth === now.getMonth() &&
              viewYear === now.getFullYear()

            return (
              <div
                key={ds}
                onClick={() => daySessions.length > 0 && setSelectedSession(daySessions[0])}
                className={[
                  'aspect-square border-r border-b border-line last:border-r-0',
                  'flex flex-col items-center justify-between p-1',
                  daySessions.length > 0 ? 'cursor-pointer hover:bg-bg-3' : '',
                ].join(' ')}
              >
                <span
                  className={[
                    'font-mono text-mono-xs w-5 h-5 flex items-center justify-center rounded-full',
                    isToday ? 'bg-lime text-bg font-medium' : 'text-text-3',
                  ].join(' ')}
                >
                  {day}
                </span>
                {/* Session dots */}
                {daySessions.length > 0 && (
                  <div className="flex gap-0.5 pb-0.5">
                    {daySessions.map(s => (
                      <span
                        key={s.id}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: DAY_COLORS[s.dayType] ?? '#9e9b8e' }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Selected session detail */}
      {selectedSession && (
        <div className="animate-fade-up">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono uppercase tracking-widest text-mono-xs text-text-3">
              Session Detail
            </span>
            <button
              onClick={() => setSelectedSession(null)}
              className="font-mono text-mono-xs text-text-3 hover:text-text"
            >
              ✕ Close
            </button>
          </div>
          <SessionCard session={selectedSession} />
        </div>
      )}

      {/* Recent list */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <span className="font-mono uppercase tracking-widest text-mono-xs text-text-3">
            History
          </span>
          <span className="flex-1 h-px bg-line" />
        </div>
        {sessionsByDate.length === 0 ? (
          <p className="font-mono text-mono-xs text-text-3 text-center py-8">
            No sessions logged yet.
          </p>
        ) : (
          <div className="space-y-2">
            {sessionsByDate.slice(0, 20).map(s => (
              <SessionCard
                key={s.id}
                session={s}
                onClick={() => setSelectedSession(s)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex gap-3 flex-wrap">
        {Object.entries(DAY_COLORS).map(([day, color]) => (
          <div key={day} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="font-mono text-mono-xs text-text-3">Day {day}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Calendar
