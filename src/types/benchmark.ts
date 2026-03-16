// ─── Benchmark Types ─────────────────────────────────────────────────────────
// Matches the test battery defined in the Benchmarks hub spec.

export type FrontLeverLevel = 'tuck' | 'adv-tuck' | 'one-leg' | 'straddle' | 'full'

export interface BenchmarkResult {
  id: string
  date: string             // ISO date
  blockNumber: number
  weekInBlock: number      // should be 5 or 10 (deload weeks)

  // ─── Strength ────────────────────────────────────────────────────────────
  /** Max strict pull-ups (1 set to failure) */
  max_pull_ups: number

  /** Max push-ups (1 set to failure) */
  max_push_ups: number

  /** Max dips (1 set to failure, parallel bars) */
  max_dips: number

  /** 3-rep squat weight used for Epley 1RM estimate */
  squat_3rm_kg: number
  /** Estimated squat 1RM via Epley formula */
  squat_e1rm_kg: number

  /** 3-rep deadlift weight used for Epley 1RM estimate */
  deadlift_3rm_kg: number
  /** Estimated deadlift 1RM via Epley formula */
  deadlift_e1rm_kg: number

  // ─── Skills ──────────────────────────────────────────────────────────────
  /** Best of 3 handstand hold attempts (seconds) */
  handstand_hold_seconds: number

  /** Best of 3 front lever hold attempts (seconds + level name) */
  front_lever_hold_seconds: number
  front_lever_level: FrontLeverLevel

  // ─── Mobility ────────────────────────────────────────────────────────────
  /** Toe touch distance: positive = past floor, negative = above floor */
  toe_touch_cm: number

  // ─── Cardio ──────────────────────────────────────────────────────────────
  /** VO₂max estimate from Apple Watch */
  vo2max_estimate: number

  /** Apple Watch 7-day average resting HR */
  resting_hr: number

  // ─── Notes ───────────────────────────────────────────────────────────────
  notes?: string
}

// ─── Epley Formula ────────────────────────────────────────────────────────────

/**
 * Epley 1RM formula: weight × (1 + reps / 30)
 */
export function epley1RM(weight_kg: number, reps: number): number {
  if (reps <= 0 || weight_kg <= 0) return 0
  if (reps === 1) return weight_kg
  return Math.round(weight_kg * (1 + reps / 30))
}

// ─── Strength Prerequisite Resolution ────────────────────────────────────────

/**
 * Maps human-readable strength prerequisite strings to benchmark fields.
 * Used by the skill tree unlock gate evaluator.
 */
export function checkStrengthPrerequisite(
  prerequisite: string,
  benchmark: BenchmarkResult
): boolean {
  const lower = prerequisite.toLowerCase()

  // Pull-up checks
  const pullMatch = lower.match(/(\d+)\s+strict pull-ups?/)
  if (pullMatch) return benchmark.max_pull_ups >= parseInt(pullMatch[1])

  // Push-up checks
  const pushMatch = lower.match(/(\d+)\s+push-ups?/)
  if (pushMatch) return benchmark.max_push_ups >= parseInt(pushMatch[1])

  // Dip checks
  const dipMatch = lower.match(/(\d+)\s+dips?/)
  if (dipMatch) return benchmark.max_dips >= parseInt(dipMatch[1])

  // Not resolvable from benchmark — needs session log check
  return false
}

// ─── Front Lever Level Display ────────────────────────────────────────────────

export const FRONT_LEVER_LEVEL_LABELS: Record<FrontLeverLevel, string> = {
  'tuck': 'Tuck',
  'adv-tuck': 'Advanced Tuck',
  'one-leg': 'One Leg',
  'straddle': 'Straddle',
  'full': 'Full',
}

// ─── Benchmark History ────────────────────────────────────────────────────────

export interface BenchmarkHistory {
  results: BenchmarkResult[]
  pullUpPR: number
  pushUpPR: number
  squatPR_kg: number
  deadliftPR_kg: number
}

export function buildBenchmarkHistory(results: BenchmarkResult[]): BenchmarkHistory {
  if (results.length === 0) {
    return { results: [], pullUpPR: 0, pushUpPR: 0, squatPR_kg: 0, deadliftPR_kg: 0 }
  }
  return {
    results,
    pullUpPR: Math.max(...results.map(r => r.max_pull_ups)),
    pushUpPR: Math.max(...results.map(r => r.max_push_ups)),
    squatPR_kg: Math.max(...results.map(r => r.squat_e1rm_kg)),
    deadliftPR_kg: Math.max(...results.map(r => r.deadlift_e1rm_kg)),
  }
}
