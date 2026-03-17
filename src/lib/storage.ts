// ─── Storage Layer ────────────────────────────────────────────────────────────
// Typed localStorage wrapper for Galaxy Fit v1.
// All data stored as JSON under namespaced keys.

import type { Session } from '../types/session'
import type { SkillProgress } from '../types/skill'
import type { NodeStatus } from '../types/skill'
import type { AthleteProfile } from '../types/athlete'
import { DEFAULT_ATHLETE, EQUIPMENT_OPTIONS } from '../types/athlete'
import type { BenchmarkResult } from '../types/benchmark'
import type { ZActivity } from '../types/activity'
import { uuid } from './uuid'

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const KEYS = {
  SESSIONS: 'gf_sessions',
  SKILL_PROGRESS: 'gf_skill_progress',
  ATHLETE_PROFILE: 'gf_athlete_profile',
  BENCHMARKS: 'gf_benchmarks',
  ACTIVITIES: 'gf_activities',
  LIFT_PROGRESSION: 'gf_lift_progression',
} as const

// ─── Generic Helpers ──────────────────────────────────────────────────────────

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    console.warn(`[Storage] Failed to read key: ${key}`)
    return fallback
  }
}

function write<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.error(`[Storage] Failed to write key: ${key}`, e)
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null
}

function normalizeRecord<T>(
  value: unknown,
  isValid: (v: unknown) => v is T
): Record<string, T> {
  if (!isRecord(value)) return {}
  const out: Record<string, T> = {}
  for (const [key, val] of Object.entries(value)) {
    if (isValid(val)) out[key] = val
  }
  return out
}

function isNodeStatus(value: unknown): value is NodeStatus {
  return value === 'locked' || value === 'active' || value === 'unlocked'
}

function isTimeTier(value: unknown): value is AthleteProfile['defaultTimeTier'] {
  return value === 30 || value === 45 || value === 60 || value === 90
}

function isSessionLike(value: unknown): value is Session {
  return isRecord(value) && typeof value.id === 'string' && typeof value.date === 'string'
}

function isBenchmarkLike(value: unknown): value is BenchmarkResult {
  return isRecord(value) && typeof value.id === 'string' && typeof value.date === 'string'
}

function isActivityLike(value: unknown): value is ZActivity {
  return isRecord(value) && typeof value.id === 'string' && typeof value.date === 'string'
}

function normalizeSkillProgress(raw: unknown): SkillProgress {
  if (!isRecord(raw)) return DEFAULT_SKILL_PROGRESS
  return {
    nodeStatuses: normalizeRecord(raw.nodeStatuses, isNodeStatus),
    sessionCounts: normalizeRecord(raw.sessionCounts, (v): v is number => typeof v === 'number' && Number.isFinite(v)),
    streaks: normalizeRecord(raw.streaks, (v): v is number => typeof v === 'number' && Number.isFinite(v)),
    lastDemotion: normalizeRecord(raw.lastDemotion, (v): v is string => typeof v === 'string'),
  }
}

function normalizeAthleteProfile(raw: unknown): AthleteProfile | null {
  if (!isRecord(raw)) return null

  const now = new Date().toISOString()
  const allowedEquipment = new Set<string>(EQUIPMENT_OPTIONS.map(o => o.id))

  const blockRaw = isRecord(raw.blockPosition) ? raw.blockPosition : {}
  const nextDayType =
    blockRaw.nextDayType === 'A' || blockRaw.nextDayType === 'B' || blockRaw.nextDayType === 'C'
      ? blockRaw.nextDayType
      : DEFAULT_ATHLETE.blockPosition.nextDayType

  const phase =
    blockRaw.phase === 'accumulation' ||
    blockRaw.phase === 'deload' ||
    blockRaw.phase === 'intensification' ||
    blockRaw.phase === 'realization'
      ? blockRaw.phase
      : DEFAULT_ATHLETE.blockPosition.phase

  const blockPosition = {
    ...DEFAULT_ATHLETE.blockPosition,
    blockNumber: asNumber(blockRaw.blockNumber) ?? DEFAULT_ATHLETE.blockPosition.blockNumber,
    weekInBlock: asNumber(blockRaw.weekInBlock) ?? DEFAULT_ATHLETE.blockPosition.weekInBlock,
    phase,
    isDeloadWeek: asBoolean(blockRaw.isDeloadWeek) ?? DEFAULT_ATHLETE.blockPosition.isDeloadWeek,
    sessionCount: asNumber(blockRaw.sessionCount) ?? DEFAULT_ATHLETE.blockPosition.sessionCount,
    nextDayType,
  }

  const activeSkillsRaw = isRecord(raw.activeSkills) ? raw.activeSkills : {}
  const activeSkills: AthleteProfile['activeSkills'] = {
    pulling: asString(activeSkillsRaw.pulling) ?? undefined,
    pushing: asString(activeSkillsRaw.pushing) ?? undefined,
    balance: asString(activeSkillsRaw.balance) ?? undefined,
    mobility: asString(activeSkillsRaw.mobility) ?? undefined,
  }

  const equipment =
    Array.isArray(raw.equipment)
      ? raw.equipment
          .filter((e): e is string => typeof e === 'string')
          .filter(e => allowedEquipment.has(e))
      : DEFAULT_ATHLETE.equipment

  return {
    ...DEFAULT_ATHLETE,
    id: asString(raw.id) ?? uuid(),
    name: asString(raw.name) ?? DEFAULT_ATHLETE.name,
    avatarEmoji: asString(raw.avatarEmoji) ?? DEFAULT_ATHLETE.avatarEmoji,
    dateOfBirth: asString(raw.dateOfBirth) ?? DEFAULT_ATHLETE.dateOfBirth,
    heightCm: asNumber(raw.heightCm) ?? DEFAULT_ATHLETE.heightCm,
    weightKg: asNumber(raw.weightKg) ?? DEFAULT_ATHLETE.weightKg,
    units: raw.units === 'metric' || raw.units === 'imperial' ? raw.units : DEFAULT_ATHLETE.units,
    equipment,
    blockPosition,
    activeSkills,
    defaultTimeTier: isTimeTier(raw.defaultTimeTier) ? raw.defaultTimeTier : DEFAULT_ATHLETE.defaultTimeTier,
    vo2maxEstimate: asNumber(raw.vo2maxEstimate) ?? DEFAULT_ATHLETE.vo2maxEstimate,
    customActivityTypes: Array.isArray(raw.customActivityTypes)
      ? raw.customActivityTypes
          .filter(isRecord)
          .map(v => ({
            id: asString(v.id) ?? '',
            name: asString(v.name) ?? '',
            emoji: asString(v.emoji) ?? '',
          }))
          .filter(v => v.id && v.name && v.emoji)
      : DEFAULT_ATHLETE.customActivityTypes,
    appleWatchEnabled: asBoolean(raw.appleWatchEnabled) ?? DEFAULT_ATHLETE.appleWatchEnabled,
    createdAt: asString(raw.createdAt) ?? now,
    updatedAt: asString(raw.updatedAt) ?? now,
  }
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export function saveSession(session: Session): void {
  const sessions = getSessions()
  const existingIndex = sessions.findIndex(s => s.id === session.id)
  if (existingIndex >= 0) {
    sessions[existingIndex] = session
  } else {
    sessions.push(session)
  }
  write(KEYS.SESSIONS, sessions)
  window.dispatchEvent(new Event('galaxyfit:session-saved'))
}

export function getSessions(): Session[] {
  const raw = read<unknown>(KEYS.SESSIONS, [])
  return Array.isArray(raw) ? raw.filter(isSessionLike) : []
}

export function deleteSession(sessionId: string): void {
  const sessions = getSessions().filter(s => s.id !== sessionId)
  write(KEYS.SESSIONS, sessions)
  window.dispatchEvent(new Event('galaxyfit:session-saved'))
}

export function getSessionsByDateRange(from: string, to: string): Session[] {
  return getSessions().filter(s => s.date >= from && s.date <= to)
}

export function getLastSession(): Session | null {
  const sessions = getSessions()
  if (sessions.length === 0) return null
  return sessions.sort((a, b) => b.date.localeCompare(a.date))[0]
}

// ─── Skill Progress ───────────────────────────────────────────────────────────

const DEFAULT_SKILL_PROGRESS: SkillProgress = {
  nodeStatuses: {},
  sessionCounts: {},
  streaks: {},
  lastDemotion: {},
}

export function saveSkillProgress(progress: SkillProgress): void {
  write(KEYS.SKILL_PROGRESS, progress)
}

export function getSkillProgress(): SkillProgress {
  const raw = read<unknown>(KEYS.SKILL_PROGRESS, DEFAULT_SKILL_PROGRESS)
  return normalizeSkillProgress(raw)
}

export function updateSkillNodeStatus(update: Partial<SkillProgress>): void {
  const current = getSkillProgress()
  const merged: SkillProgress = {
    nodeStatuses: { ...current.nodeStatuses, ...(update.nodeStatuses ?? {}) },
    sessionCounts: { ...current.sessionCounts, ...(update.sessionCounts ?? {}) },
    streaks: { ...current.streaks, ...(update.streaks ?? {}) },
    lastDemotion: { ...current.lastDemotion, ...(update.lastDemotion ?? {}) },
  }
  saveSkillProgress(merged)
}

// ─── Athlete Profile ──────────────────────────────────────────────────────────

export function saveAthleteProfile(profile: AthleteProfile): void {
  write(KEYS.ATHLETE_PROFILE, {
    ...profile,
    updatedAt: new Date().toISOString(),
  })
}

export function getAthleteProfile(): AthleteProfile | null {
  const raw = read<unknown | null>(KEYS.ATHLETE_PROFILE, null)
  if (raw === null) return null
  return normalizeAthleteProfile(raw)
}

// ─── Benchmarks ───────────────────────────────────────────────────────────────

export function saveBenchmark(result: BenchmarkResult): void {
  const benchmarks = getBenchmarks()
  const existingIndex = benchmarks.findIndex(b => b.id === result.id)
  if (existingIndex >= 0) {
    benchmarks[existingIndex] = result
  } else {
    benchmarks.push(result)
  }
  write(KEYS.BENCHMARKS, benchmarks)
  // Dispatch event so other components can react to benchmark updates
  window.dispatchEvent(new Event('galaxyfit:benchmark-saved'))
}

export function getBenchmarks(): BenchmarkResult[] {
  const raw = read<unknown>(KEYS.BENCHMARKS, [])
  return Array.isArray(raw) ? raw.filter(isBenchmarkLike) : []
}

export function getLatestBenchmark(): BenchmarkResult | null {
  const benchmarks = getBenchmarks()
  if (benchmarks.length === 0) return null
  return benchmarks.sort((a, b) => b.date.localeCompare(a.date))[0]
}

export function deleteBenchmark(id: string): void {
  const benchmarks = getBenchmarks().filter(b => b.id !== id)
  write(KEYS.BENCHMARKS, benchmarks)
}

// ─── Activities (Z Days) ──────────────────────────────────────────────────────

export function saveActivity(activity: ZActivity): void {
  const activities = getActivities()
  const existingIndex = activities.findIndex(a => a.id === activity.id)
  if (existingIndex >= 0) {
    activities[existingIndex] = activity
  } else {
    activities.push(activity)
  }
  write(KEYS.ACTIVITIES, activities)
}

export function getActivities(): ZActivity[] {
  const raw = read<unknown>(KEYS.ACTIVITIES, [])
  return Array.isArray(raw) ? raw.filter(isActivityLike) : []
}

export function getActivitiesThisWeek(): ZActivity[] {
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)
  const from = startOfWeek.toISOString().split('T')[0]
  return getActivities().filter(a => a.date >= from)
}

// ─── Export / Import ──────────────────────────────────────────────────────────

export interface GalaxyFitExport {
  version: string
  exportedAt: string
  data: {
    sessions: Session[]
    skillProgress: SkillProgress
    athleteProfile: AthleteProfile | null
    benchmarks: BenchmarkResult[]
    activities: ZActivity[]
  }
}

export function exportData(): string {
  const payload: GalaxyFitExport = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    data: {
      sessions: getSessions(),
      skillProgress: getSkillProgress(),
      athleteProfile: getAthleteProfile(),
      benchmarks: getBenchmarks(),
      activities: getActivities(),
    },
  }
  return JSON.stringify(payload, null, 2)
}

export function importData(json: string): void {
  try {
    const payload = JSON.parse(json) as GalaxyFitExport

    if (!payload.data) {
      throw new Error('Invalid export format: missing data field')
    }

    const { sessions, skillProgress, athleteProfile, benchmarks, activities } = payload.data

    if (Array.isArray(sessions)) write(KEYS.SESSIONS, sessions)
    if (skillProgress) write(KEYS.SKILL_PROGRESS, skillProgress)
    if (athleteProfile) write(KEYS.ATHLETE_PROFILE, athleteProfile)
    if (Array.isArray(benchmarks)) write(KEYS.BENCHMARKS, benchmarks)
    if (Array.isArray(activities)) write(KEYS.ACTIVITIES, activities)

    console.info(`[Storage] Import complete — ${sessions?.length ?? 0} sessions restored`)
  } catch (e) {
    console.error('[Storage] Import failed:', e)
    throw new Error(`Import failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
  }
}

export function clearAllData(): void {
  Object.values(KEYS).forEach(key => localStorage.removeItem(key))
}
