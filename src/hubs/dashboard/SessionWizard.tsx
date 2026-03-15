import React, { useState, useEffect, useRef } from 'react'
import type { TimeTier, SessionFeel } from '../../types/session'
import type { AthleteProfile } from '../../types/athlete'
import { computeReadiness } from '../../types/athlete'
import { useSessionWizard } from '../../hooks/useSessionWizard'
import type { ActiveLiftState, ActiveSkillState } from '../../hooks/useSessionWizard'
import { ReadinessLight } from '../../components/ReadinessLight'
import { Button } from '../../components/Button'
import { Tag } from '../../components/Tag'
import { SUGGESTION_CONFIG, formatWeight } from '../../lib/doubleProgression'

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_LABELS: Record<string, string> = {
  A: 'Lower Body', B: 'Upper Push', C: 'Upper Pull',
}

const TIME_TIERS: { value: TimeTier; label: string; desc: string }[] = [
  { value: 30, label: '30', desc: 'Skill + 1 lift' },
  { value: 45, label: '45', desc: '2 lifts + skill' },
  { value: 60, label: '60', desc: 'Full session' },
  { value: 90, label: '90', desc: 'Full + cardio' },
]

const FEEL_OPTIONS: { value: SessionFeel; emoji: string; label: string }[] = [
  { value: 'neutral', emoji: '😐', label: 'Okay' },
  { value: 'good',    emoji: '🙂', label: 'Good' },
  { value: 'strong',  emoji: '💪', label: 'Strong' },
]

const NOISE_BG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E")`

// ─── Root component ───────────────────────────────────────────────────────────

interface Props {
  profile: AthleteProfile
  onComplete: () => void
  onCancel: () => void
}

export const SessionWizard: React.FC<Props> = ({ profile, onComplete, onCancel }) => {
  const wizard = useSessionWizard(profile)
  const { state } = wizard

  if (state.step === 'complete') {
    return (
      <CompleteScreen
        profile={profile}
        onDone={() => { wizard.reset(); onComplete() }}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg">
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[999]" style={{ backgroundImage: NOISE_BG }} />

      {/* Header */}
      <header className="flex-shrink-0 h-[52px] flex items-center justify-between px-4 border-b border-line bg-bg/95 backdrop-blur z-10">
        <div className="flex items-center gap-3">
          <span className="font-heading text-lg tracking-widest text-lime">SESSION</span>
          <Tag variant="dim">
            Day {profile.blockPosition.nextDayType}
            {DAY_LABELS[profile.blockPosition.nextDayType]
              ? ` · ${DAY_LABELS[profile.blockPosition.nextDayType]}`
              : ''}
          </Tag>
        </div>
        {state.step === 'active'
          ? <ElapsedTimer startedAt={state.startedAt} />
          : (
            <button
              onClick={onCancel}
              className="font-mono text-mono-xs text-text-3 hover:text-text transition-colors"
            >
              Cancel
            </button>
          )
        }
      </header>

      {/* Progress bar */}
      {state.step === 'active' && (
        <div className="flex-shrink-0 h-0.5 bg-bg-3 z-10">
          <div
            className="h-full bg-lime transition-all duration-500"
            style={{ width: `${wizard.progressPct}%` }}
          />
        </div>
      )}

      {/* Page content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[700px] mx-auto px-4 py-6">
          {state.step === 'readiness' && (
            <ReadinessStep
              onConfirm={(sleep, stress) => wizard.confirmReadiness(sleep, stress)}
              onCancel={onCancel}
            />
          )}
          {state.step === 'time' && (
            <TimeStep
              readinessSleep={state.sleepScore}
              readinessStress={state.stressScore}
              onSelect={tier => wizard.startSession(tier)}
              onBack={() => wizard.confirmReadiness(state.sleepScore, state.stressScore)}
            />
          )}
          {state.step === 'active' && state.template && (
            <ActiveStep wizard={wizard} />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Step 1: Readiness ────────────────────────────────────────────────────────

interface ReadinessStepProps {
  onConfirm: (sleep: number, stress: number) => void
  onCancel: () => void
}

const ReadinessStep: React.FC<ReadinessStepProps> = ({ onConfirm }) => {
  const [sleep, setSleep] = useState(7)
  const [stress, setStress] = useState(5)
  const readiness = computeReadiness({ sleepScore: sleep, stressScore: stress })

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h2 className="font-heading text-display-md text-text leading-none">HOW ARE YOU FEELING?</h2>
        <p className="font-mono text-mono-xs text-text-3 mt-1">This calibrates today's session intensity.</p>
      </div>

      <ReadinessLight readiness={readiness} />

      <div className="space-y-5 bg-bg-2 border border-line rounded p-4">
        <ScoreSlider
          label="Sleep quality"
          value={sleep}
          min={1} max={10}
          onChange={setSleep}
          goodAt={7}
          dangerBelow={6}
        />
        <ScoreSlider
          label="Stress level"
          value={stress}
          min={1} max={10}
          onChange={setStress}
          goodAt={5}
          goodBelow
          dangerAt={8}
        />
      </div>

      <Button variant="primary" size="lg" fullWidth onClick={() => onConfirm(sleep, stress)}>
        Confirm →
      </Button>
    </div>
  )
}

// ─── Step 2: Time picker ──────────────────────────────────────────────────────

interface TimeStepProps {
  readinessSleep: number
  readinessStress: number
  onSelect: (tier: TimeTier) => void
  onBack: () => void
}

const TimeStep: React.FC<TimeStepProps> = ({ readinessSleep, readinessStress, onSelect, onBack }) => {
  const readiness = computeReadiness({ sleepScore: readinessSleep, stressScore: readinessStress })

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h2 className="font-heading text-display-md text-text leading-none">HOW MUCH TIME?</h2>
        <p className="font-mono text-mono-xs text-text-3 mt-1">Session content scales to your available time.</p>
      </div>

      <div className="flex items-center gap-2">
        <ReadinessLight readiness={readiness} compact />
        <span className="font-mono text-mono-xs text-text-3">{readiness.label}</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {TIME_TIERS.map(tier => (
          <button
            key={tier.value}
            onClick={() => onSelect(tier.value)}
            className="flex flex-col items-start p-4 rounded border border-line bg-bg-2 hover:border-lime hover:bg-accent-dim active:scale-[0.98] transition-all duration-150"
          >
            <div className="flex items-baseline gap-1.5">
              <span className="font-heading text-display-md text-lime leading-none">{tier.label}</span>
              <span className="font-mono text-mono-xs text-text-3">min</span>
            </div>
            <span className="font-mono text-mono-xs text-text-2 mt-1">{tier.desc}</span>
          </button>
        ))}
      </div>

      <button
        onClick={onBack}
        className="w-full font-mono text-mono-xs text-text-3 hover:text-text transition-colors py-2"
      >
        ← Back
      </button>
    </div>
  )
}

// ─── Step 3: Active session ───────────────────────────────────────────────────

type WizardReturn = ReturnType<typeof useSessionWizard>

interface ActiveStepProps {
  wizard: WizardReturn
}

const ActiveStep: React.FC<ActiveStepProps> = ({ wizard }) => {
  const { state } = wizard
  const { template } = state
  if (!template) return null

  const canFinish = state.liftStates.some(l => l.sets.some(s => s.completed))
  const beforeStrengthSkills = state.skillStates.filter(sk => {
    const block = template.skillBlocks.find(b => b.nodeId === sk.nodeId)
    return block?.placement === 'before_strength'
  })
  const afterStrengthSkills = state.skillStates.filter(sk => {
    const block = template.skillBlocks.find(b => b.nodeId === sk.nodeId)
    return block?.placement === 'after_strength'
  })

  return (
    <div className="space-y-3 animate-fade-up">

      {/* Warm-up */}
      <CollapsibleSection
        title="Warm-Up"
        badge={state.warmUpDone ? <Tag variant="lime" dot>Done</Tag> : <Tag variant="dim">First</Tag>}
        defaultOpen={!state.warmUpDone}
      >
        <div className="space-y-1">
          {template.warmUp.map((ex, i) => (
            <div key={i} className="flex items-start gap-3 py-1.5 border-b border-line last:border-0">
              <span className="font-mono text-mono-xs text-text-3 w-4 flex-shrink-0 mt-0.5">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="font-body text-sm text-text">{ex.name}</p>
                <p className="font-mono text-mono-xs text-text-3">
                  {ex.duration ?? (ex.reps ? `${ex.reps} reps` : '')}
                  {ex.notes ? ` · ${ex.notes}` : ''}
                </p>
              </div>
            </div>
          ))}
          <DoneToggle done={state.warmUpDone} onToggle={v => wizard.setWarmUpDone(v)} label="Warm-Up" />
        </div>
      </CollapsibleSection>

      {/* Skills before strength */}
      {beforeStrengthSkills.map(skill => (
        <SkillBlock
          key={skill.nodeId}
          skill={skill}
          onToggleExpand={() => wizard.toggleSkillExpanded(skill.nodeId)}
          onUpdateSet={(n, f, v) => wizard.updateSkillSet(skill.nodeId, n, f, v)}
          onCompleteSet={n => wizard.completeSkillSet(skill.nodeId, n)}
        />
      ))}

      {/* Lifts */}
      {state.liftStates.map(lift => (
        <LiftBlock
          key={lift.liftId}
          lift={lift}
          onToggleExpand={() => wizard.toggleLiftExpanded(lift.liftId)}
          onUpdateSet={(n, f, v) => wizard.updateLiftSet(lift.liftId, n, f, v)}
          onCompleteSet={n => wizard.completeSet(lift.liftId, n)}
        />
      ))}

      {/* Accessories */}
      {template.accessoryBlocks.length > 0 && (
        <CollapsibleSection
          title="Accessories"
          badge={<Tag variant="dim">{template.accessoryBlocks.length}</Tag>}
          defaultOpen
        >
          <div className="space-y-0">
            {template.accessoryBlocks.map((acc, i) => (
              <div key={i} className="flex items-start justify-between py-2 border-b border-line last:border-0">
                <div className="min-w-0 mr-2">
                  <p className="font-body text-sm text-text">{acc.name}</p>
                  <p className="font-mono text-mono-xs text-text-3">{acc.sets} sets · {acc.repsOrDuration}</p>
                </div>
                {acc.isSkillSpecific && <Tag variant="lime" dot>Skill-specific</Tag>}
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Skills after strength */}
      {afterStrengthSkills.map(skill => (
        <SkillBlock
          key={skill.nodeId}
          skill={skill}
          onToggleExpand={() => wizard.toggleSkillExpanded(skill.nodeId)}
          onUpdateSet={(n, f, v) => wizard.updateSkillSet(skill.nodeId, n, f, v)}
          onCompleteSet={n => wizard.completeSkillSet(skill.nodeId, n)}
        />
      ))}

      {/* Core */}
      {template.coreBlocks.length > 0 && (
        <CollapsibleSection
          title="Core"
          badge={state.coresDone ? <Tag variant="lime" dot>Done</Tag> : <Tag variant="dim">{template.coreBlocks.length}</Tag>}
          defaultOpen={!state.coresDone}
        >
          <div className="space-y-0">
            {template.coreBlocks.map((cb, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-line last:border-0">
                <div>
                  <p className="font-body text-sm text-text">{cb.exercise}</p>
                  <p className="font-mono text-mono-xs text-text-3">{cb.sets} sets · {cb.repsOrDuration}</p>
                </div>
                <Tag variant="dim">{cb.plane}</Tag>
              </div>
            ))}
            <DoneToggle done={state.coresDone} onToggle={v => wizard.setCoresDone(v)} label="Core" />
          </div>
        </CollapsibleSection>
      )}

      {/* Conditioning */}
      {template.conditioningBlock && (
        <CollapsibleSection
          title="Conditioning"
          badge={state.conditioningDone
            ? <Tag variant="lime" dot>Done</Tag>
            : <Tag variant="yellow">{template.conditioningBlock.durationMinutes} min</Tag>}
          defaultOpen={!state.conditioningDone}
        >
          <div className="space-y-2">
            <p className="font-heading text-display-sm text-text">{template.conditioningBlock.protocol}</p>
            <p className="font-body text-sm text-text-2">{template.conditioningBlock.description}</p>
            <div className="flex gap-2">
              <Tag variant="yellow">{template.conditioningBlock.targetZone}</Tag>
              <Tag variant="dim">{template.conditioningBlock.durationMinutes} min</Tag>
            </div>
            <DoneToggle done={state.conditioningDone} onToggle={v => wizard.setConditioningDone(v)} label="Conditioning" />
          </div>
        </CollapsibleSection>
      )}

      {/* Finish */}
      <div className="bg-bg-2 border border-line rounded p-4 space-y-4">
        <p className="font-mono uppercase tracking-widest text-mono-xs text-text-3">Wrap Up</p>

        {/* Feel */}
        <div>
          <p className="font-mono text-mono-xs text-text-3 mb-2">How'd it feel?</p>
          <div className="flex gap-2">
            {FEEL_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => wizard.setFeel(opt.value)}
                className={[
                  'flex-1 flex flex-col items-center gap-1 py-3 rounded border transition-all',
                  state.feel === opt.value
                    ? 'border-lime bg-accent-dim'
                    : 'border-line hover:border-line-2',
                ].join(' ')}
              >
                <span className="text-xl">{opt.emoji}</span>
                <span className="font-mono text-mono-xs text-text-3">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Peak BPM */}
        <div>
          <label className="font-mono uppercase tracking-widest text-mono-xs text-text-3 block mb-1">
            Peak BPM (optional)
          </label>
          <input
            type="number"
            placeholder="—"
            value={state.peakBPM}
            onChange={e => wizard.setPeakBPM(e.target.value)}
            className="w-full bg-bg border border-line rounded px-3 py-2 font-mono text-sm text-text focus:outline-none focus:border-lime"
          />
        </div>

        {/* Note */}
        <div>
          <label className="font-mono uppercase tracking-widest text-mono-xs text-text-3 block mb-1">
            Note (optional)
          </label>
          <input
            type="text"
            placeholder="Any thoughts on this session..."
            value={state.sessionNote}
            onChange={e => wizard.setSessionNote(e.target.value)}
            className="w-full bg-bg border border-line rounded px-3 py-2 font-body text-sm text-text focus:outline-none focus:border-lime"
          />
        </div>

        <Button
          variant="primary"
          size="lg"
          fullWidth
          disabled={!canFinish}
          onClick={() => wizard.finishSession()}
        >
          Complete Session ✓
        </Button>

        {!canFinish && (
          <p className="font-mono text-mono-xs text-text-3 text-center">
            Log at least one set to finish.
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Complete screen ──────────────────────────────────────────────────────────

const CompleteScreen: React.FC<{ profile: AthleteProfile; onDone: () => void }> = ({ profile, onDone }) => (
  <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg px-6 text-center">
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[999]" style={{ backgroundImage: NOISE_BG }} />
    <div className="animate-scale-in space-y-4 relative z-10">
      <p className="font-heading text-[6rem] text-lime leading-none drop-shadow-[0_0_40px_rgba(200,240,80,0.5)]">
        ✓
      </p>
      <h2 className="font-heading text-display-lg text-text tracking-widest">SESSION DONE</h2>
      <p className="font-mono text-mono-sm text-text-3">
        Block {profile.blockPosition.blockNumber} · Week {profile.blockPosition.weekInBlock}
      </p>
      <p className="font-body text-sm text-text-2 max-w-xs">
        Logged and saved. The sequence continues — pick up where you left off next time.
      </p>
      <div className="pt-4">
        <Button variant="primary" size="lg" onClick={onDone}>
          Back to Dashboard
        </Button>
      </div>
    </div>
  </div>
)

// ─── Lift block ───────────────────────────────────────────────────────────────

interface LiftBlockProps {
  lift: ActiveLiftState
  onToggleExpand: () => void
  onUpdateSet: (setNum: number, field: 'weight_kg' | 'reps' | 'rpe', val: number) => void
  onCompleteSet: (setNum: number) => void
}

const LiftBlock: React.FC<LiftBlockProps> = ({ lift, onToggleExpand, onUpdateSet, onCompleteSet }) => {
  const completedCount = lift.sets.filter(s => s.completed).length
  const allDone = completedCount === lift.sets.length
  const cfg = SUGGESTION_CONFIG[lift.suggestion]

  return (
    <div className={`bg-bg-2 border rounded transition-colors ${allDone ? 'border-lime border-opacity-40' : 'border-line'}`}>
      <button onClick={onToggleExpand} className="w-full flex items-center gap-3 p-3 text-left">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors ${allDone ? 'bg-lime shadow-lime' : 'bg-line-2'}`} />
        <span className="font-body text-sm text-text flex-1 min-w-0 truncate">{lift.liftName}</span>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`font-mono text-mono-xs ${cfg.color}`}>
            {cfg.symbol} {formatWeight(lift.suggestedWeight_kg)}
          </span>
          <span className="font-mono text-mono-xs text-text-3">{completedCount}/{lift.sets.length}</span>
          <span className="text-text-3 text-xs">{lift.expanded ? '▾' : '›'}</span>
        </div>
      </button>

      {lift.expanded && (
        <div className="px-3 pb-3 border-t border-line pt-3 space-y-2">
          <div className="flex gap-1.5 mb-3 flex-wrap">
            <Tag variant="dim">{lift.repRange[0]}–{lift.repRange[1]} reps</Tag>
            <Tag variant="dim">{lift.sets.length} sets</Tag>
            <Tag variant={lift.suggestion === 'increase' ? 'lime' : lift.suggestion === 'deload' ? 'red' : 'yellow'}>
              {cfg.symbol} {cfg.label}
            </Tag>
          </div>

          {lift.sets.map(set => (
            <LiftSetRow
              key={set.setNumber}
              setNumber={set.setNumber}
              weight={set.weight_kg}
              reps={set.reps}
              rpe={set.rpe}
              completed={set.completed}
              onWeightChange={v => onUpdateSet(set.setNumber, 'weight_kg', v)}
              onRepsChange={v => onUpdateSet(set.setNumber, 'reps', v)}
              onRpeChange={v => onUpdateSet(set.setNumber, 'rpe', v)}
              onToggleComplete={() => onCompleteSet(set.setNumber)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Skill block ──────────────────────────────────────────────────────────────

interface SkillBlockProps {
  skill: ActiveSkillState
  onToggleExpand: () => void
  onUpdateSet: (setNum: number, field: 'hold_seconds' | 'reps' | 'rpe', val: number) => void
  onCompleteSet: (setNum: number) => void
}

const SkillBlock: React.FC<SkillBlockProps> = ({ skill, onToggleExpand, onUpdateSet, onCompleteSet }) => {
  const completedCount = skill.sets.filter(s => s.completed).length
  const allDone = completedCount === skill.sets.length

  return (
    <div className={`bg-bg-2 border rounded transition-colors ${allDone ? 'border-lime border-opacity-40' : 'border-accent-4 border-opacity-30'}`}>
      <button onClick={onToggleExpand} className="w-full flex items-center gap-3 p-3 text-left">
        <span className={`text-xs flex-shrink-0 ${allDone ? 'text-lime' : 'text-accent-4'}`}>⚡</span>
        <span className="font-body text-sm text-text flex-1 min-w-0 truncate">{skill.nodeName}</span>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Tag variant="blue">
            {skill.isTimedHold ? `${skill.targetHoldSeconds}s` : `${skill.targetReps} reps`}
          </Tag>
          <span className="font-mono text-mono-xs text-text-3">{completedCount}/{skill.sets.length}</span>
          <span className="text-text-3 text-xs">{skill.expanded ? '▾' : '›'}</span>
        </div>
      </button>

      {skill.expanded && (
        <div className="px-3 pb-3 border-t border-line pt-3 space-y-2">
          {skill.isTimedHold
            ? skill.sets.map(set => (
                <HoldSetRow
                  key={set.setNumber}
                  setNumber={set.setNumber}
                  targetSeconds={skill.targetHoldSeconds ?? 10}
                  achievedSeconds={set.hold_seconds}
                  completed={set.completed}
                  onSecondsChange={v => onUpdateSet(set.setNumber, 'hold_seconds', v)}
                  onToggleComplete={() => onCompleteSet(set.setNumber)}
                />
              ))
            : skill.sets.map(set => (
                <RepSetRow
                  key={set.setNumber}
                  setNumber={set.setNumber}
                  targetReps={skill.targetReps ?? 5}
                  achievedReps={set.reps}
                  completed={set.completed}
                  onRepsChange={v => onUpdateSet(set.setNumber, 'reps', v)}
                  onToggleComplete={() => onCompleteSet(set.setNumber)}
                />
              ))
          }
        </div>
      )}
    </div>
  )
}

// ─── Lift set row ─────────────────────────────────────────────────────────────

interface LiftSetRowProps {
  setNumber: number; weight: number; reps: number; rpe: number; completed: boolean
  onWeightChange: (v: number) => void; onRepsChange: (v: number) => void
  onRpeChange: (v: number) => void; onToggleComplete: () => void
}

const LiftSetRow: React.FC<LiftSetRowProps> = ({
  setNumber, weight, reps, rpe, completed,
  onWeightChange, onRepsChange, onRpeChange, onToggleComplete,
}) => (
  <div className={`flex items-center gap-2 p-2 rounded border transition-colors ${completed ? 'border-lime border-opacity-30 bg-accent-dim' : 'border-line'}`}>
    <span className="font-mono text-mono-xs text-text-3 w-4 text-center flex-shrink-0">{setNumber}</span>

    <div className="flex items-center gap-1">
      <Stepper value={weight} step={2.5} onChange={onWeightChange} disabled={completed} />
      <span className="font-mono text-mono-xs text-text-3">kg</span>
    </div>

    <span className="font-mono text-mono-xs text-text-3">×</span>

    <div className="flex items-center gap-1">
      <Stepper value={reps} step={1} onChange={onRepsChange} disabled={completed} min={1} />
      <span className="font-mono text-mono-xs text-text-3">reps</span>
    </div>

    <div className="ml-auto flex items-center gap-2">
      <div>
        <select
          value={rpe}
          disabled={completed}
          onChange={e => onRpeChange(Number(e.target.value))}
          className="bg-bg border border-line rounded px-1 py-1 font-mono text-mono-xs text-text focus:outline-none focus:border-lime disabled:opacity-40 cursor-pointer"
        >
          {[5, 6, 7, 8, 9, 10].map(r => <option key={r} value={r}>RPE {r}</option>)}
        </select>
      </div>

      <button
        onClick={onToggleComplete}
        className={`w-8 h-8 flex items-center justify-center rounded border transition-all flex-shrink-0 ${
          completed ? 'bg-lime text-bg border-lime font-bold' : 'border-line text-text-3 hover:border-lime hover:text-lime'
        }`}
      >
        ✓
      </button>
    </div>
  </div>
)

// ─── Hold set row ─────────────────────────────────────────────────────────────

interface HoldSetRowProps {
  setNumber: number; targetSeconds: number; achievedSeconds: number; completed: boolean
  onSecondsChange: (v: number) => void; onToggleComplete: () => void
}

const HoldSetRow: React.FC<HoldSetRowProps> = ({
  setNumber, targetSeconds, achievedSeconds, completed, onSecondsChange, onToggleComplete,
}) => {
  const [timing, setTiming] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const toggleTimer = () => {
    if (timing) {
      clearInterval(intervalRef.current!)
      intervalRef.current = null
      setTiming(false)
      onSecondsChange(elapsed)
    } else {
      setElapsed(0)
      setTiming(true)
      intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    }
  }

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current) }, [])

  return (
    <div className={`flex items-center gap-2 p-2 rounded border transition-colors ${completed ? 'border-lime border-opacity-30 bg-accent-dim' : 'border-line'}`}>
      <span className="font-mono text-mono-xs text-text-3 w-4 text-center flex-shrink-0">{setNumber}</span>

      <button
        onClick={toggleTimer}
        disabled={completed}
        className={`px-3 py-1.5 rounded border font-mono text-mono-xs transition-all flex-shrink-0 disabled:opacity-40 ${
          timing ? 'border-accent-3 text-accent-3 animate-pulse-slow' : 'border-line text-text-3 hover:border-lime hover:text-lime'
        }`}
      >
        {timing ? `${elapsed}s ■` : '▶ Timer'}
      </button>

      <Stepper value={achievedSeconds} step={1} onChange={onSecondsChange} disabled={completed} />
      <span className="font-mono text-mono-xs text-text-3">sec</span>

      <span className={`font-mono text-mono-xs ml-auto flex-shrink-0 ${achievedSeconds >= targetSeconds ? 'text-lime' : 'text-text-3'}`}>
        / {targetSeconds}s
      </span>

      <button
        onClick={onToggleComplete}
        className={`w-8 h-8 flex items-center justify-center rounded border transition-all flex-shrink-0 ${
          completed ? 'bg-lime text-bg border-lime' : 'border-line text-text-3 hover:border-lime hover:text-lime'
        }`}
      >
        ✓
      </button>
    </div>
  )
}

// ─── Rep set row (skills) ─────────────────────────────────────────────────────

interface RepSetRowProps {
  setNumber: number; targetReps: number; achievedReps: number; completed: boolean
  onRepsChange: (v: number) => void; onToggleComplete: () => void
}

const RepSetRow: React.FC<RepSetRowProps> = ({
  setNumber, targetReps, achievedReps, completed, onRepsChange, onToggleComplete,
}) => (
  <div className={`flex items-center gap-2 p-2 rounded border transition-colors ${completed ? 'border-lime border-opacity-30 bg-accent-dim' : 'border-line'}`}>
    <span className="font-mono text-mono-xs text-text-3 w-4 text-center flex-shrink-0">{setNumber}</span>
    <Stepper value={achievedReps} step={1} onChange={onRepsChange} disabled={completed} min={1} />
    <span className="font-mono text-mono-xs text-text-3">reps</span>
    <span className={`font-mono text-mono-xs ml-auto flex-shrink-0 ${achievedReps >= targetReps ? 'text-lime' : 'text-text-3'}`}>
      / {targetReps}
    </span>
    <button
      onClick={onToggleComplete}
      className={`w-8 h-8 flex items-center justify-center rounded border transition-all flex-shrink-0 ${
        completed ? 'bg-lime text-bg border-lime' : 'border-line text-text-3 hover:border-lime hover:text-lime'
      }`}
    >
      ✓
    </button>
  </div>
)

// ─── Numeric stepper ──────────────────────────────────────────────────────────

interface StepperProps {
  value: number; step: number; onChange: (v: number) => void; disabled?: boolean; min?: number
}

const Stepper: React.FC<StepperProps> = ({ value, step, onChange, disabled = false, min = 0 }) => (
  <div className="flex items-center border border-line rounded overflow-hidden">
    <button
      onClick={() => onChange(Math.max(min, parseFloat((value - step).toFixed(2))))}
      disabled={disabled}
      className="w-7 h-7 flex items-center justify-center text-text-3 hover:text-text hover:bg-bg-3 transition-colors disabled:opacity-30 select-none"
    >
      −
    </button>
    <span className="w-10 text-center font-mono text-mono-sm text-text bg-bg select-none">
      {Number.isInteger(value / step) && step >= 1 ? value : value.toFixed(1)}
    </span>
    <button
      onClick={() => onChange(parseFloat((value + step).toFixed(2)))}
      disabled={disabled}
      className="w-7 h-7 flex items-center justify-center text-text-3 hover:text-text hover:bg-bg-3 transition-colors disabled:opacity-30 select-none"
    >
      +
    </button>
  </div>
)

// ─── Collapsible section ──────────────────────────────────────────────────────

interface CollapsibleSectionProps {
  title: string; badge?: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, badge, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-bg-2 border border-line rounded">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between p-3 text-left">
        <div className="flex items-center gap-2">
          <span className="font-mono uppercase tracking-widest text-mono-xs text-text-2">{title}</span>
          {badge}
        </div>
        <span className="text-text-3 text-xs">{open ? '▾' : '›'}</span>
      </button>
      {open && <div className="px-3 pb-3 border-t border-line pt-3">{children}</div>}
    </div>
  )
}

// ─── Done toggle ──────────────────────────────────────────────────────────────

const DoneToggle: React.FC<{ done: boolean; onToggle: (v: boolean) => void; label: string }> = ({ done, onToggle, label }) => (
  <button
    onClick={() => onToggle(!done)}
    className={`w-full mt-2 py-2 rounded border font-mono uppercase tracking-widest text-mono-xs transition-all ${
      done ? 'border-lime bg-accent-dim text-lime' : 'border-line text-text-3 hover:border-line-2'
    }`}
  >
    {done ? `✓ ${label} Done` : `Mark ${label} Done`}
  </button>
)

// ─── Score slider ─────────────────────────────────────────────────────────────

interface ScoreSliderProps {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void
  goodAt?: number; goodBelow?: boolean; dangerAt?: number; dangerBelow?: number
}

const ScoreSlider: React.FC<ScoreSliderProps> = ({
  label, value, min, max, onChange, goodAt, goodBelow = false, dangerAt, dangerBelow,
}) => {
  const isGood = goodAt !== undefined && (goodBelow ? value <= goodAt : value >= goodAt)
  const isDanger =
    (dangerAt !== undefined && value >= dangerAt) ||
    (dangerBelow !== undefined && value < dangerBelow)
  const color = isDanger ? 'text-accent-3' : isGood ? 'text-lime' : 'text-text-2'

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-mono uppercase tracking-widest text-mono-xs text-text-3">{label}</span>
        <span className={`font-heading text-display-sm leading-none ${color}`}>{value}</span>
      </div>
      <input
        type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full cursor-pointer"
      />
      <div className="flex justify-between">
        <span className="font-mono text-mono-xs text-text-3">{min}</span>
        <span className="font-mono text-mono-xs text-text-3">{max}</span>
      </div>
    </div>
  )
}

// ─── Elapsed timer ────────────────────────────────────────────────────────────

const ElapsedTimer: React.FC<{ startedAt: string | null }> = ({ startedAt }) => {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!startedAt) return
    const iv = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000))
    }, 1000)
    return () => clearInterval(iv)
  }, [startedAt])
  const m = Math.floor(elapsed / 60)
  const s = elapsed % 60
  return <span className="font-mono text-mono-sm text-text-3">{m}:{String(s).padStart(2, '0')}</span>
}

export default SessionWizard
