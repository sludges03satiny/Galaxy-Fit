import { useState, useCallback } from 'react'
import type { AthleteProfile } from '../types/athlete'
import { DEFAULT_ATHLETE } from '../types/athlete'
import { getAthleteProfile, saveAthleteProfile } from '../lib/storage'

export function useAthleteProfile() {
  const [isFirstRun] = useState<boolean>(() => !getAthleteProfile())
  const [profile, setProfile] = useState<AthleteProfile>(() => {
    return getAthleteProfile() ?? DEFAULT_ATHLETE
  })

  const update = useCallback((partial: Partial<AthleteProfile>) => {
    setProfile(prev => {
      const next = { ...prev, ...partial, updatedAt: new Date().toISOString() }
      saveAthleteProfile(next)
      return next
    })
  }, [])

  return { profile, update, isFirstRun }
}
