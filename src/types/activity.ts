// ─── Activity Types ───────────────────────────────────────────────────────────
// For the Move hub (Z day / free activity logging).

export type ActivityType =
  | 'bike'
  | 'run'
  | 'hike'
  | 'ski'
  | 'swim'
  | 'yoga'
  | 'sport'
  | 'gym-other'
  | 'other'

export type ActivityCategory = 'cardio' | 'mobility' | 'logged-only'

/**
 * Counting logic (from context doc):
 *   - Any duration: always logged
 *   - 30+ min AND peak BPM ≥ 118 → counts as cardio event
 *   - 60+ min → full outdoor session
 *   - Yoga regardless of BPM → counts as mobility session
 *   - Dog walk / casual stroll → logged, not counted as cardio
 */
export interface ZActivity {
  id: string                   // UUID
  date: string                 // ISO 8601 date string (YYYY-MM-DD)
  type: ActivityType
  durationMinutes: number
  peakBPM?: number
  notes?: string
  // Derived fields
  countsAsCardio: boolean
  countsAsMobility: boolean
  isFullOutdoorSession: boolean // 60+ min
  category: ActivityCategory
}

// ─── Counting Logic ───────────────────────────────────────────────────────────

export const ZONE_2_MIN_BPM = 118 // for age 23, max HR ~197

export function categorizeActivity(
  type: ActivityType,
  durationMinutes: number,
  peakBPM?: number
): Pick<ZActivity, 'category' | 'countsAsCardio' | 'countsAsMobility' | 'isFullOutdoorSession'> {
  const isYoga = type === 'yoga'
  const hasCardioHR = (peakBPM ?? 0) >= ZONE_2_MIN_BPM
  const isLongEnough = durationMinutes >= 30
  const isFullSession = durationMinutes >= 60

  const countsAsCardio = !isYoga && isLongEnough && hasCardioHR
  const countsAsMobility = isYoga
  const isFullOutdoorSession = isFullSession

  let category: ActivityCategory
  if (countsAsMobility) {
    category = 'mobility'
  } else if (countsAsCardio) {
    category = 'cardio'
  } else {
    category = 'logged-only'
  }

  return { category, countsAsCardio, countsAsMobility, isFullOutdoorSession }
}

// ─── Interval Protocols ───────────────────────────────────────────────────────

export type IntervalProtocol =
  | '4x4-norwegian'
  | '30-30s'
  | '6x1min'
  | 'tabata'

export interface IntervalConfig {
  id: IntervalProtocol
  name: string
  description: string
  targetZone: string
  targetBPMRange: [number, number]
  blockPhase: string
  durationMinutes: number
}

export const INTERVAL_LIBRARY: IntervalConfig[] = [
  {
    id: '4x4-norwegian',
    name: '4×4 Norwegian',
    description: '4 intervals of 4 minutes at VO₂max intensity, 3 min active rest between',
    targetZone: 'Zone 4 (VO₂max)',
    targetBPMRange: [167, 197],
    blockPhase: 'Block 2 — VO₂max emphasis',
    durationMinutes: 28,
  },
  {
    id: '30-30s',
    name: '30-30s',
    description: '30 seconds on / 30 seconds off, 10–15 rounds',
    targetZone: 'Zone 3–4',
    targetBPMRange: [148, 197],
    blockPhase: 'Block 3 — Threshold + HIIT mix',
    durationMinutes: 15,
  },
  {
    id: '6x1min',
    name: '6×1 min',
    description: '6 efforts of 1 minute at hard effort, 90s rest',
    targetZone: 'Zone 4',
    targetBPMRange: [167, 197],
    blockPhase: 'Block 2–3',
    durationMinutes: 15,
  },
  {
    id: 'tabata',
    name: 'Tabata',
    description: '20 seconds max effort / 10 seconds off × 8 rounds',
    targetZone: 'Zone 4',
    targetBPMRange: [167, 197],
    blockPhase: 'Block 3 — HIIT finisher',
    durationMinutes: 8,
  },
]

// ─── Activity Summary ─────────────────────────────────────────────────────────

export interface ActivitySummary {
  totalActivities: number
  cardioEventsThisMonth: number
  mobilitySessionsThisMonth: number
  avgMinutesPerWeek: number
  lastActivity?: ZActivity
}
