import { useState, useCallback, useMemo } from 'react'
import skillsData from '../data/skills.json'
import type { SkillsData, SkillNode, SkillProgress, NodeStatus } from '../types/skill'
import type { SkillLogEntry } from '../types/session'
import type { BenchmarkResult } from '../types/benchmark'
import {
  computeAllNodeStatuses,
  validateSkillGraph,
  isStalled,
  STALL_THRESHOLD,
} from '../lib/skillTreeEvaluator'
import { getSkillProgress, saveSkillProgress, getSessions, getLatestBenchmark } from '../lib/storage'

const data = skillsData as SkillsData

// Extract all skill log entries from session log
function extractSkillLog(sessions: ReturnType<typeof getSessions>): SkillLogEntry[] {
  return sessions.flatMap(s => s.skillEntries ?? [])
}

export function useSkillTree() {
  const [progress, setProgress] = useState<SkillProgress>(() => getSkillProgress())

  const nodes: SkillNode[] = data.nodes
  const meta = data.meta

  const skillLog = useMemo(() => extractSkillLog(getSessions()), [])
  const benchmark: BenchmarkResult | null = getLatestBenchmark()

  const statusMap: Map<string, NodeStatus> = useMemo(
    () => computeAllNodeStatuses(nodes, skillLog, benchmark, progress),
    [nodes, skillLog, benchmark, progress]
  )

  const validation = useMemo(() => validateSkillGraph(nodes), [nodes])

  const stalledNodes = useMemo(
    () =>
      nodes.filter(n =>
        isStalled(n.id, nodes, skillLog, benchmark, progress)
      ),
    [nodes, skillLog, benchmark, progress]
  )

  const getNode = useCallback(
    (id: string): SkillNode | undefined => nodes.find(n => n.id === id),
    [nodes]
  )

  const getStatus = useCallback(
    (id: string): NodeStatus => statusMap.get(id) ?? 'locked',
    [statusMap]
  )

  const getSessionCount = useCallback(
    (nodeId: string): number => {
      return skillLog.filter(e => e.nodeId === nodeId).length
    },
    [skillLog]
  )

  const updateProgress = useCallback((next: Partial<SkillProgress>) => {
    setProgress(prev => {
      const merged: SkillProgress = {
        nodeStatuses: { ...prev.nodeStatuses, ...(next.nodeStatuses ?? {}) },
        sessionCounts: { ...prev.sessionCounts, ...(next.sessionCounts ?? {}) },
        streaks: { ...prev.streaks, ...(next.streaks ?? {}) },
        lastDemotion: { ...prev.lastDemotion, ...(next.lastDemotion ?? {}) },
      }
      saveSkillProgress(merged)
      return merged
    })
  }, [])

  // Nodes grouped by category
  const byCategory = useMemo(() => {
    const map = new Map<string, SkillNode[]>()
    for (const node of nodes) {
      const arr = map.get(node.category) ?? []
      arr.push(node)
      map.set(node.category, arr)
    }
    return map
  }, [nodes])

  // Active + unlocked nodes (user can select these)
  const selectableNodes = useMemo(
    () => nodes.filter(n => {
      const s = statusMap.get(n.id)
      return s === 'active' || s === 'unlocked'
    }),
    [nodes, statusMap]
  )

  return {
    nodes,
    meta,
    progress,
    statusMap,
    validation,
    stalledNodes,
    byCategory,
    selectableNodes,
    getNode,
    getStatus,
    getSessionCount,
    updateProgress,
    STALL_THRESHOLD,
  }
}
