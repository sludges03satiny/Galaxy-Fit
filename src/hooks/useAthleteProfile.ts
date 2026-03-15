import { useState, useCallback } from 'react'
import type { AthleteProfile } from '../types/athlete'
import { DEFAULT_ATHLETE } from '../types/athlete'
import { getAthleteProfile, saveAthleteProfile } from '../lib/storage'
import type { SkillTree } from '../types/skill'

export function useAthleteProfile() {
  const [isFirstRun, setIsFirstRun] = useState<boolean>(() => !getAthleteProfile())
  const [profile, setProfile] = useState<AthleteProfile>(() => {
    return getAthleteProfile() ?? DEFAULT_ATHLETE
  })

  const update = useCallback((partial: Partial<AthleteProfile>) => {
    setProfile(prev => {
      const next = { ...prev, ...partial, updatedAt: new Date().toISOString() }
      saveAthleteProfile(next)
      return next
    })
    // After saving a profile for the first time, clear the first-run gate
    setIsFirstRun(false)
  }, [])

  /**
   * Set the active skill selection for a given tree.
   * Persists to athlete profile and immediately affects session generation.
   */
  const updateActiveSkill = useCallback((tree: SkillTree, nodeId: string) => {
    setProfile(prev => {
      const next: AthleteProfile = {
        ...prev,
        activeSkills: {
          ...(prev.activeSkills ?? {}),
          [tree]: nodeId,
        },
        updatedAt: new Date().toISOString(),
      }
      saveAthleteProfile(next)
      return next
    })
  }, [])

  return { profile, update, updateActiveSkill, isFirstRun }
}
