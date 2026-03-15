// ─── Session Wizard State Machine ────────────────────────────────────────────
// Steps: readiness → time → active → complete
// Manages the full lifecycle of a single training session.

import { useState, useCallback, useRef } from 'react'
import { uuid } from '../lib/uuid'
import type { Session, SessionTemplate, LiftLogEntry, LiftSet, SkillLogEntry, SkillSet, CoreLogEntry, TimeTier, SessionFeel } from '../types/session'
import type { ReadinessState } from '../types/session'
import type { AthleteProfile } from '../types/athlete'
import { computeReadiness } from '../types/athlete'
import { generateSession } from '../lib/sessionGenerator'
import { saveSession } from '../lib/storage'
import skillsData from '../data/skills.json'
import type { SkillsData } from '../types/skill'

const skills = skillsData as SkillsData

export type WizardStep = 'readiness' | 'time' | 'active' | 'complete'

// Per-lift logging state during active session
export interface ActiveLiftState {
  liftId: string
  liftName: string
  sets: Array<{
    setNumber: number
    weight_kg: number
    reps: number
    rpe: number
    completed: boolean
    editing: boolean
  }>
  targetSets: number
  repRange: [number, number]
  suggestedWeight_kg: number
  suggestion: 'increase' | 'hold' | 'deload'
  expanded: boolean
}

// Per-skill logging state during active session
export interface ActiveSkillState {
  nodeId: string
  nodeName: string
  sets: Array<{
    setNumber: number
    hold_seconds: number
    reps: number
    rpe: number
    completed: boolean
  }>
  targetSets: number
  targetHoldSeconds?: number
  targetReps?: number
  isTimedHold: boolean
  expanded: boolean
}

export interface WizardState {
  step: WizardStep
  sleepScore: number
  stressScore: number
  timeTier: TimeTier
  template: SessionTemplate | null
  startedAt: string | null
  // Active logging
  warmUpDone: boolean
  liftStates: ActiveLiftState[]
  skillStates: ActiveSkillState[]
  coresDone: boolean
  conditioningDone: boolean
  peakBPM: string
  feel: SessionFeel | null
  sessionNote: string
}

export function useSessionWizard(profile: AthleteProfile) {
  const sessionId = useRef(uuid())

  const [state, setState] = useState<WizardState>({
    step: 'readiness',
    sleepScore: 7,
    stressScore: 5,
    timeTier: profile.defaultTimeTier,
    template: null,
    startedAt: null,
    warmUpDone: false,
    liftStates: [],
    skillStates: [],
    coresDone: false,
    conditioningDone: false,
    peakBPM: '',
    feel: null,
    sessionNote: '',
  })

  // ── Step 1 → Step 2: Confirm readiness ────────────────────────────────────

  const confirmReadiness = useCallback((sleep: number, stress: number) => {
    setState(s => ({ ...s, step: 'time', sleepScore: sleep, stressScore: stress }))
  }, [])

  // ── Step 2 → Step 3: Pick time tier → generate session ────────────────────

  const startSession = useCallback((timeTier: TimeTier) => {
    const readiness = computeReadiness({
      sleepScore: state.sleepScore,
      stressScore: state.stressScore,
    })

    const template = generateSession({
      dayType: profile.blockPosition.nextDayType,
      timeTier,
      readiness: readiness.state,
      phase: profile.blockPosition.phase,
      blockNumber: profile.blockPosition.blockNumber,
      activeSkills: profile.activeSkills,
      allNodes: skills.nodes,
    })

    // Build active lift states from template
    const liftStates: ActiveLiftState[] = template.liftBlocks.map(lb => ({
      liftId: lb.liftId,
      liftName: lb.liftName,
      sets: Array.from({ length: lb.sets }, (_, i) => ({
        setNumber: i + 1,
        weight_kg: lb.suggestedWeight_kg ?? 60,
        reps: lb.repRange[0],
        rpe: lb.targetRPE,
        completed: false,
        editing: false,
      })),
      targetSets: lb.sets,
      repRange: lb.repRange,
      suggestedWeight_kg: lb.suggestedWeight_kg ?? 60,
      suggestion: 'hold' as const,
      expanded: lb.isPrimary, // primary lifts start expanded
    }))

    // Build active skill states from template
    const skillStates: ActiveSkillState[] = template.skillBlocks.map(sb => {
      const isTimedHold = sb.targetHoldSeconds !== undefined
      return {
        nodeId: sb.nodeId,
        nodeName: sb.nodeName,
        sets: Array.from({ length: sb.sets }, (_, i) => ({
          setNumber: i + 1,
          hold_seconds: sb.targetHoldSeconds ?? 0,
          reps: sb.targetReps ?? 0,
          rpe: 7,
          completed: false,
        })),
        targetSets: sb.sets,
        targetHoldSeconds: sb.targetHoldSeconds,
        targetReps: sb.targetReps,
        isTimedHold,
        expanded: true,
      }
    })

    setState(s => ({
      ...s,
      step: 'active',
      timeTier,
      template,
      startedAt: new Date().toISOString(),
      liftStates,
      skillStates,
    }))
  }, [state.sleepScore, state.stressScore, profile])

  // ── Lift logging ──────────────────────────────────────────────────────────

  const updateLiftSet = useCallback((
    liftId: string,
    setNumber: number,
    field: 'weight_kg' | 'reps' | 'rpe',
    value: number
  ) => {
    setState(s => ({
      ...s,
      liftStates: s.liftStates.map(l =>
        l.liftId !== liftId ? l : {
          ...l,
          sets: l.sets.map(set =>
            set.setNumber !== setNumber ? set : { ...set, [field]: value }
          ),
        }
      ),
    }))
  }, [])

  const completeSet = useCallback((liftId: string, setNumber: number) => {
    setState(s => ({
      ...s,
      liftStates: s.liftStates.map(l =>
        l.liftId !== liftId ? l : {
          ...l,
          sets: l.sets.map(set =>
            set.setNumber !== setNumber ? set : { ...set, completed: !set.completed }
          ),
        }
      ),
    }))
  }, [])

  const toggleLiftExpanded = useCallback((liftId: string) => {
    setState(s => ({
      ...s,
      liftStates: s.liftStates.map(l =>
        l.liftId !== liftId ? l : { ...l, expanded: !l.expanded }
      ),
    }))
  }, [])

  // ── Skill logging ─────────────────────────────────────────────────────────

  const updateSkillSet = useCallback((
    nodeId: string,
    setNumber: number,
    field: 'hold_seconds' | 'reps' | 'rpe',
    value: number
  ) => {
    setState(s => ({
      ...s,
      skillStates: s.skillStates.map(sk =>
        sk.nodeId !== nodeId ? sk : {
          ...sk,
          sets: sk.sets.map(set =>
            set.setNumber !== setNumber ? set : { ...set, [field]: value }
          ),
        }
      ),
    }))
  }, [])

  const completeSkillSet = useCallback((nodeId: string, setNumber: number) => {
    setState(s => ({
      ...s,
      skillStates: s.skillStates.map(sk =>
        sk.nodeId !== nodeId ? sk : {
          ...sk,
          sets: sk.sets.map(set =>
            set.setNumber !== setNumber ? set : { ...set, completed: !set.completed }
          ),
        }
      ),
    }))
  }, [])

  const toggleSkillExpanded = useCallback((nodeId: string) => {
    setState(s => ({
      ...s,
      skillStates: s.skillStates.map(sk =>
        sk.nodeId !== nodeId ? sk : { ...sk, expanded: !sk.expanded }
      ),
    }))
  }, [])

  // ── Misc toggles ──────────────────────────────────────────────────────────

  const setWarmUpDone = useCallback((v: boolean) => setState(s => ({ ...s, warmUpDone: v })), [])
  const setCoresDone = useCallback((v: boolean) => setState(s => ({ ...s, coresDone: v })), [])
  const setConditioningDone = useCallback((v: boolean) => setState(s => ({ ...s, conditioningDone: v })), [])
  const setPeakBPM = useCallback((v: string) => setState(s => ({ ...s, peakBPM: v })), [])
  const setFeel = useCallback((v: SessionFeel) => setState(s => ({ ...s, feel: v })), [])
  const setSessionNote = useCallback((v: string) => setState(s => ({ ...s, sessionNote: v })), [])

  // ── Step 3 → Step 4: Finish session ──────────────────────────────────────

  const finishSession = useCallback(() => {
    const { template, liftStates, skillStates, sleepScore, stressScore, feel, peakBPM, sessionNote, startedAt } = state

    if (!template) return null

    const now = new Date()
    const durationMinutes = startedAt
      ? Math.round((now.getTime() - new Date(startedAt).getTime()) / 60000)
      : state.timeTier

    const liftEntries: LiftLogEntry[] = liftStates.map(ls => ({
      liftId: ls.liftId,
      liftName: ls.liftName,
      sessionId: sessionId.current,
      date: now.toISOString().split('T')[0],
      sets: ls.sets.map(s => ({
        setNumber: s.setNumber,
        weight_kg: s.weight_kg,
        reps: s.reps,
        rpe: s.rpe,
        completed: s.completed,
      } satisfies LiftSet)),
      suggestion: ls.suggestion,
    }))

    const skillEntries: SkillLogEntry[] = skillStates.map(ss => ({
      nodeId: ss.nodeId,
      sessionId: sessionId.current,
      date: now.toISOString().split('T')[0],
      sets: ss.sets.map(s => ({
        setNumber: s.setNumber,
        hold_seconds: ss.isTimedHold ? s.hold_seconds : undefined,
        reps: !ss.isTimedHold ? s.reps : undefined,
        rpe: s.rpe,
        completed: s.completed,
      } satisfies SkillSet)),
    }))

    const coreEntries: CoreLogEntry[] = template.coreBlocks.map(cb => ({
      sessionId: sessionId.current,
      exercise: cb.exercise,
      sets: cb.sets,
      repsOrDuration: cb.repsOrDuration,
    }))

    const readiness: ReadinessState = computeReadiness({ sleepScore, stressScore }).state

    const session: Session = {
      id: sessionId.current,
      date: now.toISOString().split('T')[0],
      dayType: template.dayType,
      blockNumber: profile.blockPosition.blockNumber,
      weekInBlock: profile.blockPosition.weekInBlock,
      phase: profile.blockPosition.phase,
      readiness,
      sleepScore,
      stressScore,
      timeTier: state.timeTier,
      durationActualMinutes: durationMinutes,
      peakBPM: peakBPM ? Number(peakBPM) : undefined,
      feel: feel ?? undefined,
      notes: sessionNote || undefined,
      skillEntries,
      liftEntries,
      coreEntries,
      isDeloadSession: profile.blockPosition.isDeloadWeek,
      completedAt: now.toISOString(),
    }

    saveSession(session)
    setState(s => ({ ...s, step: 'complete' }))
    return session
  }, [state, profile])

  // ── Reset for next session ─────────────────────────────────────────────────

  const reset = useCallback(() => {
    sessionId.current = uuid()
    setState({
      step: 'readiness',
      sleepScore: 7,
      stressScore: 5,
      timeTier: profile.defaultTimeTier,
      template: null,
      startedAt: null,
      warmUpDone: false,
      liftStates: [],
      skillStates: [],
      coresDone: false,
      conditioningDone: false,
      peakBPM: '',
      feel: null,
      sessionNote: '',
    })
  }, [profile.defaultTimeTier])

  // ── Derived ───────────────────────────────────────────────────────────────

  const totalSetsCompleted = state.liftStates.reduce(
    (sum, l) => sum + l.sets.filter(s => s.completed).length, 0
  )
  const totalSets = state.liftStates.reduce((sum, l) => sum + l.sets.length, 0)
  const progressPct = totalSets > 0 ? Math.round((totalSetsCompleted / totalSets) * 100) : 0

  return {
    state,
    progressPct,
    totalSetsCompleted,
    totalSets,
    confirmReadiness,
    startSession,
    updateLiftSet,
    completeSet,
    toggleLiftExpanded,
    updateSkillSet,
    completeSkillSet,
    toggleSkillExpanded,
    setWarmUpDone,
    setCoresDone,
    setConditioningDone,
    setPeakBPM,
    setFeel,
    setSessionNote,
    finishSession,
    reset,
  }
}
