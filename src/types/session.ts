// ─── Session Types ───────────────────────────────────────────────────────────
// Matches logic-spec.md §7 schema exactly.

import type { DayType } from './skill'

export type ReadinessState = 'green' | 'yellow' | 'red'
export type SessionFeel = 'neutral' | 'good' | 'strong' // 😐 🙂 💪
export type TimeTier = 30 | 45 | 60 | 90

// ─── Skill Logging ───────────────────────────────────────────────────────────

export interface SkillSet {
  setNumber: number
  hold_seconds?: number   // for timed holds
  reps?: number           // for rep-based skills
  rpe: number             // 1–10
  completed: boolean      // false if set was aborted early
}

export interface SkillLogEntry {
  nodeId: string          // skill node ID
  sessionId: string       // parent session ID
  date: string            // ISO 8601
  sets: SkillSet[]
  notes?: string
}

// ─── Lift Logging ────────────────────────────────────────────────────────────

export interface LiftSet {
  setNumber: number
  weight_kg: number
  reps: number
  rpe?: number
  completed: boolean
}

export interface LiftLogEntry {
  liftId: string          // e.g. "barbell-squat", "weighted-pull-up"
  liftName: string        // human-readable
  sessionId: string
  date: string            // ISO 8601
  sets: LiftSet[]
  // Double progression tracking
  suggestion?: 'increase' | 'hold' | 'deload'
  notes?: string
}

// ─── Conditioning Logging ─────────────────────────────────────────────────────

export interface ConditioningLogEntry {
  sessionId: string
  type: 'hiit' | 'intervals' | 'zone2'
  protocol?: string       // e.g. "4x4 Norwegian", "30-30s"
  durationMinutes: number
  peakBPM?: number
  avgBPM?: number
  notes?: string
}

// ─── Core Logging ────────────────────────────────────────────────────────────

export interface CoreLogEntry {
  sessionId: string
  exercise: string
  sets: number
  reps?: number
  hold_seconds?: number
  repsOrDuration?: string   // display string from session template (e.g. "10 reps", "30s")
  notes?: string
}

// ─── Full Session ────────────────────────────────────────────────────────────

export interface Session {
  id: string                          // UUID
  date: string                        // ISO 8601 date string
  dayType: DayType
  blockNumber: number
  weekInBlock: number
  phase: 'accumulation' | 'deload' | 'intensification' | 'realization'
  readiness: ReadinessState
  sleepScore: number                  // 0–100 (Apple Watch sleep score)
  stressScore: number                 // 1–10
  timeTier: TimeTier
  durationActualMinutes?: number
  peakBPM?: number
  feel?: SessionFeel
  notes?: string

  // Session content
  skillEntries: SkillLogEntry[]
  liftEntries: LiftLogEntry[]
  conditioningEntry?: ConditioningLogEntry
  coreEntries: CoreLogEntry[]

  // Metadata
  completedAt?: string                // ISO 8601
  isDeloadSession: boolean
}

// ─── Session Template (generated, not yet logged) ────────────────────────────

export interface WarmUpExercise {
  name: string
  duration?: string
  reps?: number
  notes?: string
}

export interface SessionTemplate {
  dayType: DayType
  timeTier: TimeTier
  readiness: ReadinessState
  warmUp: WarmUpExercise[]
  skillBlocks: PlannedSkillBlock[]
  liftBlocks: PlannedLiftBlock[]
  accessoryBlocks: PlannedAccessoryBlock[]
  conditioningBlock?: PlannedConditioningBlock
  coreBlocks: PlannedCoreBlock[]
}

export interface PlannedSkillBlock {
  nodeId: string
  nodeName: string
  sets: number
  targetHoldSeconds?: number
  targetReps?: number
  placement: 'before_strength' | 'after_strength'
}

export interface PlannedLiftBlock {
  liftId: string
  liftName: string
  sets: number
  repRange: [number, number]
  targetRPE: number
  suggestedWeight_kg?: number
  isPrimary: boolean
}

export interface PlannedAccessoryBlock {
  name: string
  sets: number
  repsOrDuration: string
  isSkillSpecific: boolean
  nodeId?: string
}

export interface PlannedConditioningBlock {
  protocol: string
  durationMinutes: number
  targetZone: string
  description: string
}

export interface PlannedCoreBlock {
  exercise: string
  sets: number
  repsOrDuration: string
  plane: 'anterior' | 'compression' | 'anti-extension' | 'anti-rotation' | 'posterior'
}

// ─── Double Progression State ─────────────────────────────────────────────────

export interface LiftProgressionState {
  liftId: string
  liftName: string
  currentWeight_kg: number
  targetRepRange: [number, number]
  targetSets: number
  lastSessionSets: LiftSet[]
  suggestion: 'increase' | 'hold' | 'deload'
  consecutiveCompletions: number
}
