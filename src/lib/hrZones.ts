// ─── HR Zones Utility ─────────────────────────────────────────────────────────
// All HR values in Galaxy Fit derive from this file.
// Never hardcode BPM values anywhere else — always call these functions.

/**
 * Returns current age in full years using today's date.
 * @param dob ISO date string e.g. "2002-08-14"
 */
export function getAge(dob: string): number {
  const birth = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

/**
 * Returns 220 - age, rounded to integer.
 */
export function getMaxHR(dob: string): number {
  return 220 - getAge(dob)
}

/**
 * Returns Zone 2 lower bound: 60% of max HR, rounded.
 */
export function getZone2Min(dob: string): number {
  return Math.round(getMaxHR(dob) * 0.60)
}

/**
 * Returns Zone 2 upper bound: 75% of max HR, rounded.
 */
export function getZone2Max(dob: string): number {
  return Math.round(getMaxHR(dob) * 0.75)
}

export interface HRZoneConfig {
  zone: 1 | 2 | 3 | 4
  name: string
  bpmMin: number
  bpmMax: number
  description: string
}

/**
 * Returns all 4 HR zones computed from date of birth.
 * Zone 1: 0–59% maxHR     — Recovery
 * Zone 2: 60–75% maxHR    — Aerobic Base
 * Zone 3: 76–85% maxHR    — Threshold
 * Zone 4: 86–100% maxHR   — VO₂max
 */
export function getHRZones(dob: string): HRZoneConfig[] {
  const maxHR = getMaxHR(dob)

  return [
    {
      zone: 1,
      name: 'Recovery',
      bpmMin: 0,
      bpmMax: Math.round(maxHR * 0.59),
      description: 'Easy movement, active recovery',
    },
    {
      zone: 2,
      name: 'Aerobic Base',
      bpmMin: Math.round(maxHR * 0.60),
      bpmMax: Math.round(maxHR * 0.75),
      description: 'Sustainable effort, fat oxidation',
    },
    {
      zone: 3,
      name: 'Threshold',
      bpmMin: Math.round(maxHR * 0.76),
      bpmMax: Math.round(maxHR * 0.85),
      description: 'Comfortably hard, tempo pace',
    },
    {
      zone: 4,
      name: 'VO₂max',
      bpmMin: Math.round(maxHR * 0.86),
      bpmMax: maxHR,
      description: 'High intensity intervals',
    },
  ]
}
