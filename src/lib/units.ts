// ─── Units Utility ────────────────────────────────────────────────────────────
// All displayed measurements in Galaxy Fit pass through these functions.
// Stored values are always metric internally — convert at display time only.

export type Units = 'metric' | 'imperial'

/**
 * Raw kg → lb conversion, no rounding.
 */
export function kgToLb(kg: number): number {
  return kg * 2.20462
}

/**
 * Raw lb → kg conversion, no rounding.
 */
export function lbToKg(lb: number): number {
  return lb / 2.20462
}

/**
 * Display a weight value.
 * metric:   "100 kg" | "72.5 kg"  (one decimal if not whole number)
 * imperial: "220 lb" | "159.5 lb" (rounded to nearest 0.5 lb)
 */
export function displayWeight(kg: number, units: Units): string {
  if (units === 'imperial') {
    const lb = kgToLb(kg)
    const rounded = Math.round(lb * 2) / 2
    return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)} lb`
  }
  // metric
  if (kg % 1 === 0) return `${kg} kg`
  return `${kg.toFixed(1)} kg`
}

/**
 * Display a distance (e.g. toe touch).
 * metric:   "5 cm" | "-3 cm"
 * imperial: "2.0 in" | "-1.2 in" (1 decimal)
 */
export function displayDistance(cm: number, units: Units): string {
  if (units === 'imperial') {
    const inches = cm / 2.54
    return `${inches.toFixed(1)} in`
  }
  return `${cm} cm`
}

/**
 * Display a height value.
 * metric:   "170 cm"
 * imperial: "5'7\""
 */
export function displayHeight(cm: number, units: Units): string {
  if (units === 'imperial') {
    const totalInches = cm / 2.54
    const feet = Math.floor(totalInches / 12)
    const inches = Math.round(totalInches % 12)
    return `${feet}'${inches}"`
  }
  return `${cm} cm`
}

/**
 * Returns the double progression weight increment in the display unit.
 * metric lower: 2.5 kg | metric upper: 1.25 kg
 * imperial lower: 5 lb  | imperial upper: 2.5 lb
 */
export function weightIncrement(units: Units, bodyPart: 'lower' | 'upper'): number {
  if (units === 'imperial') {
    return bodyPart === 'lower' ? 5 : 2.5
  }
  return bodyPart === 'lower' ? 2.5 : 1.25
}
