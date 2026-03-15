// ─── Benchmark Types ─────────────────────────────────────────────────────────
// Matches the test battery defined in the Benchmarks hub spec.

export interface BenchmarkResult {
  id: string              // UUID
  date: string            // ISO 8601
  blockNumber: number
  weekInBlock: number     // should be 5 or 10 (deload weeks)

  // ─── Strength ────────────────────────────────────────────────────────────
  /** Max strict pull-ups (1 set to failure) */
  max_pull_ups: number

  /** Max push-ups (1 set to failure) */
  max_push_ups: number

  /** Max dips (1 set to failure, parallel bars) */
  max_dips: number

  /** 3-rep squat weight used for Epley 1RM estimate */
  squat_3rep_kg: number
  /** Estimated squat 1RM via Epley formula */
  squat_estimated_1rm_kg: number

  /** 3-rep deadlift weight used for Epley 1RM estimate */
  deadlift_3rep_kg: number
  /** Estimated deadlift 1RM via Epley formula */
  deadlift_estimated_1rm_kg: number

  // ─── Skills ──────────────────────────────────────────────────────────────
  /** Best of 3 handstand hold attempts (seconds) */
  handstand_hold_seconds: number

  /** Best of 3 front lever hold attempts (seconds + level name) */
  front_lever_hold_seconds: number
  front_lever_level: string           // e.g. "tuck-front-lever"

  // ─── Mobility ────────────────────────────────────────────────────────────
  /** Toe touch distance from floor in cm (negative = past floor) */
  toe_touch_cm: number

  // ─── Cardio ──────────────────────────────────────────────────────────────
  /** VO₂max estimate from Apple Watch */
  vo2max_estimate?: number

  /** Apple Watch 7-day average resting HR */
  resting_hr_bpm?: number

  // ─── Notes ───────────────────────────────────────────────────────────────
  notes?: string
}

// ─── Epley Formula ────────────────────────────────────────────────────────────

/**
 * Epley 1RM formula: weight × (1 + reps / 30)
 */
export function epley1RM(weight_kg: number, reps: number): number {
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

// ─── Benchmark History ────────────────────────────────────────────────────────

export interface BenchmarkHistory {
  results: BenchmarkResult[]
  // Derived trends
  pullUpPR: number
  pushUpPR: number
  squatPR_kg: number
  deadliftPR_kg: number
}
