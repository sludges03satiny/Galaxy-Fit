// ─── Storage Layer ────────────────────────────────────────────────────────────
// Typed localStorage wrapper for Galaxy Fit v1.
// All data stored as JSON under namespaced keys.

import type { Session } from '../types/session'
import type { SkillProgress } from '../types/skill'
import type { AthleteProfile } from '../types/athlete'
import type { BenchmarkResult } from '../types/benchmark'
import type { ZActivity } from '../types/activity'

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
}

export function getSessions(): Session[] {
  return read<Session[]>(KEYS.SESSIONS, [])
}

export function deleteSession(sessionId: string): void {
  const sessions = getSessions().filter(s => s.id !== sessionId)
  write(KEYS.SESSIONS, sessions)
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
  return read<SkillProgress>(KEYS.SKILL_PROGRESS, DEFAULT_SKILL_PROGRESS)
}

export function updateSkillNodeStatus(nodeId: string, update: Partial<SkillProgress>): void {
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
  return read<AthleteProfile | null>(KEYS.ATHLETE_PROFILE, null)
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
}

export function getBenchmarks(): BenchmarkResult[] {
  return read<BenchmarkResult[]>(KEYS.BENCHMARKS, [])
}

export function getLatestBenchmark(): BenchmarkResult | null {
  const benchmarks = getBenchmarks()
  if (benchmarks.length === 0) return null
  return benchmarks.sort((a, b) => b.date.localeCompare(a.date))[0]
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
  return read<ZActivity[]>(KEYS.ACTIVITIES, [])
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
