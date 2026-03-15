// ─── Skill Tree Evaluator ─────────────────────────────────────────────────────
// Implements all logic from logic-spec.md §2–§6.

import type { SkillNode, NodeStatus, SkillProgress, ValidationResult } from '../types/skill'
import type { SkillLogEntry } from '../types/session'
import type { BenchmarkResult } from '../types/benchmark'
import { checkStrengthPrerequisite } from '../types/benchmark'

// ─── §2: Unlock Gate Evaluation ──────────────────────────────────────────────

export function evaluateNodeStatus(
  nodeId: string,
  nodes: SkillNode[],
  skillLog: SkillLogEntry[],
  benchmark: BenchmarkResult | null,
  persistedProgress: SkillProgress
): NodeStatus {
  const nodeMap = new Map(nodes.map(n => [n.id, n]))
  const node = nodeMap.get(nodeId)
  if (!node) return 'locked'

  // Check prerequisite nodes are all unlocked
  for (const prereqId of node.prerequisites) {
    const prereqStatus = evaluateNodeStatus(prereqId, nodes, skillLog, benchmark, persistedProgress)
    if (prereqStatus !== 'unlocked') return 'locked'
  }

  // Check strength prerequisites
  if (!strengthPrerequisitesMet(node, skillLog, benchmark)) return 'locked'

  // Node is at least active — now check if unlock criteria are met
  const nodeLog = getSessionsForNode(nodeId, skillLog)
  const streak = getConsecutiveStreak(nodeLog, node.unlock_criteria)

  const { consecutive_sessions } = node.unlock_criteria

  if (
    streak.length >= consecutive_sessions &&
    streak.every(s => criteriaMetInSession(s, node.unlock_criteria)) &&
    streak[streak.length - 1] !== undefined &&
    getSessionRPE(streak[streak.length - 1]) <= 8
  ) {
    return 'unlocked'
  }

  return 'active'
}

// ─── §3: Strength Prerequisite Checks ────────────────────────────────────────

function strengthPrerequisitesMet(
  node: SkillNode,
  skillLog: SkillLogEntry[],
  benchmark: BenchmarkResult | null
): boolean {
  for (const prereq of node.strength_prerequisites) {
    // Try benchmark first
    if (benchmark) {
      const resolved = checkStrengthPrerequisite(prereq, benchmark)
      if (resolved) continue // this prereq is met via benchmark
    }

    // Try session log (for skill-node-based prerequisites)
    const resolvedFromLog = checkStrengthFromSessionLog(prereq, skillLog)
    if (resolvedFromLog) continue

    // Not resolved by either source
    return false
  }
  return true
}

function checkStrengthFromSessionLog(
  prerequisite: string,
  skillLog: SkillLogEntry[]
): boolean {
  const lower = prerequisite.toLowerCase()

  // "30s tuck L-sit" → find sessions with tuck-l-sit node and hold >= 30
  const holdMatch = lower.match(/(\d+)s\s+(.+)/)
  if (holdMatch) {
    const seconds = parseInt(holdMatch[1])
    const skillHint = holdMatch[2].replace(/\s+/g, '-')
    const relevantLogs = skillLog.filter(e =>
      e.nodeId.includes(skillHint.split(' ')[0])
    )
    return relevantLogs.some(log =>
      log.sets.some(s => (s.hold_seconds ?? 0) >= seconds)
    )
  }

  // "5 chest-to-bar pull-ups"
  const repMatch = lower.match(/(\d+)\s+(.+)/)
  if (repMatch) {
    const reps = parseInt(repMatch[1])
    const skillHint = repMatch[2].replace(/\s+/g, '-').split('-').slice(0, 2).join('-')
    const relevantLogs = skillLog.filter(e => e.nodeId.includes(skillHint))
    return relevantLogs.some(log =>
      log.sets.some(s => (s.reps ?? 0) >= reps)
    )
  }

  return false
}

// ─── Session/Streak Helpers ───────────────────────────────────────────────────

function getSessionsForNode(
  nodeId: string,
  skillLog: SkillLogEntry[]
): SkillLogEntry[] {
  return skillLog
    .filter(e => e.nodeId === nodeId)
    .sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Returns the current consecutive streak of sessions that all meet criteria.
 * Walking backwards from the most recent session.
 * Rest days / Z days between sessions do NOT break the streak.
 * Only a session logged at a LOWER level breaks it.
 */
function getConsecutiveStreak(
  sessions: SkillLogEntry[],
  criteria: SkillNode['unlock_criteria']
): SkillLogEntry[] {
  if (sessions.length === 0) return []

  const streak: SkillLogEntry[] = []

  for (let i = sessions.length - 1; i >= 0; i--) {
    const session = sessions[i]
    if (criteriaMetInSession(session, criteria)) {
      streak.unshift(session)
    } else {
      break // streak broken
    }
  }

  return streak
}

function criteriaMetInSession(
  session: SkillLogEntry,
  criteria: SkillNode['unlock_criteria']
): boolean {
  if (session.sets.length === 0) return false

  for (const set of session.sets) {
    if (!set.completed) continue

    if (criteria.hold_seconds !== undefined) {
      if ((set.hold_seconds ?? 0) < criteria.hold_seconds) return false
    }
    if (criteria.reps !== undefined) {
      if ((set.reps ?? 0) < criteria.reps) return false
    }
  }

  // Must have at least the required number of sets
  const completedSets = session.sets.filter(s => s.completed).length
  return completedSets >= criteria.sets
}

function getSessionRPE(session: SkillLogEntry): number {
  const completedSets = session.sets.filter(s => s.completed)
  if (completedSets.length === 0) return 10
  return completedSets[completedSets.length - 1].rpe
}

// ─── §4: Stall Detection ──────────────────────────────────────────────────────

export const STALL_THRESHOLD = 6

export function isStalled(
  nodeId: string,
  nodes: SkillNode[],
  skillLog: SkillLogEntry[],
  benchmark: BenchmarkResult | null,
  progress: SkillProgress
): boolean {
  const status = evaluateNodeStatus(nodeId, nodes, skillLog, benchmark, progress)
  if (status !== 'active') return false

  const sessionsAtNode = getSessionsForNode(nodeId, skillLog)
  return sessionsAtNode.length >= STALL_THRESHOLD
}

// ─── §6: Graph Integrity Validation ──────────────────────────────────────────

export function validateSkillGraph(nodes: SkillNode[]): ValidationResult {
  const nodeMap = new Map(nodes.map(n => [n.id, n]))
  const errors: string[] = []
  const warnings: string[] = []

  // Orphan check
  for (const node of nodes) {
    for (const prereqId of node.prerequisites) {
      if (!nodeMap.has(prereqId)) {
        errors.push(`Orphaned prereq: ${node.id} → ${prereqId}`)
      }
    }
  }

  // Cycle check (DFS)
  const visited = new Set<string>()
  const recStack = new Set<string>()

  function dfs(id: string): boolean {
    visited.add(id)
    recStack.add(id)
    const node = nodeMap.get(id)
    if (!node) return false

    for (const prereqId of node.prerequisites) {
      if (!visited.has(prereqId)) {
        if (dfs(prereqId)) return true
      } else if (recStack.has(prereqId)) {
        errors.push(`Cycle detected: ${id} ↔ ${prereqId}`)
        return true
      }
    }

    recStack.delete(id)
    return false
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) dfs(node.id)
  }

  // Progression level depth check (warning only)
  for (const node of nodes) {
    for (const prereqId of node.prerequisites) {
      const prereq = nodeMap.get(prereqId)
      if (prereq && node.progression_level < prereq.progression_level) {
        warnings.push(
          `Level regression: ${node.id} (L${node.progression_level}) ← ${prereqId} (L${prereq.progression_level})`
        )
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

// ─── Bulk Status Computation ──────────────────────────────────────────────────

export function computeAllNodeStatuses(
  nodes: SkillNode[],
  skillLog: SkillLogEntry[],
  benchmark: BenchmarkResult | null,
  progress: SkillProgress
): Map<string, NodeStatus> {
  const statusMap = new Map<string, NodeStatus>()

  for (const node of nodes) {
    statusMap.set(
      node.id,
      evaluateNodeStatus(node.id, nodes, skillLog, benchmark, progress)
    )
  }

  return statusMap
}

// ─── §8 Special Cases: Post-Time-Off Demotion ─────────────────────────────────

/**
 * Returns the previous node in a progression chain (one level back).
 * Used for automatic demotion after 2-3 weeks off.
 */
export function getPreviousProgressionNode(
  nodeId: string,
  nodes: SkillNode[]
): string | null {
  const node = nodes.find(n => n.id === nodeId)
  if (!node || node.prerequisites.length === 0) return null

  // Find the prerequisite with the highest progression level (same category)
  const sameCategory = node.prerequisites
    .map(id => nodes.find(n => n.id === id))
    .filter((n): n is SkillNode => n !== undefined && n.category === node.category)
    .sort((a, b) => b.progression_level - a.progression_level)

  return sameCategory[0]?.id ?? node.prerequisites[0]
}
