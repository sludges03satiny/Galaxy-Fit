// ─── Athlete Types ───────────────────────────────────────────────────────────

import type { ReadinessState, TimeTier } from './session'
import type { ActiveSkillSelection } from './skill'

// ─── Readiness Light ──────────────────────────────────────────────────────────

export interface ReadinessInputs {
  sleepScore: number    // 0–100 (Apple Watch sleep score as percentage)
  stressScore: number   // 1–10
}

export interface ReadinessLight {
  state: ReadinessState
  sleepScore: number
  stressScore: number
  label: string
  description: string
}

/**
 * Readiness light logic (from context doc — the CORRECT version, sleep on 0–100 scale):
 *   Green:  sleep ≥ 70 AND stress ≤ 5
 *   Yellow: sleep 60–69 OR stress 6–7 (but not both bad)
 *   Red:    sleep < 60 OR stress ≥ 8 (either condition alone triggers red)
 */
export function computeReadiness(inputs: ReadinessInputs): ReadinessLight {
  const { sleepScore, stressScore } = inputs

  let state: ReadinessState
  let label: string
  let description: string

  if (sleepScore < 60 || stressScore >= 8) {
    state = 'red'
    label = 'RECOVERY MODE'
    description = 'Skill + 1 main lift only. No conditioning today.'
  } else if (sleepScore >= 70 && stressScore <= 5) {
    state = 'green'
    label = 'OPTIMAL'
    description = 'Train as programmed. Optional top set available.'
  } else {
    state = 'yellow'
    label = 'MODERATE'
    description = 'Drop RPE by 1. Skip HIIT finisher. Keep skill work.'
  }

  return { state, sleepScore, stressScore, label, description }
}

// ─── Block Position ───────────────────────────────────────────────────────────

export type BlockPhase = 'accumulation' | 'deload' | 'intensification' | 'realization'

export interface BlockPosition {
  blockNumber: number       // 1, 2, 3, ...
  weekInBlock: number       // 1–12
  phase: BlockPhase
  isDeloadWeek: boolean
  sessionCount: number      // sessions completed this block
  // Rolling A/B/C sequence — what comes next
  nextDayType: 'A' | 'B' | 'C'
}

/**
 * Phase boundaries (12-week block):
 *   Weeks 1–4:  Accumulation
 *   Week 5:     Deload
 *   Weeks 6–9:  Intensification
 *   Week 10:    Deload
 *   Weeks 11–12: Realization
 */
export function getPhaseForWeek(week: number): { phase: BlockPhase; isDeloadWeek: boolean } {
  if (week === 5 || week === 10) return { phase: 'deload', isDeloadWeek: true }
  if (week <= 4) return { phase: 'accumulation', isDeloadWeek: false }
  if (week <= 9) return { phase: 'intensification', isDeloadWeek: false }
  return { phase: 'realization', isDeloadWeek: false }
}

export interface PhaseConfig {
  phase: BlockPhase
  setsXReps: string
  rpe: string
  load: string
}

export const PHASE_CONFIGS: Record<BlockPhase, PhaseConfig> = {
  accumulation: {
    phase: 'accumulation',
    setsXReps: '3–4 × 5–8',
    rpe: '6–7',
    load: '60–65% 1RM',
  },
  deload: {
    phase: 'deload',
    setsXReps: '3 × 5–8',
    rpe: '5–6',
    load: '50–60% 1RM',
  },
  intensification: {
    phase: 'intensification',
    setsXReps: '4 × 4–6',
    rpe: '7–8',
    load: '75–80% 1RM',
  },
  realization: {
    phase: 'realization',
    setsXReps: '4–5 × 3–5',
    rpe: '8–9',
    load: '82–88% 1RM',
  },
}

// ─── HR Zones ─────────────────────────────────────────────────────────────────

export interface HRZone {
  zone: 1 | 2 | 3 | 4
  name: string
  bpmRange: [number, number]
  description: string
}

// HR zones are now computed dynamically via src/lib/hrZones.ts
// Never hardcode BPM values here. Use getHRZones(profile.dateOfBirth).

// ─── Equipment ────────────────────────────────────────────────────────────────

export const EQUIPMENT_OPTIONS = [
  { id: 'barbell-rack',     label: 'Barbell + Rack',    icon: '🏋️' },
  { id: 'pull-up-bar',      label: 'Pull-Up Bar',        icon: '🔝' },
  { id: 'dip-bars-rings',   label: 'Dip Bars / Rings',   icon: '⭕' },
  { id: 'resistance-bands', label: 'Resistance Bands',   icon: '🔗' },
  { id: 'dumbbells',        label: 'Dumbbells',          icon: '🏃' },
  { id: 'kettlebell',       label: 'Kettlebell',         icon: '🔔' },
  { id: 'gymnastics-rings', label: 'Gymnastics Rings',   icon: '🤸' },
  { id: 'outdoor-park',     label: 'Outdoor Park',       icon: '🌳' },
  { id: 'mountain-bike',    label: 'Mountain Bike',      icon: '🚵' },
  { id: 'treadmill-rower',  label: 'Treadmill / Rower',  icon: '🚣' },
] as const

export type EquipmentId = typeof EQUIPMENT_OPTIONS[number]['id']

// ─── Athlete Profile ──────────────────────────────────────────────────────────

export interface AthleteProfile {
  // Identity
  id: string                    // uuid
  name: string
  avatarEmoji: string           // default: '🏋️'
  dateOfBirth: string           // ISO date e.g. "2002-08-14"
  heightCm: number
  weightKg?: number

  // Units
  units: 'metric' | 'imperial'

  // Equipment — granular list (replaces boolean flags)
  equipment: string[]           // IDs from EQUIPMENT_OPTIONS

  // Current position in the program
  blockPosition: BlockPosition

  // Skill selections (one per tree)
  activeSkills: ActiveSkillSelection

  // Defaults
  defaultTimeTier: TimeTier

  // VO2max (updated on benchmark days)
  vo2maxEstimate?: number

  // Custom activity types (v2 Move hub)
  customActivityTypes?: { id: string; name: string; emoji: string }[]

  // Apple Watch integration flag (v2)
  appleWatchEnabled?: boolean

  // Timestamps
  createdAt: string
  updatedAt: string
}

export const DEFAULT_ATHLETE: AthleteProfile = {
  id: 'default',
  name: 'Athlete',
  avatarEmoji: '🏋️',
  dateOfBirth: '2002-01-01',
  heightCm: 170,
  units: 'metric',
  equipment: [
    'barbell-rack',
    'pull-up-bar',
    'dip-bars-rings',
    'resistance-bands',
    'gymnastics-rings',
    'outdoor-park',
    'mountain-bike',
  ],
  blockPosition: {
    blockNumber: 1,
    weekInBlock: 1,
    phase: 'accumulation',
    isDeloadWeek: false,
    sessionCount: 0,
    nextDayType: 'A',
  },
  activeSkills: {},
  defaultTimeTier: 60,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}
