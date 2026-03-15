import React, { useState } from 'react'
import { useAthleteProfile } from '../../hooks/useAthleteProfile'
import { useSessions } from '../../hooks/useSessions'
import { useReadiness } from '../../hooks/useReadiness'
import { ReadinessLight } from '../../components/ReadinessLight'
import { StatBlock } from '../../components/StatBlock'
import { Button } from '../../components/Button'
import { Tag } from '../../components/Tag'
import { SessionCard } from '../../components/SessionCard'
import { SessionWizard } from './SessionWizard'
import { OnboardingModal } from './OnboardingModal'
import type { AthleteProfile } from '../../types/athlete'

const DAY_LABELS: Record<string, string> = {
  A: 'LOWER BODY',
  B: 'UPPER PUSH',
  C: 'UPPER PULL',
}

const PHASE_TAG_VARIANT: Record<string, 'lime' | 'yellow' | 'blue' | 'red'> = {
  accumulation:    'lime',
  intensification: 'yellow',
  deload:          'blue',
  realization:     'red',
}

export const Dashboard: React.FC = () => {
  const { profile, update, isFirstRun } = useAthleteProfile()
  const { recentSessions, sessionsThisWeek, last, totalCount, refresh } = useSessions()
  const { readiness, sleepScore, stressScore, setSleepScore, setStressScore } = useReadiness()
  const [showWizard, setShowWizard] = useState(false)
  const [showReadinessEdit, setShowReadinessEdit] = useState(false)

  if (isFirstRun) {
    return (
      <OnboardingModal
        onComplete={(p: AthleteProfile) => update(p)}
      />
    )
  }

  if (showWizard) {
    return (
      <SessionWizard
        profile={profile}
        onComplete={() => {
          setShowWizard(false)
          refresh()
          const seq: Record<string, 'A' | 'B' | 'C'> = { A: 'B', B: 'C', C: 'A' }
          const next = seq[profile.blockPosition.nextDayType] ?? 'A'
          update({
            blockPosition: {
              ...profile.blockPosition,
              nextDayType: next,
              sessionCount: profile.blockPosition.sessionCount + 1,
            },
          })
        }}
        onCancel={() => setShowWizard(false)}
      />
    )
  }

  const { blockPosition } = profile
  const daysAgoLast = last
    ? Math.floor((Date.now() - new Date(last.date).getTime()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="space-y-6">

      {/* Athlete position */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-display-md text-text leading-none">{profile.name}</h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Tag variant="dim">Block {blockPosition.blockNumber}</Tag>
            <Tag variant="dim">Week {blockPosition.weekInBlock}</Tag>
            <Tag variant={PHASE_TAG_VARIANT[blockPosition.phase] ?? 'neutral'} dot>
              {blockPosition.phase.toUpperCase()}
            </Tag>
            {blockPosition.isDeloadWeek && <Tag variant="blue" dot>DELOAD</Tag>}
          </div>
        </div>
        <div className="text-right flex-shrink-0 bg-bg-2 border border-line rounded px-4 py-2">
          <p className="font-heading text-display-lg text-lime leading-none">{blockPosition.nextDayType}</p>
          <p className="font-mono text-mono-xs text-text-3 mt-0.5">NEXT</p>
          {DAY_LABELS[blockPosition.nextDayType] && (
            <p className="font-mono text-mono-xs text-text-2 mt-0.5">{DAY_LABELS[blockPosition.nextDayType]}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-0 bg-bg-2 border border-line rounded overflow-hidden">
        <div className="p-4 border-r border-line">
          <StatBlock value={sessionsThisWeek.length} label="This Week" accent="lime" size="sm" />
        </div>
        <div className="p-4 border-r border-line">
          <StatBlock value={totalCount} label="All Time" size="sm" />
        </div>
        <div className="p-4">
          <StatBlock
            value={daysAgoLast !== null ? (daysAgoLast === 0 ? 'Today' : `${daysAgoLast}d ago`) : '—'}
            label="Last Session"
            accent={daysAgoLast !== null && daysAgoLast > 7 ? 'yellow' : 'neutral'}
            size="sm"
          />
        </div>
      </div>

      {/* Readiness */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono uppercase tracking-widest text-mono-xs text-text-3">Today's Readiness</span>
          <button
            onClick={() => setShowReadinessEdit(v => !v)}
            className="font-mono text-mono-xs text-text-3 hover:text-lime transition-colors"
          >
            {showReadinessEdit ? 'Done' : 'Update ✎'}
          </button>
        </div>
        <ReadinessLight readiness={readiness} />
        {showReadinessEdit && (
          <div className="mt-3 bg-bg-3 rounded border border-line p-3 space-y-4 animate-fade-up">
            <SliderRow label="Sleep" value={sleepScore} onChange={setSleepScore} min={1} max={10} accentAt={7} dangerBelow={6} />
            <SliderRow label="Stress" value={stressScore} onChange={setStressScore} min={1} max={10} dangerAt={8} />
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="space-y-2">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          icon={<span className="text-base leading-none">▶</span>}
          onClick={() => setShowWizard(true)}
        >
          Start Session
        </Button>
        <p className="font-mono text-mono-xs text-text-3 text-center">
          Day {blockPosition.nextDayType}
          {DAY_LABELS[blockPosition.nextDayType] ? ` · ${DAY_LABELS[blockPosition.nextDayType]}` : ''}
          {' · '}
          {readiness.state === 'green' ? 'Full session' :
           readiness.state === 'yellow' ? 'Reduced RPE' : 'Skill + 1 lift only'}
        </p>
      </div>

      {/* Last session */}
      {last && (
        <div>
          <span className="font-mono uppercase tracking-widest text-mono-xs text-text-3">Last Session</span>
          <div className="mt-2"><SessionCard session={last} /></div>
        </div>
      )}

      {/* Recent */}
      {recentSessions.length > 1 && (
        <div>
          <span className="font-mono uppercase tracking-widest text-mono-xs text-text-3">Recent</span>
          <div className="mt-2 space-y-1">
            {recentSessions.slice(1).map(session => (
              <SessionCard key={session.id} session={session} compact />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {recentSessions.length === 0 && (
        <div className="bg-bg-2 border border-line rounded p-6 text-center">
          <p className="font-heading text-display-sm text-text-3">NO SESSIONS YET</p>
          <p className="font-body text-sm text-text-3 mt-2">Hit Start Session to begin.</p>
        </div>
      )}
    </div>
  )
}

interface SliderRowProps {
  label: string; value: number; onChange: (v: number) => void
  min: number; max: number; accentAt?: number; dangerAt?: number; dangerBelow?: number
}

const SliderRow: React.FC<SliderRowProps> = ({ label, value, onChange, min, max, accentAt, dangerAt, dangerBelow }) => {
  const isGood = accentAt !== undefined && value >= accentAt
  const isDanger = (dangerAt !== undefined && value >= dangerAt) || (dangerBelow !== undefined && value < dangerBelow)
  const valueColor = isDanger ? 'text-accent-3' : isGood ? 'text-lime' : 'text-text-2'
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono uppercase tracking-widest text-mono-xs text-text-3 w-14 flex-shrink-0">{label}</span>
      <input type="range" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))} className="flex-1 cursor-pointer" />
      <span className={`font-mono text-mono-sm w-5 text-right flex-shrink-0 ${valueColor}`}>{value}</span>
    </div>
  )
}

export default Dashboard
