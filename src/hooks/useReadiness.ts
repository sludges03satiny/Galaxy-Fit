import { useState, useMemo } from 'react'
import type { ReadinessLight } from '../types/athlete'
import { computeReadiness } from '../types/athlete'

export function useReadiness(initialSleep = 75, initialStress = 5) {
  const [sleepScore, setSleepScore] = useState(initialSleep)
  const [stressScore, setStressScore] = useState(initialStress)

  const readiness: ReadinessLight = useMemo(
    () => computeReadiness({ sleepScore, stressScore }),
    [sleepScore, stressScore]
  )

  return {
    readiness,
    sleepScore,
    stressScore,
    setSleepScore,
    setStressScore,
  }
}
