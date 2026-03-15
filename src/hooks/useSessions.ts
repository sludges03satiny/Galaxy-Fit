import { useState, useCallback } from 'react'
import type { Session } from '../types/session'
import { getSessions, saveSession, deleteSession, getLastSession } from '../lib/storage'

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>(() => getSessions())

  const add = useCallback((session: Session) => {
    saveSession(session)
    setSessions(getSessions())
  }, [])

  const remove = useCallback((id: string) => {
    deleteSession(id)
    setSessions(getSessions())
  }, [])

  const refresh = useCallback(() => {
    setSessions(getSessions())
  }, [])

  const last = getLastSession()

  const sessionsByDate = [...sessions].sort((a, b) =>
    b.date.localeCompare(a.date)
  )

  const recentSessions = sessionsByDate.slice(0, 5)

  const sessionsThisWeek = (() => {
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)
    const from = startOfWeek.toISOString().split('T')[0]
    return sessions.filter(s => s.date >= from)
  })()

  return {
    sessions,
    sessionsByDate,
    recentSessions,
    sessionsThisWeek,
    last,
    add,
    remove,
    refresh,
    totalCount: sessions.length,
  }
}
