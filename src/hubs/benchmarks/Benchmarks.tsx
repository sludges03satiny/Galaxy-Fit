import React, { useState } from 'react'
import { getBenchmarks, saveBenchmark } from '../../lib/storage'
import { epley1RM } from '../../types/benchmark'
import type { BenchmarkResult } from '../../types/benchmark'
import { Button } from '../../components/Button'
import { StatBlock } from '../../components/StatBlock'
import { Tag } from '../../components/Tag'

function newBenchmark(): BenchmarkResult {
  return {
    id: crypto.randomUUID(),
    date: new Date().toISOString().split('T')[0],
    blockNumber: 1,
    weekInBlock: 5,
    max_pull_ups: 0,
    max_push_ups: 0,
    max_dips: 0,
    squat_3rep_kg: 0,
    squat_estimated_1rm_kg: 0,
    deadlift_3rep_kg: 0,
    deadlift_estimated_1rm_kg: 0,
    handstand_hold_seconds: 0,
    front_lever_hold_seconds: 0,
    front_lever_level: '',
    toe_touch_cm: 0,
    vo2max_estimate: undefined,
    resting_hr_bpm: undefined,
    notes: '',
  }
}

export const Benchmarks: React.FC = () => {
  const [benchmarks, setBenchmarks] = useState<BenchmarkResult[]>(() =>
    getBenchmarks().sort((a, b) => b.date.localeCompare(a.date))
  )
  const [editing, setEditing] = useState<BenchmarkResult | null>(null)

  const latest = benchmarks[0] ?? null
  const previous = benchmarks[1] ?? null

  const handleSave = () => {
    if (!editing) return
    const saved: BenchmarkResult = {
      ...editing,
      squat_estimated_1rm_kg: epley1RM(editing.squat_3rep_kg, 3),
      deadlift_estimated_1rm_kg: epley1RM(editing.deadlift_3rep_kg, 3),
    }
    saveBenchmark(saved)
    setBenchmarks(getBenchmarks().sort((a, b) => b.date.localeCompare(a.date)))
    setEditing(null)
  }

  const delta = (key: keyof BenchmarkResult): string => {
    if (!latest || !previous) return ''
    const a = latest[key] as number
    const b = previous[key] as number
    if (!a || !b) return ''
    const d = a - b
    if (d === 0) return ''
    return d > 0 ? `+${d}` : `${d}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <h1 className="font-heading text-display-md text-text leading-none">BENCHMARKS</h1>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setEditing(newBenchmark())}
        >
          + New Test
        </Button>
      </div>

      <p className="font-mono text-mono-xs text-text-3">
        Run every 4 weeks on deload week. Results calibrate load suggestions and skill gates.
      </p>

      {/* Latest results */}
      {latest && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="font-mono uppercase tracking-widest text-mono-xs text-text-3">
              Latest
            </span>
            <Tag variant="dim">{latest.date}</Tag>
          </div>

          {/* Strength */}
          <div className="bg-bg-2 border border-line rounded overflow-hidden">
            <div className="px-4 py-2 border-b border-line">
              <span className="font-mono uppercase tracking-widest text-mono-xs text-text-3">Strength</span>
            </div>
            <div className="grid grid-cols-2 divide-x divide-line">
              <BenchStat label="Pull-Ups" value={latest.max_pull_ups} unit="reps" delta={delta('max_pull_ups')} />
              <BenchStat label="Push-Ups" value={latest.max_push_ups} unit="reps" delta={delta('max_push_ups')} />
              <BenchStat label="Dips" value={latest.max_dips} unit="reps" delta={delta('max_dips')} />
              <BenchStat label="Squat 1RM" value={latest.squat_estimated_1rm_kg} unit="kg est." delta={delta('squat_estimated_1rm_kg')} />
              <BenchStat label="Deadlift 1RM" value={latest.deadlift_estimated_1rm_kg} unit="kg est." delta={delta('deadlift_estimated_1rm_kg')} />
            </div>
          </div>

          {/* Skills */}
          <div className="bg-bg-2 border border-line rounded overflow-hidden">
            <div className="px-4 py-2 border-b border-line">
              <span className="font-mono uppercase tracking-widest text-mono-xs text-text-3">Skills</span>
            </div>
            <div className="grid grid-cols-2 divide-x divide-line">
              <BenchStat label="Handstand" value={latest.handstand_hold_seconds} unit="sec" delta={delta('handstand_hold_seconds')} />
              <BenchStat label="Front Lever" value={latest.front_lever_hold_seconds} unit="sec" sublabel={latest.front_lever_level || undefined} delta={delta('front_lever_hold_seconds')} />
            </div>
          </div>

          {/* Mobility + Cardio */}
          <div className="bg-bg-2 border border-line rounded overflow-hidden">
            <div className="px-4 py-2 border-b border-line">
              <span className="font-mono uppercase tracking-widest text-mono-xs text-text-3">Mobility + Cardio</span>
            </div>
            <div className="grid grid-cols-2 divide-x divide-line">
              <BenchStat label="Toe Touch" value={latest.toe_touch_cm} unit="cm" delta={delta('toe_touch_cm')} />
              {latest.vo2max_estimate && <BenchStat label="VO₂max" value={latest.vo2max_estimate} unit="est." />}
              {latest.resting_hr_bpm && <BenchStat label="Resting HR" value={latest.resting_hr_bpm} unit="BPM" />}
            </div>
          </div>
        </div>
      )}

      {/* History list */}
      {benchmarks.length > 1 && (
        <div>
          <span className="font-mono uppercase tracking-widest text-mono-xs text-text-3">History</span>
          <div className="mt-2 space-y-1">
            {benchmarks.slice(1).map(b => (
              <div key={b.id} className="flex items-center justify-between py-2 border-b border-line">
                <span className="font-mono text-mono-xs text-text-3">{b.date}</span>
                <div className="flex gap-3">
                  <span className="font-mono text-mono-xs text-text-2">{b.max_pull_ups} pull-ups</span>
                  <span className="font-mono text-mono-xs text-text-2">{b.squat_estimated_1rm_kg}kg sq.</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {benchmarks.length === 0 && (
        <div className="bg-bg-2 border border-line rounded p-6 text-center">
          <p className="font-heading text-display-sm text-text-3">NO BENCHMARKS YET</p>
          <p className="font-body text-sm text-text-3 mt-2">
            Run your first test on deload week (Block Week 5).
          </p>
        </div>
      )}

      {/* New benchmark modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-[700px] bg-bg-3 border-t border-line rounded-t-lg p-4 max-h-[90vh] overflow-y-auto animate-fade-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-display-sm text-text">NEW BENCHMARK</h2>
              <button onClick={() => setEditing(null)} className="text-text-3 hover:text-text">✕</button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Max Pull-Ups (reps)" type="number" value={editing.max_pull_ups}
                  onChange={v => setEditing(e => e && ({ ...e, max_pull_ups: Number(v) }))} />
                <Field label="Max Push-Ups (reps)" type="number" value={editing.max_push_ups}
                  onChange={v => setEditing(e => e && ({ ...e, max_push_ups: Number(v) }))} />
                <Field label="Max Dips (reps)" type="number" value={editing.max_dips}
                  onChange={v => setEditing(e => e && ({ ...e, max_dips: Number(v) }))} />
                <Field label="Squat 3-rep weight (kg)" type="number" value={editing.squat_3rep_kg}
                  onChange={v => setEditing(e => e && ({ ...e, squat_3rep_kg: Number(v) }))} />
                <Field label="Deadlift 3-rep weight (kg)" type="number" value={editing.deadlift_3rep_kg}
                  onChange={v => setEditing(e => e && ({ ...e, deadlift_3rep_kg: Number(v) }))} />
                <Field label="Handstand hold (sec)" type="number" value={editing.handstand_hold_seconds}
                  onChange={v => setEditing(e => e && ({ ...e, handstand_hold_seconds: Number(v) }))} />
                <Field label="Front Lever hold (sec)" type="number" value={editing.front_lever_hold_seconds}
                  onChange={v => setEditing(e => e && ({ ...e, front_lever_hold_seconds: Number(v) }))} />
                <Field label="Front Lever level" type="text" value={editing.front_lever_level}
                  onChange={v => setEditing(e => e && ({ ...e, front_lever_level: v }))} />
                <Field label="Toe touch (cm, neg = past floor)" type="number" value={editing.toe_touch_cm}
                  onChange={v => setEditing(e => e && ({ ...e, toe_touch_cm: Number(v) }))} />
                <Field label="VO₂max (Apple Watch)" type="number" value={editing.vo2max_estimate ?? ''}
                  onChange={v => setEditing(e => e && ({ ...e, vo2max_estimate: Number(v) || undefined }))} />
                <Field label="Resting HR (BPM)" type="number" value={editing.resting_hr_bpm ?? ''}
                  onChange={v => setEditing(e => e && ({ ...e, resting_hr_bpm: Number(v) || undefined }))} />
              </div>
              <div>
                <label className="font-mono uppercase tracking-widest text-mono-xs text-text-3 block mb-1">Notes</label>
                <textarea
                  value={editing.notes ?? ''}
                  onChange={e => setEditing(prev => prev && ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  className="w-full bg-bg-2 border border-line rounded px-3 py-2 font-body text-sm text-text focus:outline-none focus:border-lime resize-none"
                />
              </div>
              <Button variant="primary" fullWidth onClick={handleSave}>Save Benchmark</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

const BenchStat: React.FC<{
  label: string; value: number; unit: string; sublabel?: string; delta?: string
}> = ({ label, value, unit, sublabel, delta }) => (
  <div className="p-4 border-b border-line last:border-b-0">
    <p className="font-mono uppercase tracking-widest text-mono-xs text-text-3">{label}</p>
    <div className="flex items-baseline gap-2 mt-1">
      <span className="font-heading text-display-sm text-text">{value || '—'}</span>
      {value > 0 && <span className="font-mono text-mono-xs text-text-3">{unit}</span>}
      {delta && (
        <span className={`font-mono text-mono-xs ${delta.startsWith('+') ? 'text-lime' : 'text-accent-3'}`}>
          {delta}
        </span>
      )}
    </div>
    {sublabel && <p className="font-mono text-mono-xs text-text-3 mt-0.5">{sublabel}</p>}
  </div>
)

const Field: React.FC<{
  label: string; type: string; value: number | string;
  onChange: (v: string) => void
}> = ({ label, type, value, onChange }) => (
  <div>
    <label className="font-mono uppercase tracking-widest text-mono-xs text-text-3 block mb-1">{label}</label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-bg-2 border border-line rounded px-3 py-2 font-mono text-sm text-text focus:outline-none focus:border-lime"
    />
  </div>
)

export default Benchmarks
