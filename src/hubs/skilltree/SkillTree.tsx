import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { useSkillTree } from '../../hooks/useSkillTree'
import { useAthleteProfile } from '../../hooks/useAthleteProfile'
import type { SkillNode, NodeStatus, SkillTree as SkillTreeType, ActiveSkillSelection } from '../../types/skill'

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS = {
  bg:        '#0a0a08',
  bg2:       '#111110',
  bg3:       '#1a1a17',
  line:      '#2a2a25',
  line2:     '#3a3a33',
  text:      '#e8e8e0',
  text2:     '#a0a09a',
  text3:     '#5a5a52',
  lime:      '#c8f050',
  limeGlow:  'rgba(200,240,80,0.35)',
  yellow:    '#f0c828',
  red:       '#f05050',
  locked:    '#2a2a25',
  lockedBorder: '#3a3a33',
}

const NODE_R = 24          // radius px
const NODE_D = NODE_R * 2  // diameter
const H_GAP  = 180         // horizontal gap between tree columns
const V_GAP  = 110         // vertical gap between nodes

const TREE_ORDER: SkillTreeType[] = ['pulling', 'pushing', 'balance', 'mobility']

const TREE_LABELS: Record<SkillTreeType, string> = {
  pulling:  'PULLING',
  pushing:  'PUSHING',
  balance:  'BALANCE',
  mobility: 'MOBILITY',
}

const TREE_COLORS: Record<SkillTreeType, string> = {
  pulling:  '#c8f050',
  pushing:  '#50c8f0',
  balance:  '#f0c828',
  mobility: '#c878f0',
}

// Map category → tree
const CATEGORY_TO_TREE: Record<string, SkillTreeType> = {
  pulling:      'pulling',
  pushing:      'pushing',
  balance:      'balance',
  mobility:     'mobility',
  prerequisite: 'pulling', // prerequisites span multiple trees; attach to pulling col visually
}

const LEVEL_LABELS = ['', 'Beginner', 'Novice', 'Intermediate', 'Advanced', 'Elite']

// ─── Layout computation ───────────────────────────────────────────────────────

interface NodeLayout {
  node: SkillNode
  x: number
  y: number
  tree: SkillTreeType
}

function buildLayout(nodes: SkillNode[]): { layouts: NodeLayout[]; width: number; height: number } {
  // Group by tree
  const treeMap: Record<SkillTreeType, SkillNode[]> = {
    pulling: [], pushing: [], balance: [], mobility: [],
  }

  for (const n of nodes) {
    const tree = CATEGORY_TO_TREE[n.category] ?? 'pulling'
    // prerequisites that are pulling-specific go to pulling; others spread
    if (n.category === 'prerequisite') {
      // assign to the tree that most uses them based on session_placement
      const days = n.session_placement.day_types
      if (days.includes('B') && !days.includes('C')) treeMap.pushing.push(n)
      else treeMap.pulling.push(n)
    } else {
      treeMap[tree].push(n)
    }
  }

  const PADDING = 60
  const HEADER  = 80

  const layouts: NodeLayout[] = []

  TREE_ORDER.forEach((tree, treeIdx) => {
    const col = treeMap[tree]
    // Sort: prerequisites (level 1) at bottom, high-level at top
    const sorted = [...col].sort((a, b) => b.progression_level - a.progression_level)

    const cx = PADDING + treeIdx * (NODE_D + H_GAP) + NODE_R

    sorted.forEach((node, rowIdx) => {
      layouts.push({
        node,
        x: cx,
        y: HEADER + PADDING + rowIdx * (NODE_D + V_GAP) + NODE_R,
        tree,
      })
    })
  })

  const maxX = Math.max(...layouts.map(l => l.x)) + NODE_R + PADDING
  const maxY = Math.max(...layouts.map(l => l.y)) + NODE_R + PADDING + 24 // label

  return { layouts, width: maxX, height: maxY }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const SkillTree: React.FC = () => {
  const { nodes, getStatus, getSessionCount, stalledNodes, validation, STALL_THRESHOLD } = useSkillTree()
  const { profile, updateActiveSkill } = useAthleteProfile()

  const [view, setView]         = useState<'graph' | 'list'>('graph')
  const [selected, setSelected] = useState<SkillNode | null>(null)
  const [dismissedStalls, setDismissedStalls] = useState<Set<string>>(new Set())
  const [filter, setFilter]     = useState<'all' | 'active' | 'unlocked' | 'locked'>('all')

  const activeSkills = profile.activeSkills ?? {}

  const visibleStalls = stalledNodes.filter(n => !dismissedStalls.has(n.id))

  const activeCount   = nodes.filter(n => getStatus(n.id) === 'active').length
  const unlockedCount = nodes.filter(n => getStatus(n.id) === 'unlocked').length

  const handleSetActive = useCallback((node: SkillNode) => {
    const tree = CATEGORY_TO_TREE[node.category] as SkillTreeType
    updateActiveSkill(tree, node.id)
  }, [updateActiveSkill])

  return (
    <div className="flex flex-col min-h-full" style={{ background: COLORS.bg, color: COLORS.text }}>

      {/* ── Header ── */}
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-end justify-between">
          <div>
            <h1
              className="leading-none tracking-wider"
              style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 32, letterSpacing: 2 }}
            >
              SKILL TREE
            </h1>
            <div className="flex gap-3 mt-1" style={{ fontFamily: 'DM Mono, monospace', fontSize: 11 }}>
              <span style={{ color: COLORS.lime }}>{activeCount} active</span>
              <span style={{ color: COLORS.text2 }}>{unlockedCount} unlocked</span>
              <span style={{ color: COLORS.text3 }}>{nodes.length - activeCount - unlockedCount} locked</span>
            </div>
          </div>

          {/* View toggle */}
          <div
            className="flex rounded overflow-hidden"
            style={{ border: `1px solid ${COLORS.line2}`, fontFamily: 'DM Mono, monospace', fontSize: 11 }}
          >
            {(['graph', 'list'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: '6px 12px',
                  background: view === v ? COLORS.lime : 'transparent',
                  color:      view === v ? COLORS.bg : COLORS.text3,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                }}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Active skill summary */}
        <ActiveSkillSummary activeSkills={activeSkills} nodes={nodes} />
      </div>

      {/* ── Stall warnings ── */}
      {visibleStalls.length > 0 && (
        <div className="mx-4 mb-3 rounded" style={{ border: `1px solid ${COLORS.yellow}44`, background: `${COLORS.yellow}0a` }}>
          <div className="flex items-center justify-between px-3 pt-2 pb-1">
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: COLORS.yellow, letterSpacing: 2, textTransform: 'uppercase' }}>
              ⚠ Stall Detected
            </span>
          </div>
          {visibleStalls.map(n => (
            <div key={n.id} className="flex items-center justify-between px-3 py-1">
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: COLORS.text2 }}>{n.name}</span>
              <div className="flex items-center gap-3">
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: COLORS.text3 }}>
                  {getSessionCount(n.id)}/{STALL_THRESHOLD} sessions
                </span>
                <button
                  onClick={() => setDismissedStalls(prev => new Set([...prev, n.id]))}
                  style={{ color: COLORS.text3, fontSize: 14, lineHeight: 1 }}
                >×</button>
              </div>
            </div>
          ))}
          <p className="px-3 pb-2 pt-1" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: COLORS.text3 }}>
            Drop one level · add a set · focus on quality holds.
          </p>
        </div>
      )}

      {/* ── Graph or List ── */}
      {view === 'graph' ? (
        <ConstellationGraph
          nodes={nodes}
          getStatus={getStatus}
          activeSkills={activeSkills}
          selected={selected}
          onSelect={setSelected}
        />
      ) : (
        <ListView
          nodes={nodes}
          getStatus={getStatus}
          getSessionCount={getSessionCount}
          activeSkills={activeSkills}
          selected={selected}
          onSelect={setSelected}
          filter={filter}
          setFilter={setFilter}
        />
      )}

      {/* ── Validation errors (dev) ── */}
      {!validation.valid && (
        <div className="mx-4 mb-4 rounded p-3" style={{ border: `1px solid ${COLORS.red}44`, background: `${COLORS.red}08` }}>
          <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: COLORS.red, letterSpacing: 2 }}>GRAPH ERRORS</p>
          {validation.errors.map((e, i) => (
            <p key={i} style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: COLORS.text2 }}>{e}</p>
          ))}
        </div>
      )}

      {/* ── Node detail sheet ── */}
      {selected && (
        <NodeDetailSheet
          node={selected}
          status={getStatus(selected.id)}
          sessionCount={getSessionCount(selected.id)}
          nodes={nodes}
          getStatus={getStatus}
          activeSkills={activeSkills}
          isStalled={stalledNodes.some(s => s.id === selected.id)}
          onSetActive={handleSetActive}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}

// ─── Active Skill Summary ─────────────────────────────────────────────────────

const ActiveSkillSummary: React.FC<{
  activeSkills: ActiveSkillSelection
  nodes: SkillNode[]
}> = ({ activeSkills, nodes }) => {
  const entries = TREE_ORDER.map(tree => {
    const nodeId = activeSkills[tree]
    const node   = nodeId ? nodes.find(n => n.id === nodeId) : null
    return { tree, node }
  }).filter(e => e.node)

  if (entries.length === 0) return null

  return (
    <div className="flex gap-2 mt-3 flex-wrap">
      {entries.map(({ tree, node }) => (
        <div
          key={tree}
          className="flex items-center gap-1.5 rounded px-2 py-1"
          style={{ background: COLORS.bg3, border: `1px solid ${COLORS.line2}` }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: TREE_COLORS[tree], display: 'inline-block', flexShrink: 0 }} />
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: COLORS.text3, textTransform: 'uppercase', letterSpacing: 1 }}>
            {TREE_LABELS[tree]}
          </span>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: COLORS.text2 }}>
            {node!.name}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Constellation Graph ──────────────────────────────────────────────────────

const ConstellationGraph: React.FC<{
  nodes: SkillNode[]
  getStatus: (id: string) => NodeStatus
  activeSkills: ActiveSkillSelection
  selected: SkillNode | null
  onSelect: (n: SkillNode) => void
}> = ({ nodes, getStatus, activeSkills, selected, onSelect }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef       = useRef<SVGSVGElement>(null)

  // Pan/zoom state
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 })
  const isDragging = useRef(false)
  const dragStart  = useRef({ x: 0, y: 0, tx: 0, ty: 0 })
  const lastPinchDist = useRef<number | null>(null)

  const { layouts, width } = useMemo(() => buildLayout(nodes), [nodes])
  const layoutMap = useMemo(() => {
    const m = new Map<string, NodeLayout>()
    layouts.forEach(l => m.set(l.node.id, l))
    return m
  }, [layouts])

  // ── Mouse pan ──
  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as SVGElement).closest('g[data-node]')) return
    isDragging.current = true
    dragStart.current = { x: e.clientX, y: e.clientY, tx: transform.x, ty: transform.y }
  }
  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    setTransform(t => ({ ...t, x: dragStart.current.tx + dx, y: dragStart.current.ty + dy }))
  }, [])
  const onMouseUp = useCallback(() => { isDragging.current = false }, [])

  // ── Touch pan/pinch ──
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isDragging.current = true
      dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, tx: transform.x, ty: transform.y }
    }
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastPinchDist.current = Math.hypot(dx, dy)
    }
  }
  const onTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault()
    if (e.touches.length === 1 && isDragging.current) {
      const dx = e.touches[0].clientX - dragStart.current.x
      const dy = e.touches[0].clientY - dragStart.current.y
      setTransform(t => ({ ...t, x: dragStart.current.tx + dx, y: dragStart.current.ty + dy }))
    }
    if (e.touches.length === 2 && lastPinchDist.current !== null) {
      const dx   = e.touches[0].clientX - e.touches[1].clientX
      const dy   = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.hypot(dx, dy)
      const factor = dist / lastPinchDist.current
      lastPinchDist.current = dist
      setTransform(t => ({ ...t, scale: Math.min(2, Math.max(0.4, t.scale * factor)) }))
    }
  }, [])
  const onTouchEnd = useCallback(() => {
    isDragging.current = false
    lastPinchDist.current = null
  }, [])

  // ── Wheel zoom ──
  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.1 : 0.9
    setTransform(t => ({ ...t, scale: Math.min(2.5, Math.max(0.3, t.scale * factor)) }))
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('wheel', onWheel)
    }
  }, [onMouseMove, onMouseUp, onTouchMove, onTouchEnd, onWheel])

  // ── Build edge list ──
  const edges = useMemo(() => {
    const list: Array<{ from: NodeLayout; to: NodeLayout; active: boolean }> = []
    for (const layout of layouts) {
      for (const prereqId of layout.node.prerequisites) {
        const prereqLayout = layoutMap.get(prereqId)
        if (!prereqLayout) continue
        list.push({
          from: prereqLayout,
          to:   layout,
          active:
            getStatus(prereqId) !== 'locked' &&
            getStatus(layout.node.id) !== 'locked',
        })
      }
    }
    return list
  }, [layouts, layoutMap, getStatus])

  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden"
      style={{ minHeight: 400, cursor: isDragging.current ? 'grabbing' : 'grab', touchAction: 'none' }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    >
      {/* Tree column labels */}
      <div
        className="absolute top-0 left-0 pointer-events-none"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: '0 0',
          width,
        }}
      >
        {TREE_ORDER.map((tree) => {
          const col = layouts.filter(l => l.tree === tree)
          if (col.length === 0) return null
          const cx = col[0].x
          return (
            <div
              key={tree}
              className="absolute"
              style={{
                left: cx - 50,
                top: 12,
                width: 100,
                textAlign: 'center',
                fontFamily: 'Bebas Neue, sans-serif',
                fontSize: 13,
                letterSpacing: 3,
                color: TREE_COLORS[tree],
                opacity: 0.7,
              }}
            >
              {TREE_LABELS[tree]}
            </div>
          )
        })}
      </div>

      <svg
        ref={svgRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          overflow: 'visible',
        }}
      >
        <defs>
          <filter id="glow-lime">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="glow-dim">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          {/* Pulse animation defined via SVG animate */}
        </defs>

        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
          {/* Edges */}
          {edges.map((e, i) => (
            <line
              key={i}
              x1={e.from.x} y1={e.from.y}
              x2={e.to.x}   y2={e.to.y}
              stroke={e.active ? `${COLORS.lime}30` : COLORS.line}
              strokeWidth={e.active ? 1.5 : 1}
            />
          ))}

          {/* Nodes */}
          {layouts.map(({ node, x, y }) => {
            const status     = getStatus(node.id)
            const isSelected = selected?.id === node.id
            const isActive   = Object.values(activeSkills).includes(node.id)

            return (
              <g
                key={node.id}
                data-node={node.id}
                transform={`translate(${x}, ${y})`}
                style={{ cursor: 'pointer' }}
                onClick={(e) => { e.stopPropagation(); onSelect(node) }}
              >
                {/* Outer pulse ring for active nodes */}
                {status === 'active' && (
                  <circle r={NODE_R + 6} fill="none" stroke={COLORS.lime} strokeWidth={1} opacity={0.3}>
                    <animate attributeName="r" values={`${NODE_R + 4};${NODE_R + 10};${NODE_R + 4}`} dur="2.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.4;0.05;0.4" dur="2.5s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* Selection ring */}
                {isSelected && (
                  <circle r={NODE_R + 8} fill="none" stroke={COLORS.lime} strokeWidth={2} opacity={0.6} />
                )}

                {/* Main circle */}
                <circle
                  r={NODE_R}
                  fill={
                    status === 'unlocked' ? COLORS.lime :
                    status === 'active'   ? COLORS.bg3 :
                    COLORS.locked
                  }
                  stroke={
                    status === 'unlocked' ? COLORS.lime :
                    status === 'active'   ? COLORS.lime :
                    COLORS.lockedBorder
                  }
                  strokeWidth={status === 'locked' ? 1 : 2}
                  filter={status === 'unlocked' ? 'url(#glow-lime)' : status === 'active' ? 'url(#glow-dim)' : undefined}
                />

                {/* Level number */}
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  style={{
                    fontFamily: 'DM Mono, monospace',
                    fontSize: 13,
                    fontWeight: 600,
                    fill: status === 'unlocked' ? COLORS.bg :
                          status === 'active'   ? COLORS.lime :
                          COLORS.text3,
                    userSelect: 'none',
                  }}
                >
                  {node.progression_level}
                </text>

                {/* Active skill star */}
                {isActive && (
                  <text
                    x={NODE_R - 4}
                    y={-(NODE_R - 4)}
                    textAnchor="middle"
                    dominantBaseline="central"
                    style={{ fontSize: 12, fill: COLORS.yellow, userSelect: 'none' }}
                  >★</text>
                )}

                {/* Node name label */}
                <text
                  y={NODE_R + 14}
                  textAnchor="middle"
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: 10,
                    fill: status === 'locked' ? COLORS.text3 : COLORS.text2,
                    userSelect: 'none',
                  }}
                >
                  {node.name.length > 16 ? node.name.slice(0, 15) + '…' : node.name}
                </text>
              </g>
            )
          })}
        </g>
      </svg>

      {/* Hint */}
      <div
        className="absolute bottom-3 right-3 pointer-events-none"
        style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: COLORS.text3, textAlign: 'right' }}
      >
        Drag · pinch · scroll to navigate
        <br />Tap node to inspect
      </div>
    </div>
  )
}

// ─── List View ────────────────────────────────────────────────────────────────

const CATEGORY_ORDER = ['prerequisite', 'pulling', 'pushing', 'balance', 'mobility']
const CATEGORY_LABELS: Record<string, string> = {
  prerequisite: 'Prerequisites',
  pulling:      'Pulling Skills',
  pushing:      'Pushing Skills',
  balance:      'Balance',
  mobility:     'Mobility / Legs',
}

const ListView: React.FC<{
  nodes: SkillNode[]
  getStatus: (id: string) => NodeStatus
  getSessionCount: (id: string) => number
  activeSkills: ActiveSkillSelection
  selected: SkillNode | null
  onSelect: (n: SkillNode) => void
  filter: 'all' | 'active' | 'unlocked' | 'locked'
  setFilter: (f: 'all' | 'active' | 'unlocked' | 'locked') => void
}> = ({ nodes, getStatus, getSessionCount, activeSkills, selected, onSelect, filter, setFilter }) => {
  const byCategory = useMemo(() => {
    const m = new Map<string, SkillNode[]>()
    for (const n of nodes) {
      const arr = m.get(n.category) ?? []
      arr.push(n)
      m.set(n.category, arr)
    }
    return m
  }, [nodes])

  return (
    <div className="flex-1 px-4 pb-24 space-y-4">
      {/* Filter tabs */}
      <div
        className="flex rounded overflow-hidden"
        style={{ border: `1px solid ${COLORS.line2}`, fontFamily: 'DM Mono, monospace', fontSize: 10 }}
      >
        {(['all', 'active', 'unlocked', 'locked'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              flex: 1,
              padding: '8px 4px',
              background:    filter === f ? `${COLORS.lime}18` : 'transparent',
              color:         filter === f ? COLORS.lime : COLORS.text3,
              letterSpacing: 1,
              textTransform: 'uppercase',
              textAlign:     'center',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {CATEGORY_ORDER.map(category => {
        const catNodes = byCategory.get(category) ?? []
        const filtered = catNodes
          .filter(n => filter === 'all' || getStatus(n.id) === filter)
          .sort((a, b) => a.progression_level - b.progression_level)
        if (filtered.length === 0) return null

        return (
          <section key={category}>
            <div className="flex items-center gap-3 mb-2">
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: COLORS.text3, textTransform: 'uppercase', letterSpacing: 2 }}>
                {CATEGORY_LABELS[category]}
              </span>
              <div style={{ flex: 1, height: 1, background: COLORS.line }} />
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: COLORS.text3 }}>{filtered.length}</span>
            </div>

            <div className="space-y-1">
              {filtered.map(node => {
                const status     = getStatus(node.id)
                const isSelected = selected?.id === node.id
                const isActive   = Object.values(activeSkills).includes(node.id)

                return (
                  <button
                    key={node.id}
                    onClick={() => onSelect(node)}
                    className="w-full flex items-center gap-3 rounded text-left"
                    style={{
                      padding: '10px 12px',
                      background: isSelected ? `${COLORS.lime}12` : COLORS.bg2,
                      border: `1px solid ${isSelected ? COLORS.lime + '50' : COLORS.line}`,
                      opacity: status === 'locked' ? 0.45 : 1,
                    }}
                  >
                    <StatusDot status={status} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: COLORS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {node.name}
                        {isActive && <span style={{ marginLeft: 6, fontSize: 11, color: COLORS.yellow }}>★</span>}
                      </div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: COLORS.text3 }}>
                        L{node.progression_level} · {LEVEL_LABELS[node.progression_level]}
                      </div>
                    </div>
                    {getSessionCount(node.id) > 0 && (
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: COLORS.text3, flexShrink: 0 }}>
                        {getSessionCount(node.id)}×
                      </span>
                    )}
                    <span style={{ color: COLORS.text3, fontSize: 14 }}>›</span>
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}

// ─── Status Dot ───────────────────────────────────────────────────────────────

const StatusDot: React.FC<{ status: NodeStatus; size?: number }> = ({ status, size = 10 }) => {
  const color =
    status === 'unlocked' ? COLORS.lime :
    status === 'active'   ? COLORS.lime :
    COLORS.text3

  return (
    <span style={{
      display:      'inline-block',
      width:        size,
      height:       size,
      borderRadius: '50%',
      background:   status === 'unlocked' ? COLORS.lime : 'transparent',
      border:       `2px solid ${color}`,
      flexShrink:   0,
      boxShadow:    status !== 'locked' ? `0 0 6px ${COLORS.lime}60` : undefined,
    }} />
  )
}

// ─── Node Detail Sheet ────────────────────────────────────────────────────────

const NodeDetailSheet: React.FC<{
  node: SkillNode
  status: NodeStatus
  sessionCount: number
  nodes: SkillNode[]
  getStatus: (id: string) => NodeStatus
  activeSkills: ActiveSkillSelection
  isStalled: boolean
  onSetActive: (node: SkillNode) => void
  onClose: () => void
}> = ({ node, status, sessionCount, nodes, getStatus, activeSkills, isStalled, onSetActive, onClose }) => {
  const tree      = CATEGORY_TO_TREE[node.category] as SkillTreeType
  const isChosen  = activeSkills[tree] === node.id
  const canSelect = status === 'active' || status === 'unlocked'

  const criteria = node.unlock_criteria
  const criteriaText = [
    criteria.hold_seconds ? `${criteria.hold_seconds}s hold` : null,
    criteria.reps         ? `${criteria.reps} reps`          : null,
    `${criteria.sets} sets`,
    `${criteria.consecutive_sessions} consecutive sessions`,
  ].filter(Boolean).join(' · ')

  const dayLabel = node.session_placement.day_types.join(', ')
  const placementLabel = node.session_placement.order === 'before_strength' ? 'Before strength' : 'After strength'

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-20"
        style={{ background: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed inset-x-0 bottom-0 z-30 rounded-t-2xl overflow-y-auto"
        style={{
          background:    COLORS.bg3,
          borderTop:     `1px solid ${COLORS.line2}`,
          maxHeight:     '80vh',
          paddingBottom: 'env(safe-area-inset-bottom, 24px)',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div style={{ width: 36, height: 4, borderRadius: 2, background: COLORS.line2 }} />
        </div>

        <div className="px-4 pb-8">
          {/* Title row */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-start gap-3">
              <StatusOrb status={status} />
              <div>
                <h2 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 26, color: COLORS.text, lineHeight: 1, letterSpacing: 1 }}>
                  {node.name}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: COLORS.text3, textTransform: 'uppercase', letterSpacing: 2 }}>
                    Level {node.progression_level}
                  </span>
                  <span style={{ color: COLORS.line2 }}>·</span>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: COLORS.text3, textTransform: 'uppercase', letterSpacing: 1 }}>
                    {node.category}
                  </span>
                  <StatusBadge status={status} />
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ color: COLORS.text3, fontSize: 20, lineHeight: 1, flexShrink: 0, padding: '2px 6px' }}
            >×</button>
          </div>

          {/* Description */}
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: COLORS.text2, lineHeight: 1.6, marginBottom: 20 }}>
            {node.description}
          </p>

          {/* Stall warning */}
          {isStalled && (
            <div className="rounded p-3 mb-4" style={{ background: `${COLORS.yellow}0d`, border: `1px solid ${COLORS.yellow}44` }}>
              <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: COLORS.yellow, letterSpacing: 2, marginBottom: 4 }}>⚠ STALL</p>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: COLORS.text2 }}>
                Drop one level · add a set · focus on quality.
              </p>
            </div>
          )}

          {/* Unlock criteria */}
          <SheetSection label="Unlock Criteria">
            <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, color: COLORS.lime }}>
              {criteriaText}
            </p>
          </SheetSection>

          {/* Prerequisites */}
          {node.prerequisites.length > 0 && (
            <SheetSection label="Prerequisite Nodes">
              <div className="space-y-1">
                {node.prerequisites.map(pid => {
                  const pn  = nodes.find(n => n.id === pid)
                  const ps  = getStatus(pid)
                  return (
                    <div key={pid} className="flex items-center gap-2">
                      <StatusDot status={ps} size={8} />
                      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: ps === 'locked' ? COLORS.text3 : COLORS.text2 }}>
                        {pn?.name ?? pid}
                      </span>
                      <StatusBadge status={ps} small />
                    </div>
                  )
                })}
              </div>
            </SheetSection>
          )}

          {/* Strength prerequisites */}
          {node.strength_prerequisites.length > 0 && (
            <SheetSection label="Strength Prerequisites">
              <div className="flex flex-wrap gap-1">
                {node.strength_prerequisites.map((req, i) => (
                  <span key={i} style={{
                    fontFamily: 'DM Mono, monospace', fontSize: 11, color: COLORS.text2,
                    background: COLORS.bg2, border: `1px solid ${COLORS.line2}`,
                    borderRadius: 4, padding: '3px 7px',
                  }}>{req}</span>
                ))}
              </div>
            </SheetSection>
          )}

          {/* Skill-specific accessories */}
          <SheetSection label="Accessory Injections">
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: COLORS.text3, marginBottom: 6 }}>
              These populate your session accessory slot when this skill is active.
            </p>
            <div className="space-y-1">
              {node.skill_specific_accessories.map((acc, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: COLORS.text3, display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: COLORS.text2 }}>{acc}</span>
                </div>
              ))}
            </div>
          </SheetSection>

          {/* Session placement */}
          <SheetSection label="Session Placement">
            <div className="flex gap-3">
              <div>
                <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: COLORS.text3, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Days</p>
                <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 14, color: COLORS.text }}>
                  {dayLabel}
                </p>
              </div>
              <div style={{ width: 1, background: COLORS.line }} />
              <div>
                <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: COLORS.text3, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Order</p>
                <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 14, color: COLORS.text }}>
                  {placementLabel}
                </p>
              </div>
            </div>
          </SheetSection>

          {/* Session stats */}
          {(sessionCount > 0) && (
            <SheetSection label="Your Progress">
              <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, color: COLORS.text2 }}>
                {sessionCount} sessions logged at this node
              </p>
            </SheetSection>
          )}

          {/* Source credit */}
          <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: COLORS.text3, marginBottom: 20, opacity: 0.6 }}>
            Source: {node.source_credit}
          </p>

          {/* Set as active skill CTA */}
          {canSelect && (
            <button
              onClick={() => { onSetActive(node) }}
              disabled={isChosen}
              style={{
                width:         '100%',
                padding:       '14px',
                borderRadius:  8,
                fontFamily:    'Bebas Neue, sans-serif',
                fontSize:      18,
                letterSpacing: 2,
                background:    isChosen ? COLORS.bg2 : COLORS.lime,
                color:         isChosen ? COLORS.text3 : COLORS.bg,
                border:        isChosen ? `1px solid ${COLORS.line2}` : 'none',
                cursor:        isChosen ? 'default' : 'pointer',
              }}
            >
              {isChosen ? `★ ACTIVE — ${TREE_LABELS[tree] ?? 'TREE'}` : `SET AS ACTIVE — ${TREE_LABELS[tree] ?? 'SKILL'}`}
            </button>
          )}
        </div>
      </div>
    </>
  )
}

// ─── Sheet helpers ────────────────────────────────────────────────────────────

const SheetSection: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="mb-5">
    <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: COLORS.text3, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>
      {label}
    </p>
    {children}
  </div>
)

const StatusBadge: React.FC<{ status: NodeStatus; small?: boolean }> = ({ status, small }) => {
  const map: Record<NodeStatus, { label: string; color: string; bg: string }> = {
    locked:   { label: '🔒 Locked',   color: COLORS.text3, bg: COLORS.line },
    active:   { label: '⚡ Active',   color: COLORS.lime,  bg: `${COLORS.lime}18` },
    unlocked: { label: '✅ Unlocked', color: COLORS.lime,  bg: `${COLORS.lime}28` },
  }
  const m = map[status]
  return (
    <span style={{
      fontFamily:    'DM Mono, monospace',
      fontSize:      small ? 9 : 10,
      color:         m.color,
      background:    m.bg,
      borderRadius:  3,
      padding:       small ? '1px 5px' : '2px 6px',
      letterSpacing: 0.5,
    }}>{m.label}</span>
  )
}

const StatusOrb: React.FC<{ status: NodeStatus }> = ({ status }) => {
  const size = 40
  if (status === 'unlocked') {
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: COLORS.lime,
        boxShadow: `0 0 16px ${COLORS.limeGlow}`,
        flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'DM Sans, sans-serif', fontSize: 18,
      }}>✓</div>
    )
  }
  if (status === 'active') {
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: COLORS.bg,
        border: `2px solid ${COLORS.lime}`,
        boxShadow: `0 0 10px ${COLORS.lime}50`,
        flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'DM Sans, sans-serif', fontSize: 18, color: COLORS.lime,
      }}>⚡</div>
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: COLORS.locked,
      border: `2px solid ${COLORS.lockedBorder}`,
      flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 16,
    }}>🔒</div>
  )
}

export default SkillTree
