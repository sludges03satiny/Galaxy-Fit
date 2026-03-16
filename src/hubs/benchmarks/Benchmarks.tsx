import React, { useState, useCallback } from 'react'
import { getBenchmarks, saveBenchmark, getAthleteProfile, saveAthleteProfile } from '../../lib/storage'
import { epley1RM, FRONT_LEVER_LEVEL_LABELS } from '../../types/benchmark'
import type { BenchmarkResult } from '../../types/benchmark'
import { Button } from '../../components/Button'
import { Tag } from '../../components/Tag'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function nextDeloadWeek(blockNumber: number, weekInBlock: number): { block: number; week: number } {
  if (weekInBlock < 5) return { block: blockNumber, week: 5 }
  if (weekInBlock < 10) return { block: blockNumber, week: 10 }
  return { block: blockNumber + 1, week: 5 }
}

function newBenchmark(blockNumber: number, weekInBlock: number): BenchmarkResult {
  return {
    id: crypto.randomUUID(),
    date: new Date().toISOString().split('T')[0],
    blockNumber,
    weekInBlock,
    max_pull_ups: 0,
    max_push_ups: 0,
    max_dips: 0,
    squat_3rm_kg: 0,
    squat_e1rm_kg: 0,
    deadlift_3rm_kg: 0,
    deadlift_e1rm_kg: 0,
    handstand_hold_seconds: 0,
    front_lever_hold_seconds: 0,
    front_lever_level: 'tuck',
    toe_touch_cm: 0,
    vo2max_estimate: 0,
    resting_hr: 0,
    notes: '',
  }
}

// ─── Step definitions ─────────────────────────────────────────────────────────

interface StepDef {
  id: string
  title: string
  instruction: string
  fields: FieldDef[]
}

interface FieldDef {
  key: keyof BenchmarkResult
  label: string
  type: 'number' | 'select' | 'toedist'
  unit?: string
  options?: { value: string; label: string }[]
  min?: number
  placeholder?: string
}

const STEPS: StepDef[] = [
  {
    id: 'pull-ups',
    title: 'Max Strict Pull-Ups',
    instruction: '1 set to failure. Full dead hang to chin over bar. No kipping.',
    fields: [{ key: 'max_pull_ups', label: 'Reps', type: 'number', unit: 'reps', min: 0 }],
  },
  {
    id: 'push-ups',
    title: 'Max Push-Ups',
    instruction: '1 set to failure. Chest to floor, full lockout.',
    fields: [{ key: 'max_push_ups', label: 'Reps', type: 'number', unit: 'reps', min: 0 }],
  },
  {
  id: 'dips',
  title: 'Max Dips',
  instruction: '1 set to failure. Parallel bars, full lockout at top, below 90° at bottom. No kipping.',
  fields: [{ key: 'max_dips', label: 'Reps', type: 'number', unit: 'reps', min: 0 }],
  },
  {
    id: 'squat',
    title: 'Squat 3RM',
    instruction: '3-rep set at near-max effort. App calculates estimated 1RM using Epley formula: weight × (1 + reps/30).',
    fields: [{ key: 'squat_3rm_kg', label: 'Weight', type: 'number', unit: 'kg', min: 0, placeholder: '0' }],
  },
  {
    id: 'deadlift',
    title: 'Deadlift 3RM',
    instruction: '3-rep set at near-max effort. App calculates estimated 1RM via Epley formula.',
    fields: [{ key: 'deadlift_3rm_kg', label: 'Weight', type: 'number', unit: 'kg', min: 0, placeholder: '0' }],
  },
  {
    id: 'handstand',
    title: 'Handstand Hold',
    instruction: 'Best of 3 attempts. Log your longest hold.',
    fields: [{ key: 'handstand_hold_seconds', label: 'Hold time', type: 'number', unit: 'sec', min: 0 }],
  },
  {
    id: 'front-lever',
    title: 'Front Lever Hold',
    instruction: 'Best of 3 attempts at your current progression level.',
    fields: [
      { key: 'front_lever_hold_seconds', label: 'Hold time', type: 'number', unit: 'sec', min: 0 },
      {
        key: 'front_lever_level', label: 'Level', type: 'select',
        options: Object.entries(FRONT_LEVER_LEVEL_LABELS).map(([v, l]) => ({ value: v, label: l })),
      },
    ],
  },
  {
    id: 'toe-touch',
    title: 'Toe Touch',
    instruction: 'Stand on a step or box. Measure how far your fingertips reach past the floor. Positive = past floor, negative = above floor.',
    fields: [{ key: 'toe_touch_cm', label: 'Distance', type: 'toedist', unit: 'cm' }],
  },
  {
    id: 'vo2max',
    title: 'VO₂max Estimate',
    instruction: 'Open Apple Watch Fitness app → Health Metrics → Cardiorespiratory Fitness. Enter your current VO₂max estimate.',
    fields: [{ key: 'vo2max_estimate', label: 'VO₂max', type: 'number', unit: 'ml/kg/min', min: 0, placeholder: '45' }],
  },
  {
    id: 'resting-hr',
    title: 'Resting Heart Rate',
    instruction: 'Open Apple Watch → Heart Rate app → Resting Rate (7-day average).',
    fields: [{ key: 'resting_hr', label: 'BPM', type: 'number', unit: 'BPM', min: 0, placeholder: '55' }],
  },
]

// ─── Test Flow ────────────────────────────────────────────────────────────────

interface TestFlowProps {
  initialData: BenchmarkResult
  onSave: (result: BenchmarkResult) => void
  onCancel: () => void
}

const TestFlow: React.FC<TestFlowProps> = ({ initialData, onSave, onCancel }) => {
  const [step, setStep] = useState(0) // 0 = step 1..9, 9 = review
  const [data, setData] = useState<BenchmarkResult>(initialData)
  const [toeBelowFloor, setToeBelowFloor] = useState(data.toe_touch_cm >= 0)

  const isReview = step >= STEPS.length
  const currentStep = STEPS[step]
  const progress = isReview ? 1 : (step + 1) / (STEPS.length + 1)

  const setField = useCallback(<K extends keyof BenchmarkResult>(key: K, value: BenchmarkResult[K]) => {
    setData(prev => ({ ...prev, [key]: value }))
  }, [])

  // Validate current step
  const stepIsValid = useCallback((): boolean => {
    if (isReview) return true
    const fields = currentStep.fields
    return fields.every(f => {
      const v = data[f.key]
      if (f.type === 'select') return Boolean(v)
      if (f.type === 'number' || f.type === 'toedist') {
        const n = Number(v)
        return !isNaN(n) && (f.key === 'toe_touch_cm' ? true : n > 0)
      }
      return true
    })
  }, [isReview, currentStep, data])

  const handleNext = () => {
    if (step < STEPS.length) setStep(s => s + 1)
  }
  const handleBack = () => setStep(s => Math.max(0, s - 1))

  const handleSave = () => {
    const final: BenchmarkResult = {
      ...data,
      squat_e1rm_kg: epley1RM(data.squat_3rm_kg, 3),
      deadlift_e1rm_kg: epley1RM(data.deadlift_3rm_kg, 3),
      toe_touch_cm: toeBelowFloor ? Math.abs(data.toe_touch_cm) : -Math.abs(data.toe_touch_cm),
    }
    onSave(final)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg" style={{ background: '#0a0a08' }}>
      {/* Progress bar */}
      <div className="h-0.5 bg-bg-3 flex-shrink-0">
        <div
          className="h-full bg-lime transition-all duration-500"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-line flex-shrink-0">
        <button
          onClick={onCancel}
          className="font-mono text-mono-xs text-text-3 hover:text-text transition-colors"
        >
          ✕ CANCEL
        </button>
        <span className="font-mono text-mono-xs text-text-3">
          {isReview ? 'REVIEW' : `${step + 1} / ${STEPS.length}`}
        </span>
        {step > 0 ? (
          <button
            onClick={handleBack}
            className="font-mono text-mono-xs text-text-3 hover:text-text transition-colors"
          >
            ← BACK
          </button>
        ) : (
          <span className="w-12" />
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-8 flex flex-col max-w-[540px] mx-auto w-full">
        {!isReview ? (
          /* ── Single Step ── */
          <div className="flex flex-col gap-6">
            <div>
              <p className="font-mono uppercase tracking-widest text-mono-xs text-text-3 mb-1">
                Step {step + 1} of {STEPS.length}
              </p>
              <h2 className="font-heading text-display-md text-text leading-none">
                {currentStep.title.toUpperCase()}
              </h2>
            </div>

            <p className="font-body text-sm text-text-2 leading-relaxed">
              {currentStep.instruction}
            </p>

            <div className="space-y-5">
              {currentStep.fields.map(field => (
                <StepField
                  key={String(field.key)}
                  field={field}
                  value={data[field.key]}
                  toeBelowFloor={toeBelowFloor}
                  onToggleToeDir={() => setToeBelowFloor(v => !v)}
                  onChange={v => setField(field.key, v as BenchmarkResult[typeof field.key])}
                />
              ))}
            </div>

            {/* Inline e1RM preview for squat/deadlift */}
            {currentStep.id === 'squat' && data.squat_3rm_kg > 0 && (
              <div className="bg-bg-2 border border-line rounded px-4 py-3">
                <p className="font-mono text-mono-xs text-text-3">Estimated 1RM (Epley)</p>
                <p className="font-heading text-display-sm text-lime mt-0.5">
                  {epley1RM(data.squat_3rm_kg, 3)} kg
                </p>
              </div>
            )}
            {currentStep.id === 'deadlift' && data.deadlift_3rm_kg > 0 && (
              <div className="bg-bg-2 border border-line rounded px-4 py-3">
                <p className="font-mono text-mono-xs text-text-3">Estimated 1RM (Epley)</p>
                <p className="font-heading text-display-sm text-lime mt-0.5">
                  {epley1RM(data.deadlift_3rm_kg, 3)} kg
                </p>
              </div>
            )}
          </div>
        ) : (
          /* ── Review ── */
          <ReviewPane data={data} toeBelowFloor={toeBelowFloor} onEdit={setStep} />
        )}
      </div>

      {/* Footer CTA */}
      <div className="px-4 pb-8 pt-4 border-t border-line flex-shrink-0 max-w-[540px] mx-auto w-full">
        {!isReview ? (
          <Button
            variant="primary"
            fullWidth
            size="lg"
            disabled={!stepIsValid()}
            onClick={handleNext}
          >
            {step === STEPS.length - 1 ? 'REVIEW →' : 'NEXT →'}
          </Button>
        ) : (
          <Button variant="primary" fullWidth size="lg" onClick={handleSave}>
            SAVE BENCHMARK
          </Button>
        )}
      </div>
    </div>
  )
}

// ─── Step Field ───────────────────────────────────────────────────────────────

interface StepFieldProps {
  field: FieldDef
  value: BenchmarkResult[keyof BenchmarkResult]
  toeBelowFloor: boolean
  onToggleToeDir: () => void
  onChange: (v: string | number) => void
}

const StepField: React.FC<StepFieldProps> = ({ field, value, toeBelowFloor, onToggleToeDir, onChange }) => {
  if (field.type === 'select' && field.options) {
    return (
      <div>
        <label className="font-mono uppercase tracking-widest text-mono-xs text-text-3 block mb-2">
          {field.label}
        </label>
        <div className="grid grid-cols-3 gap-2">
          {field.options.map(opt => (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={[
                'py-3 px-2 rounded border font-mono text-xs uppercase tracking-wide transition-all',
                String(value) === opt.value
                  ? 'bg-lime text-bg border-lime'
                  : 'bg-bg-2 text-text-3 border-line hover:border-text-3',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (field.type === 'toedist') {
    return (
      <div>
        <label className="font-mono uppercase tracking-widest text-mono-xs text-text-3 block mb-2">
          {field.label}
        </label>
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => { if (!toeBelowFloor) onToggleToeDir() }}
            className={[
              'flex-1 py-2 rounded border font-mono text-xs uppercase tracking-wide transition-all',
              toeBelowFloor
                ? 'bg-lime text-bg border-lime'
                : 'bg-bg-2 text-text-3 border-line hover:border-text-3',
            ].join(' ')}
          >
            Past floor ↓
          </button>
          <button
            onClick={() => { if (toeBelowFloor) onToggleToeDir() }}
            className={[
              'flex-1 py-2 rounded border font-mono text-xs uppercase tracking-wide transition-all',
              !toeBelowFloor
                ? 'bg-accent-3 text-text border-accent-3 border-opacity-60'
                : 'bg-bg-2 text-text-3 border-line hover:border-text-3',
            ].join(' ')}
          >
            Above floor ↑
          </button>
        </div>
        <div className="relative">
          <input
            type="number"
            min={0}
            value={Math.abs(Number(value)) || ''}
            placeholder="0"
            onChange={e => onChange(Number(e.target.value))}
            className="w-full bg-bg-2 border border-line rounded px-4 py-4 pr-16 font-heading text-display-sm text-text focus:outline-none focus:border-lime text-center"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-mono-xs text-text-3">cm</span>
        </div>
        <p className="font-mono text-mono-xs text-text-3 mt-2 text-center">
          Stored as: <span className={toeBelowFloor ? 'text-lime' : 'text-accent-3'}>
            {toeBelowFloor ? '+' : '−'}{Math.abs(Number(value)) || 0} cm
          </span>
        </p>
      </div>
    )
  }

  // Default: number
  return (
    <div>
      <label className="font-mono uppercase tracking-widest text-mono-xs text-text-3 block mb-2">
        {field.label}
      </label>
      <div className="relative">
        <input
          type="number"
          min={field.min ?? 0}
          value={Number(value) || ''}
          placeholder={field.placeholder ?? '0'}
          onChange={e => onChange(Number(e.target.value))}
          className="w-full bg-bg-2 border border-line rounded px-4 py-4 pr-16 font-heading text-display-sm text-text focus:outline-none focus:border-lime text-center"
        />
        {field.unit && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-mono-xs text-text-3">
            {field.unit}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Review Pane ──────────────────────────────────────────────────────────────

interface ReviewPaneProps {
  data: BenchmarkResult
  toeBelowFloor: boolean
  onEdit: (stepIndex: number) => void
}

interface ReviewRow {
  label: string
  value: string
  step: number
  derived?: string
}

const ReviewPane: React.FC<ReviewPaneProps> = ({ data, toeBelowFloor, onEdit }) => {
  const toeCm = toeBelowFloor ? Math.abs(data.toe_touch_cm) : -Math.abs(data.toe_touch_cm)

  const rows: ReviewRow[] = [
    { label: 'Max Pull-Ups', value: `${data.max_pull_ups} reps`, step: 0 },
    { label: 'Max Push-Ups', value: `${data.max_push_ups} reps`, step: 1 },
    {
      label: 'Squat 3RM', value: `${data.squat_3rm_kg} kg`,
      derived: data.squat_3rm_kg > 0 ? `→ ${epley1RM(data.squat_3rm_kg, 3)} kg e1RM` : '',
      step: 2,
    },
    {
      label: 'Deadlift 3RM', value: `${data.deadlift_3rm_kg} kg`,
      derived: data.deadlift_3rm_kg > 0 ? `→ ${epley1RM(data.deadlift_3rm_kg, 3)} kg e1RM` : '',
      step: 3,
    },
    { label: 'Handstand Hold', value: `${data.handstand_hold_seconds}s`, step: 4 },
    {
      label: 'Front Lever',
      value: `${data.front_lever_hold_seconds}s`,
      derived: FRONT_LEVER_LEVEL_LABELS[data.front_lever_level],
      step: 5,
    },
    {
      label: 'Toe Touch',
      value: `${toeCm >= 0 ? '+' : ''}${toeCm} cm`,
      derived: toeCm >= 0 ? 'Past floor' : 'Above floor',
      step: 6,
    },
    { label: 'VO₂max', value: `${data.vo2max_estimate} ml/kg/min`, step: 7 },
    { label: 'Resting HR', value: `${data.resting_hr} BPM`, step: 8 },
  ]

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono uppercase tracking-widest text-mono-xs text-text-3 mb-1">Review</p>
        <h2 className="font-heading text-display-md text-text leading-none">CHECK YOUR NUMBERS</h2>
        <p className="font-body text-sm text-text-2 mt-2">Tap any row to edit before saving.</p>
      </div>

      <div className="bg-bg-2 border border-line rounded divide-y divide-line overflow-hidden">
        {rows.map((row) => (
          <button
            key={row.label}
            onClick={() => onEdit(row.step)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-bg-3 transition-colors text-left"
          >
            <div>
              <p className="font-mono uppercase tracking-widest text-mono-xs text-text-3">{row.label}</p>
              {row.derived && (
                <p className="font-mono text-mono-xs text-text-3 opacity-60 mt-0.5">{row.derived}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-heading text-display-sm text-text">{row.value}</span>
              <span className="font-mono text-mono-xs text-text-3 opacity-40">›</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Result Card ──────────────────────────────────────────────────────────────

interface ResultCardProps {
  result: BenchmarkResult
  previous?: BenchmarkResult | null
  expanded?: boolean
  onToggle?: () => void
}

const ResultCard: React.FC<ResultCardProps> = ({ result, previous, expanded, onToggle }) => {
  const delta = (key: keyof BenchmarkResult): string => {
    if (!previous) return ''
    const a = result[key] as number
    const b = previous[key] as number
    if (!a || !b || isNaN(a - b)) return ''
    const d = a - b
    if (d === 0) return ''
    return d > 0 ? `+${d}` : `${d}`
  }

  const StatRow: React.FC<{ label: string; value: number | string; unit: string; deltaKey?: keyof BenchmarkResult; sub?: string }> =
    ({ label, value, unit, deltaKey, sub }) => {
      const d = deltaKey ? delta(deltaKey) : ''
      return (
        <div className="p-4 border-b border-line last:border-b-0">
          <p className="font-mono uppercase tracking-widest text-mono-xs text-text-3">{label}</p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="font-heading text-display-sm text-text">{value || '—'}</span>
            {(Number(value) > 0 || typeof value === 'string') && value !== '—' && (
              <span className="font-mono text-mono-xs text-text-3">{unit}</span>
            )}
            {d && (
              <span className={`font-mono text-mono-xs ${d.startsWith('+') ? 'text-lime' : 'text-accent-3'}`}>
                {d}
              </span>
            )}
          </div>
          {sub && <p className="font-mono text-mono-xs text-text-3 opacity-60 mt-0.5">{sub}</p>}
        </div>
      )
    }

  return (
    <div className="bg-bg-2 border border-line rounded overflow-hidden">
      {/* Card header */}
      {onToggle && (
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-between px-4 py-3 border-b border-line hover:bg-bg-3 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="font-mono text-mono-xs text-text-2">{formatDate(result.date)}</span>
            <Tag variant="dim">Block {result.blockNumber} · Week {result.weekInBlock}</Tag>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-mono-xs text-text-3">{result.max_pull_ups} pull-ups</span>
            <span className="font-mono text-mono-xs text-text-3">{result.squat_e1rm_kg}kg sq.</span>
            <span className="font-mono text-mono-xs text-text-3 opacity-40">{expanded ? '▲' : '▼'}</span>
          </div>
        </button>
      )}

      {(!onToggle || expanded) && (
        <>
          {/* Strength section */}
          <div className="border-b border-line">
            <div className="px-4 py-2 bg-bg-3">
              <span className="font-mono uppercase tracking-widest text-mono-xs text-text-3">Strength</span>
            </div>
            <div className="grid grid-cols-2 divide-x divide-line">
              <StatRow label="Pull-Ups" value={result.max_pull_ups} unit="reps" deltaKey="max_pull_ups" />
              <StatRow label="Push-Ups" value={result.max_push_ups} unit="reps" deltaKey="max_push_ups" />
              <StatRow label="Dips" value={result.max_dips ?? 0} unit="reps" deltaKey="max_dips" />
              <StatRow label="Squat e1RM" value={result.squat_e1rm_kg} unit="kg" deltaKey="squat_e1rm_kg"
                sub={result.squat_3rm_kg > 0 ? `3RM: ${result.squat_3rm_kg}kg` : undefined} />
              <StatRow label="Deadlift e1RM" value={result.deadlift_e1rm_kg} unit="kg" deltaKey="deadlift_e1rm_kg"
                sub={result.deadlift_3rm_kg > 0 ? `3RM: ${result.deadlift_3rm_kg}kg` : undefined} />
            </div>
          </div>

          {/* Skills section */}
          <div className="border-b border-line">
            <div className="px-4 py-2 bg-bg-3">
              <span className="font-mono uppercase tracking-widest text-mono-xs text-text-3">Skills</span>
            </div>
            <div className="grid grid-cols-2 divide-x divide-line">
              <StatRow label="Handstand" value={result.handstand_hold_seconds} unit="sec" deltaKey="handstand_hold_seconds" />
              <StatRow label="Front Lever" value={result.front_lever_hold_seconds} unit="sec" deltaKey="front_lever_hold_seconds"
                sub={FRONT_LEVER_LEVEL_LABELS[result.front_lever_level]} />
            </div>
          </div>

          {/* Mobility + Cardio */}
          <div>
            <div className="px-4 py-2 bg-bg-3">
              <span className="font-mono uppercase tracking-widest text-mono-xs text-text-3">Mobility + Cardio</span>
            </div>
            <div className="grid grid-cols-2 divide-x divide-line">
              <StatRow
                label="Toe Touch"
                value={result.toe_touch_cm >= 0 ? `+${result.toe_touch_cm}` : `${result.toe_touch_cm}`}
                unit="cm"
                deltaKey="toe_touch_cm"
                sub={result.toe_touch_cm >= 0 ? 'Past floor' : 'Above floor'}
              />
              {(result.vo2max_estimate > 0) && (
                <StatRow label="VO₂max" value={result.vo2max_estimate} unit="est." deltaKey="vo2max_estimate" />
              )}
              {(result.resting_hr > 0) && (
                <StatRow label="Resting HR" value={result.resting_hr} unit="BPM" deltaKey="resting_hr" />
              )}
            </div>
          </div>

          {result.notes && (
            <div className="px-4 py-3 border-t border-line">
              <p className="font-mono text-mono-xs text-text-3">{result.notes}</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const Benchmarks: React.FC = () => {
  const [benchmarks, setBenchmarks] = useState<BenchmarkResult[]>(() =>
    getBenchmarks().sort((a, b) => b.date.localeCompare(a.date))
  )
  const [showTestFlow, setShowTestFlow] = useState(false)
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  // Read block position from athlete profile
  const profile = getAthleteProfile()
  const blockNumber = profile?.blockPosition?.blockNumber ?? 1
  const weekInBlock = profile?.blockPosition?.weekInBlock ?? 1
  const isDeloadWeek = weekInBlock === 5 || weekInBlock === 10

  const latest = benchmarks[0] ?? null
  const history = benchmarks.slice(1)

  const handleStartTest = () => setShowTestFlow(true)

  const handleSave = (result: BenchmarkResult) => {
    saveBenchmark(result)

    // Update vo2max in athlete profile
    if (result.vo2max_estimate > 0 && profile) {
      saveAthleteProfile({ ...profile, vo2maxEstimate: result.vo2max_estimate })
    }

    setBenchmarks(getBenchmarks().sort((a, b) => b.date.localeCompare(a.date)))
    setShowTestFlow(false)
  }

  // ── Test flow overlay ──
  if (showTestFlow) {
    return (
      <TestFlow
        initialData={newBenchmark(blockNumber, weekInBlock)}
        onSave={handleSave}
        onCancel={() => setShowTestFlow(false)}
      />
    )
  }

  const nextDeload = nextDeloadWeek(blockNumber, weekInBlock)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-display-md text-text leading-none">BENCHMARKS</h1>
        <p className="font-mono text-mono-xs text-text-3 mt-1">Run every 4 weeks on deload week.</p>
      </div>

      {/* Prompt card */}
      {isDeloadWeek ? (
        <div className="bg-accent-dim border border-lime border-opacity-30 rounded p-4 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-lime animate-pulse flex-shrink-0" />
              <span className="font-mono uppercase tracking-widest text-mono-xs text-lime">Deload Week</span>
            </div>
            <p className="font-body text-sm text-text">Time to run your benchmark test.</p>
            <p className="font-mono text-mono-xs text-text-3 mt-0.5">
              Block {blockNumber} · Week {weekInBlock}
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={handleStartTest}>
            START TEST
          </Button>
        </div>
      ) : (
        <div className="bg-bg-2 border border-line rounded p-4 flex items-start justify-between gap-4">
          <div>
            <span className="font-mono uppercase tracking-widest text-mono-xs text-text-3">Not deload week</span>
            <p className="font-body text-sm text-text-2 mt-0.5">
              Next test: Block {nextDeload.block} · Week {nextDeload.week}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleStartTest}>
            + RUN ANYWAY
          </Button>
        </div>
      )}

      {/* Latest result */}
      {latest ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono uppercase tracking-widest text-mono-xs text-text-3">Latest</span>
            <Tag variant="dim">{formatDate(latest.date)}</Tag>
          </div>
          <ResultCard result={latest} previous={benchmarks[1]} />
        </div>
      ) : (
        <div className="bg-bg-2 border border-line rounded p-8 text-center">
          <p className="font-heading text-display-sm text-text-3">NO BENCHMARKS YET</p>
          <p className="font-body text-sm text-text-3 mt-2 max-w-xs mx-auto">
            Run your first test on deload week (Block Week 5) to calibrate skill gates and load suggestions.
          </p>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="space-y-2">
          <span className="font-mono uppercase tracking-widest text-mono-xs text-text-3">History</span>
          <div className="space-y-2">
            {history.map((b, idx) => (
              <ResultCard
                key={b.id}
                result={b}
                previous={benchmarks[idx + 2] ?? null}
                expanded={expandedIndex === idx}
                onToggle={() => setExpandedIndex(expandedIndex === idx ? null : idx)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Benchmarks
