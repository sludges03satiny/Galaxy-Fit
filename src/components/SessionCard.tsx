import React from 'react'
import type { Session } from '../types/session'
import Tag from './Tag'

const DAY_VARIANT = {
  A: 'lime',
  B: 'blue',
  C: 'yellow',
  Z: 'neutral',
} as const

const FEEL_EMOJI: Record<string, string> = {
  neutral: '😐',
  good: '🙂',
  strong: '💪',
}

const PHASE_ABBREV: Record<string, string> = {
  accumulation: 'ACC',
  deload: 'DLD',
  intensification: 'INT',
  realization: 'REL',
}

interface Props {
  session: Session
  onClick?: () => void
  compact?: boolean
}

export const SessionCard: React.FC<Props> = ({ session, onClick, compact = false }) => {
  const date = new Date(session.date)
  const formattedDate = date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })
  const daysAgo = Math.floor(
    (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)
  )
  const daysAgoLabel =
    daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo}d ago`

  if (compact) {
    return (
      <div
        onClick={onClick}
        className={`flex items-center gap-2 py-2 ${onClick ? 'cursor-pointer group' : ''}`}
      >
        <Tag variant={DAY_VARIANT[session.dayType]} dot>
          {session.dayType}
        </Tag>
        <span className="font-mono text-mono-xs text-text-3 flex-1">{formattedDate}</span>
        {session.feel && (
          <span className="text-sm">{FEEL_EMOJI[session.feel]}</span>
        )}
      </div>
    )
  }

  return (
    <div
      onClick={onClick}
      className={[
        'bg-bg-2 border border-line rounded p-3',
        'transition-all duration-150',
        onClick
          ? 'cursor-pointer hover:border-line-2 hover:bg-bg-3 active:scale-[0.99]'
          : '',
      ].filter(Boolean).join(' ')}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Tag variant={DAY_VARIANT[session.dayType]} dot>
            Day {session.dayType}
          </Tag>
          <Tag variant="dim">
            {PHASE_ABBREV[session.phase] ?? session.phase}
          </Tag>
        </div>
        <div className="flex items-center gap-2">
          {session.feel && (
            <span className="text-base" title={session.feel}>
              {FEEL_EMOJI[session.feel]}
            </span>
          )}
          <span className="font-mono text-mono-xs text-text-3">{daysAgoLabel}</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-4 mt-2 flex-wrap">
        <span className="font-mono text-mono-xs text-text-3">
          <span className="text-text-2">{session.liftEntries.length}</span> lifts
        </span>
        <span className="font-mono text-mono-xs text-text-3">
          <span className="text-text-2">{session.skillEntries.length}</span> skills
        </span>
        {session.durationActualMinutes && (
          <span className="font-mono text-mono-xs text-text-3">
            <span className="text-text-2">{session.durationActualMinutes}</span> min
          </span>
        )}
        {session.peakBPM && (
          <span className="font-mono text-mono-xs text-accent-4">
            {session.peakBPM} BPM
          </span>
        )}
        <span className="font-mono text-mono-xs text-text-3 ml-auto">
          {formattedDate}
        </span>
      </div>

      {/* Optional note */}
      {session.notes && (
        <p className="mt-2 font-body text-xs text-text-2 line-clamp-1 italic">
          "{session.notes}"
        </p>
      )}
    </div>
  )
}

export default SessionCard
