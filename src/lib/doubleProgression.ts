// ─── Double Progression Engine ───────────────────────────────────────────────
// Reads previous lift logs and produces next-session weight/rep suggestions.
// Rule: hit top of rep range all sets at RPE ≤ 8 → add weight.
//       can't hit bottom of rep range → deload 10%.
//       otherwise → hold same weight.

import type { LiftLogEntry, LiftSet } from '../types/session'
import { getSessions } from './storage'

export type ProgressionSuggestion = 'increase' | 'hold' | 'deload'

export interface LiftSuggestion {
  liftId: string
  liftName: string
  suggestedWeight_kg: number
  suggestion: ProgressionSuggestion
  repRange: [number, number]
  sets: number
  lastWeight_kg: number
  lastSets: LiftSet[]
  reason: string
}

// Weight increments per lift type
const WEIGHT_INCREMENTS: Record<string, number> = {
  'barbell-squat':    5,
  'barbell-deadlift': 5,
  'barbell-bench':    2.5,
  'overhead-press':   2.5,
  'weighted-pull-up': 2.5,
  'weighted-dip':     2.5,
  'barbell-row':      2.5,
  'rdl':              5,
  'split-squat':      2.5,
}
const DEFAULT_INCREMENT = 2.5

function getIncrement(liftId: string): number {
  return WEIGHT_INCREMENTS[liftId] ?? DEFAULT_INCREMENT
}

// ─── Core logic ───────────────────────────────────────────────────────────────

export function evaluateProgression(
  liftId: string,
  lastEntry: LiftLogEntry,
  repRange: [number, number],
  targetSets: number
): { suggestion: ProgressionSuggestion; reason: string } {
  const completedSets = lastEntry.sets.filter(s => s.completed)

  if (completedSets.length === 0) {
    return { suggestion: 'hold', reason: 'No completed sets in last session.' }
  }

  const [minReps, maxReps] = repRange

  // Check if all sets hit top of range at RPE ≤ 8
  const allHitMax = completedSets.length >= targetSets &&
    completedSets.every(s => s.reps >= maxReps) &&
    completedSets.every(s => (s.rpe ?? 8) <= 8)

  if (allHitMax) {
    return {
      suggestion: 'increase',
      reason: `Hit ${maxReps} reps all ${targetSets} sets at RPE ≤ 8. Add weight.`,
    }
  }

  // Check if failing to hit bottom of range
  const failedToHitMin = completedSets.some(s => s.reps < minReps) ||
    completedSets.length < targetSets

  if (failedToHitMin) {
    return {
      suggestion: 'deload',
      reason: `Couldn't hit ${minReps} reps. Drop 10% and rebuild.`,
    }
  }

  return {
    suggestion: 'hold',
    reason: `Making progress. Hold weight, work toward ${maxReps} reps all sets.`,
  }
}

// ─── Get suggestion for a lift ────────────────────────────────────────────────

export function getLiftSuggestion(
  liftId: string,
  liftName: string,
  repRange: [number, number],
  targetSets: number,
  startingWeight_kg = 60
): LiftSuggestion {
  const sessions = getSessions()

  // Find all lift entries for this lift across all sessions, sorted newest first
  const allEntries: LiftLogEntry[] = sessions
    .flatMap(s => s.liftEntries ?? [])
    .filter(e => e.liftId === liftId)
    .sort((a, b) => b.date.localeCompare(a.date))

  if (allEntries.length === 0) {
    return {
      liftId,
      liftName,
      suggestedWeight_kg: startingWeight_kg,
      suggestion: 'hold',
      repRange,
      sets: targetSets,
      lastWeight_kg: startingWeight_kg,
      lastSets: [],
      reason: 'No previous data. Start at your working weight.',
    }
  }

  const lastEntry = allEntries[0]
  const lastWeight = lastEntry.sets[0]?.weight_kg ?? startingWeight_kg
  const { suggestion, reason } = evaluateProgression(liftId, lastEntry, repRange, targetSets)

  let suggestedWeight_kg = lastWeight
  const increment = getIncrement(liftId)

  if (suggestion === 'increase') {
    suggestedWeight_kg = Math.round((lastWeight + increment) * 4) / 4  // round to 0.25kg
  } else if (suggestion === 'deload') {
    suggestedWeight_kg = Math.round(lastWeight * 0.9 * 4) / 4
  }

  return {
    liftId,
    liftName,
    suggestedWeight_kg,
    suggestion,
    repRange,
    sets: targetSets,
    lastWeight_kg: lastWeight,
    lastSets: lastEntry.sets,
    reason,
  }
}

// ─── Suggestion badge helpers ─────────────────────────────────────────────────

export const SUGGESTION_CONFIG: Record<ProgressionSuggestion, {
  symbol: string
  label: string
  color: string
}> = {
  increase: { symbol: '↑', label: 'Increase', color: 'text-lime' },
  hold:     { symbol: '=', label: 'Hold',     color: 'text-yellow' },
  deload:   { symbol: '↓', label: 'Deload',   color: 'text-accent-3' },
}

// ─── Format weight for display ────────────────────────────────────────────────

export function formatWeight(kg: number): string {
  return kg % 1 === 0 ? `${kg}kg` : `${kg.toFixed(1)}kg`
}
