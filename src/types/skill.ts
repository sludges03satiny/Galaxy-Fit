// ─── Skill Node Types ───────────────────────────────────────────────────────
// Mirrors the skills.json schema exactly. Do not deviate.

export type NodeStatus = 'locked' | 'active' | 'unlocked'

export type SkillCategory =
  | 'prerequisite'
  | 'balance'
  | 'pulling'
  | 'pushing'
  | 'mobility'

export type DayType = 'A' | 'B' | 'C' | 'Z'
export type PlacementOrder = 'before_strength' | 'after_strength'

export interface UnlockCriteria {
  hold_seconds?: number
  reps?: number
  sets: number
  consecutive_sessions: number
}

export interface SessionPlacement {
  day_types: DayType[]
  order: PlacementOrder
}

export interface SkillNode {
  id: string
  name: string
  category: SkillCategory
  description: string
  prerequisites: string[]
  strength_prerequisites: string[]
  progression_level: 1 | 2 | 3 | 4 | 5
  unlock_criteria: UnlockCriteria
  skill_specific_accessories: string[]
  session_placement: SessionPlacement
  video_reference: string
  source_credit: string
}

export interface SkillsMeta {
  version: string
  sources: string[]
  notes: string
  terminal_nodes: Record<string, string>
  session_generator_note: string
}

export interface SkillsData {
  meta: SkillsMeta
  nodes: SkillNode[]
}

// ─── Runtime Status ──────────────────────────────────────────────────────────

export interface SkillNodeWithStatus extends SkillNode {
  status: NodeStatus
  sessionCount: number
  isStalled: boolean
  currentStreak: number
}

// ─── Skill Progress (persisted) ──────────────────────────────────────────────

export interface SkillProgress {
  // nodeId -> NodeStatus override info + streak data
  nodeStatuses: Record<string, NodeStatus>
  // nodeId -> count of total sessions logged at this node
  sessionCounts: Record<string, number>
  // nodeId -> current consecutive streak length
  streaks: Record<string, number>
  // nodeId -> timestamp of last regression (for post-time-off auto-demotion)
  lastDemotion: Record<string, string>
}

// ─── Active Skill Selection ──────────────────────────────────────────────────

export type SkillTree = 'pulling' | 'pushing' | 'balance' | 'mobility'

export interface ActiveSkillSelection {
  // tree -> nodeId of the currently selected active skill
  pulling?: string
  pushing?: string
  balance?: string
  mobility?: string
}

// ─── Stall Detection ─────────────────────────────────────────────────────────

export interface StallInfo {
  nodeId: string
  nodeName: string
  sessionsLogged: number
  triggered: boolean
}

// ─── Validation ──────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}
