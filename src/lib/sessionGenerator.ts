// ─── Session Generator ────────────────────────────────────────────────────────
// Generates session templates from athlete state + skill tree selections.
// Implements logic-spec.md §5 and context doc session tier rules.

import type { ReadinessState, TimeTier, SessionTemplate, PlannedSkillBlock, PlannedLiftBlock, PlannedAccessoryBlock, PlannedConditioningBlock, PlannedCoreBlock, WarmUpExercise } from '../types/session'
import type { DayType, SkillNode, ActiveSkillSelection } from '../types/skill'
import type { BlockPhase } from '../types/athlete'

// ─── Warm-Up Blocks (from context doc) ───────────────────────────────────────

const WARMUPS: Record<Exclude<DayType, 'Z'>, WarmUpExercise[]> = {
  A: [
    { name: 'Hip Circles', duration: '30s each direction' },
    { name: 'Leg Swings (front/back)', reps: 15 },
    { name: 'Goblet Squat Hold', duration: '60s', notes: 'Deep position, elbows on knees' },
    { name: 'Couch Stretch', duration: '60s each side' },
  ],
  B: [
    { name: 'Band Pull-Aparts', reps: 20, notes: 'Overhand + underhand grip' },
    { name: 'Shoulder Circles', duration: '30s forward, 30s back' },
    { name: 'Dead Hang', duration: '30s', notes: 'Active shoulder depression' },
  ],
  C: [
    { name: 'Cat-Cow', reps: 10, notes: 'Slow, controlled breathing' },
    { name: 'Thoracic Rotation', reps: 10, notes: 'Each side, seated or quadruped' },
    { name: 'Dead Hang', duration: '30–45s', notes: 'Decompress spine, active shoulders' },
  ],
}

// ─── Lift Prescriptions ───────────────────────────────────────────────────────

interface LiftPrescription {
  liftId: string
  liftName: string
  isPrimary: boolean
  sets: number
  repRange: [number, number]
  rpe: number
}

function getLiftPrescriptions(
  dayType: 'A' | 'B' | 'C',
  phase: BlockPhase,
  blockNumber: number
): LiftPrescription[] {
  const phaseConfig: Record<BlockPhase, { sets: number; repRange: [number, number]; rpe: number }> = {
    accumulation:    { sets: 4, repRange: [5, 8], rpe: 7 },
    deload:          { sets: 3, repRange: [5, 8], rpe: 6 },
    intensification: { sets: 4, repRange: [4, 6], rpe: 8 },
    realization:     { sets: 5, repRange: [3, 5], rpe: 9 },
  }
  const cfg = phaseConfig[phase]

  // Deadlift rotation: odd blocks on C, even blocks on A
  const deadliftOnC = blockNumber % 2 !== 0

  if (dayType === 'A') {
    return [
      { ...cfg, liftId: 'barbell-squat', liftName: 'Barbell Back Squat', isPrimary: true },
      { ...cfg, sets: 3, liftId: 'rdl', liftName: 'Romanian Deadlift', isPrimary: false },
      { sets: 3, repRange: [8, 12] as [number, number], rpe: 7, liftId: 'split-squat', liftName: 'Bulgarian Split Squat', isPrimary: false },
      ...(!deadliftOnC ? [{ ...cfg, liftId: 'barbell-deadlift', liftName: 'Barbell Deadlift', isPrimary: false }] : []),
    ]
  }

  if (dayType === 'B') {
    return [
      { ...cfg, liftId: 'barbell-bench', liftName: 'Barbell Bench Press', isPrimary: true },
      { ...cfg, sets: 3, liftId: 'overhead-press', liftName: 'Overhead Press', isPrimary: false },
      { sets: 3, repRange: [8, 12] as [number, number], rpe: 7, liftId: 'weighted-dip', liftName: 'Weighted Dip', isPrimary: false },
    ]
  }

  // C day
  return [
    { ...cfg, liftId: 'weighted-pull-up', liftName: 'Weighted Pull-Up', isPrimary: true },
    { sets: 3, repRange: [8, 12] as [number, number], rpe: 7, liftId: 'barbell-row', liftName: 'Barbell Row', isPrimary: false },
    ...(deadliftOnC ? [{ ...cfg, liftId: 'barbell-deadlift', liftName: 'Barbell Deadlift', isPrimary: false }] : []),
  ]
}

// ─── Core Prescriptions ───────────────────────────────────────────────────────

function getCorePrescriptions(dayType: 'A' | 'B' | 'C'): PlannedCoreBlock[] {
  if (dayType === 'A') {
    return [
      { exercise: 'Ab Wheel', sets: 2, repsOrDuration: '8–10 reps', plane: 'anti-extension' },
      { exercise: 'Back Extensions', sets: 2, repsOrDuration: '12 reps', plane: 'posterior' },
    ]
  }
  if (dayType === 'B') {
    return [
      { exercise: 'Pallof Press', sets: 2, repsOrDuration: '12 each side', plane: 'anti-rotation' },
      { exercise: 'L-Sit Holds', sets: 2, repsOrDuration: '10–15s', plane: 'compression' },
    ]
  }
  return [
    { exercise: 'Hanging Leg Raises', sets: 2, repsOrDuration: '10 reps', plane: 'anterior' },
    { exercise: 'Jefferson Curl', sets: 2, repsOrDuration: '8 reps slow', plane: 'posterior' },
  ]
}

// ─── Conditioning Block ───────────────────────────────────────────────────────

function getConditioningBlock(
  dayType: 'A' | 'B' | 'C',
  readiness: ReadinessState,
  timeTier: TimeTier
): PlannedConditioningBlock | undefined {
  // C day: no conditioning (protect CNS)
  // Red readiness: no conditioning
  // 30 min: no conditioning (no time)
  if (dayType === 'C' || readiness === 'red' || timeTier === 30) return undefined

  // Yellow: no HIIT (from context doc)
  if (readiness === 'yellow' && dayType === 'B') return undefined

  if (dayType === 'B') {
    return {
      protocol: '30-30s',
      durationMinutes: 10,
      targetZone: 'Zone 3–4',
      description: '30s hard / 30s easy × 10 rounds. Target HR 148–197 BPM.',
    }
  }

  // A day: optional short intervals (only on green + 60/90 min)
  if (dayType === 'A' && readiness === 'green' && timeTier >= 60) {
    return {
      protocol: '6x1min',
      durationMinutes: 15,
      targetZone: 'Zone 4',
      description: '6 × 1 min hard effort / 90s rest. Target HR 167+ BPM.',
    }
  }

  return undefined
}

// ─── §5: Skill Block Generation ───────────────────────────────────────────────

function getSkillBlocksForDay(
  dayType: 'A' | 'B' | 'C',
  activeSkills: ActiveSkillSelection,
  allNodes: SkillNode[],
  readiness: ReadinessState,
  timeTier: TimeTier
): { skillBlocks: PlannedSkillBlock[]; accessoryBlocks: PlannedAccessoryBlock[] } {
  const nodeMap = new Map(allNodes.map(n => [n.id, n]))
  const skillBlocks: PlannedSkillBlock[] = []
  const accessoryBlocks: PlannedAccessoryBlock[] = []

  const selectedNodeIds = Object.values(activeSkills).filter(Boolean) as string[]

  // Filter to nodes that match this day type
  const dayNodes = selectedNodeIds
    .map(id => nodeMap.get(id))
    .filter((n): n is SkillNode => n !== undefined)
    .filter(n => n.session_placement.day_types.includes(dayType))
    .sort((a, b) => b.progression_level - a.progression_level) // higher level first (fresher CNS)

  const sets = readiness === 'red' ? 1 : readiness === 'yellow' ? 3 : 4

  for (const node of dayNodes) {
    skillBlocks.push({
      nodeId: node.id,
      nodeName: node.name,
      sets,
      targetHoldSeconds: node.unlock_criteria.hold_seconds,
      targetReps: node.unlock_criteria.reps,
      placement: node.session_placement.order,
    })

    // Inject accessories (reduced if red readiness)
    if (readiness !== 'red') {
      const maxAccessories = timeTier === 30 ? 1 : timeTier === 45 ? 2 : 3
      const accessories = node.skill_specific_accessories.slice(0, maxAccessories)
      const accessorySets = timeTier === 30 ? 2 : timeTier === 45 ? 2 : 3

      for (const acc of accessories) {
        accessoryBlocks.push({
          name: acc,
          sets: accessorySets,
          repsOrDuration: '6–10 reps or 10–15s',
          isSkillSpecific: true,
          nodeId: node.id,
        })
      }
    }
  }

  return { skillBlocks, accessoryBlocks }
}

// ─── Main Generator ───────────────────────────────────────────────────────────

export function generateSession(params: {
  dayType: DayType
  timeTier: TimeTier
  readiness: ReadinessState
  phase: BlockPhase
  blockNumber: number
  activeSkills: ActiveSkillSelection
  allNodes: SkillNode[]
}): SessionTemplate {
  const { dayType, timeTier, readiness, phase, blockNumber, activeSkills, allNodes } = params

  if (dayType === 'Z') {
    // Z days are free-form — return empty template
    return {
      dayType: 'Z',
      timeTier,
      readiness,
      warmUp: [],
      skillBlocks: [],
      liftBlocks: [],
      accessoryBlocks: [],
      conditioningBlock: undefined,
      coreBlocks: [],
    }
  }

  const warmUp = WARMUPS[dayType]
  const { skillBlocks, accessoryBlocks } = getSkillBlocksForDay(
    dayType, activeSkills, allNodes, readiness, timeTier
  )

  // Lift blocks — reduced for red readiness
  const allLifts = getLiftPrescriptions(dayType, phase, blockNumber)
  let liftBlocks: PlannedLiftBlock[]

  if (readiness === 'red') {
    // Red: skill + 1 main lift only
    const primary = allLifts.find(l => l.isPrimary)
    liftBlocks = primary ? [{
      liftId: primary.liftId,
      liftName: primary.liftName,
      sets: Math.min(primary.sets, 3),
      repRange: primary.repRange,
      targetRPE: primary.rpe - 2,
      isPrimary: true,
    }] : []
  } else {
    // Filter by time tier
    const maxLifts = timeTier === 30 ? 1 : timeTier === 45 ? 2 : 3
    liftBlocks = allLifts.slice(0, maxLifts).map(l => ({
      liftId: l.liftId,
      liftName: l.liftName,
      sets: readiness === 'yellow' ? Math.min(l.sets, 3) : l.sets,
      repRange: l.repRange,
      targetRPE: readiness === 'yellow' ? l.rpe - 1 : l.rpe,
      isPrimary: l.isPrimary,
    }))
  }

  const coreBlocks = readiness === 'red' ? [] : getCorePrescriptions(dayType)
  const conditioningBlock = getConditioningBlock(dayType, readiness, timeTier)

  return {
    dayType,
    timeTier,
    readiness,
    warmUp,
    skillBlocks,
    liftBlocks,
    accessoryBlocks,
    conditioningBlock,
    coreBlocks,
  }
}
