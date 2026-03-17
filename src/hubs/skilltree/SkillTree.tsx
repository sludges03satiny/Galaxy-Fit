import React, {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
} from 'react'
import { useSkillTree } from '../../hooks/useSkillTree'
import { useAthleteProfile } from '../../hooks/useAthleteProfile'
import type {
  SkillNode,
  NodeStatus,
  SkillTree as SkillTreeType,
  ActiveSkillSelection,
} from '../../types/skill'

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS = {
  bg:           '#0a0a08',
  bg2:          '#111110',
  bg3:          '#1a1a17',
  line:         '#2a2a25',
  line2:        '#3a3a33',
  text:         '#e8e8e0',
  text2:        '#a0a09a',
  text3:        '#5a5a52',
  lime:         '#c8f050',
  limeGlow:     'rgba(200,240,80,0.35)',
  yellow:       '#f0c828',
  red:          '#f05050',
  locked:       '#1a1a18',
  lockedBorder: '#333333',
}

const NODE_R   = 18   // radius px — tighter than v1's 24
const H_GAP    = 120  // horizontal gap between tree columns (tighter than v1's 180)
const V_GAP    = 90   // vertical gap between nodes
const PADDING  = 80   // canvas edge padding (also used for bounds clamp)
const HEADER_H = 50   // reserved height at top of canvas for tree labels

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

// Map category → tree (for the detail sheet tree label)
const CATEGORY_TO_TREE: Record<string, SkillTreeType> = {
  pulling:      'pulling',
  pushing:      'pushing',
  balance:      'balance',
  mobility:     'mobility',
  prerequisite: 'pulling',
}

// Prerequisite nodes span multiple trees — use the same day-type logic as buildLayout
// so the "active slot" assignment and the visual column always agree.
function getNodeTree(node: SkillNode): SkillTreeType {
  if (node.category !== 'prerequisite') {
    return CATEGORY_TO_TREE[node.category] ?? 'pulling'
  }
  const days = node.session_placement.day_types
  return days.includes('B') && !days.includes('C') ? 'pushing' : 'pulling'
}

const LEVEL_LABELS = ['', 'Beginner', 'Novice', 'Intermediate', 'Advanced', 'Elite']

// Maps each goal terminal node ID → the tree columns required to show all ancestor nodes.
// Multiple trees appear when a goal's prerequisite chain crosses tree boundaries
// (e.g. muscle-up requires ring-dip which lives in the pushing column).
const GOAL_TREE_MAP: Record<string, SkillTreeType[]> = {
  'front-lever':             ['pulling'],
  'back-lever':              ['pulling'],
  'muscle-up':               ['pulling', 'pushing'],
  'human-flag':              ['pulling', 'pushing'],
  'planche':                 ['pushing', 'pulling'],
  'l-sit':                   ['pushing', 'pulling'],
  'freestanding-handstand':  ['balance', 'pushing', 'pulling'],
  'dragon-flag':             ['pushing', 'pulling'],
  'freestanding-hspu':       ['pushing', 'balance', 'pulling'],
  'pistol-squat':            ['mobility'],
  'nordic-curl':             ['mobility'],
}

// Display labels for goal skills (used in the header GOALS line)
const GOAL_LABELS: Record<string, string> = {
  'front-lever':             'Front Lever',
  'back-lever':              'Back Lever',
  'muscle-up':               'Muscle-Up',
  'human-flag':              'Human Flag',
  'planche':                 'Planche',
  'l-sit':                   'L-Sit',
  'freestanding-handstand':  'Handstand',
  'dragon-flag':             'Dragon Flag',
  'freestanding-hspu':       'HSPU',
  'pistol-squat':            'Pistol Squat',
  'nordic-curl':             'Nordic Curl',
}

const ZOOM_MIN = 0.4
const ZOOM_MAX = 1.5

// ─── Layout computation ───────────────────────────────────────────────────────

interface NodeLayout {
  node:   SkillNode
  x:      number
  y:      number
  tree:   SkillTreeType
  column: number
}

/**
 * Assigns each node to a column and computes x/y coordinates.
 *
 * Bottom-up: foundation nodes (level 1) sit at the BOTTOM of their column.
 * Higher progression_level = higher on screen (lower y coordinate).
 *
 * Prerequisite nodes that serve B-day trees (pushing/balance) go in the
 * pushing column; all other prerequisites go in the pulling column.
 */
function buildLayout(nodes: SkillNode[]): {
  layouts:     NodeLayout[]
  canvasWidth:  number
  canvasHeight: number
} {
  const treeMap: Record<SkillTreeType, SkillNode[]> = {
    pulling: [], pushing: [], balance: [], mobility: [],
  }

  for (const n of nodes) {
    if (n.category === 'prerequisite') {
      const days = n.session_placement.day_types
      if (days.includes('B') && !days.includes('C')) {
        treeMap.pushing.push(n)
      } else {
        treeMap.pulling.push(n)
      }
    } else {
      const tree = CATEGORY_TO_TREE[n.category] as SkillTreeType ?? 'pulling'
      treeMap[tree].push(n)
    }
  }

  const layouts: NodeLayout[] = []
  const columnXs: number[] = []

  // Only include trees that have at least one node (filters out unselected goal trees)
  const visibleTreeOrder = TREE_ORDER.filter(t => treeMap[t].length > 0)

  // Compute per-column max depth so we can align bottoms
  const columnDepths: number[] = visibleTreeOrder.map(tree => treeMap[tree].length)
  const maxDepth = Math.max(...columnDepths, 1)

  visibleTreeOrder.forEach((tree, visibleIdx) => {
    const col = treeMap[tree]
    // Sort ascending by progression_level: level 1 at bottom → level 5 at top
    const sorted = [...col].sort((a, b) => a.progression_level - b.progression_level)

    const colWidth = NODE_R * 2
    const cx = PADDING + visibleIdx * (colWidth + H_GAP) + NODE_R
    columnXs.push(cx)

    const bottomY = HEADER_H + PADDING + (maxDepth - 1) * (NODE_R * 2 + V_GAP) + NODE_R

    sorted.forEach((node, rowIdx) => {
      // rowIdx 0 = lowest progression level → highest y (bottom)
      const y = bottomY - rowIdx * (NODE_R * 2 + V_GAP)
      layouts.push({
        node,
        x: cx,
        y,
        tree,
        column: visibleIdx,
      })
    })
  })

  const canvasWidth  = PADDING + visibleTreeOrder.length * (NODE_R * 2 + H_GAP) - H_GAP + NODE_R + PADDING
  const allY         = layouts.map(l => l.y)
  const minY         = Math.min(...allY)
  const maxY         = Math.max(...allY)
  const canvasHeight = maxY - minY + NODE_R + PADDING + HEADER_H + 40

  // Shift all nodes down by |minY - HEADER_H - PADDING| if minY went negative
  const yShift = minY < (HEADER_H + PADDING + NODE_R)
    ? (HEADER_H + PADDING + NODE_R) - minY
    : 0

  return {
    layouts: layouts.map(l => ({ ...l, y: l.y + yShift })),
    canvasWidth,
    canvasHeight: canvasHeight + yShift,
  }
}

// ─── Star field generation (deterministic from seed) ─────────────────────────

interface Star { x: number; y: number; r: number; opacity: number }

function generateStars(w: number, h: number, count = 150): Star[] {
  const stars: Star[] = []
  // Simple deterministic pseudo-random seeded by canvas dimensions
  let seed = w * 1.3 + h * 0.7
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
  for (let i = 0; i < count; i++) {
    stars.push({
      x:       rand() * w,
      y:       rand() * h,
      r:       0.8 + rand() * 0.7,
      opacity: 0.08 + rand() * 0.27,
    })
  }
  return stars
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const SkillTree: React.FC = () => {
  const {
    nodes,
    getStatus,
    getSessionCount,
    stalledNodes,
    validation,
    STALL_THRESHOLD,
  } = useSkillTree()
  const { profile, updateActiveSkill } = useAthleteProfile()

  const [view, setView]         = useState<'graph' | 'list'>('graph')
  const [selected, setSelected] = useState<SkillNode | null>(null)
  const [selectedOrigin, setSelectedOrigin] = useState<{ x: number; y: number } | null>(null)
  const [confirmReplace, setConfirmReplace] = useState<{ node: SkillNode; replacing: SkillNode } | null>(null)
  const [dismissedStalls, setDismissedStalls] = useState<Set<string>>(new Set())
  const [filter, setFilter]     = useState<'all' | 'active' | 'unlocked' | 'locked'>('all')

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const activeSkills = profile.activeSkills ?? {}

  // Filter nodes to only those belonging to the user's selected goal trees.
  // Falls back to showing all nodes when no goals are set (legacy / onboarding not done).
  const visibleNodes = useMemo(() => {
    const goalSkills = profile.goalSkills ?? []
    if (goalSkills.length === 0) return nodes

    const visibleTrees = new Set<SkillTreeType>()
    for (const goalId of goalSkills) {
      for (const tree of (GOAL_TREE_MAP[goalId] ?? [])) {
        visibleTrees.add(tree)
      }
    }
    return nodes.filter(n => visibleTrees.has(getNodeTree(n)))
  }, [nodes, profile.goalSkills])

  const goalLabels = useMemo(() => {
    const goals = profile.goalSkills ?? []
    return goals.map(id => GOAL_LABELS[id]).filter(Boolean)
  }, [profile.goalSkills])

  const visibleStalls   = stalledNodes.filter(n => !dismissedStalls.has(n.id))
  // "selected" = skills the user has actively chosen (one per tree)
  const selectedCount   = Object.values(activeSkills).filter(Boolean).length
  // "eligible" = nodes with status 'active' (prerequisites met, being trained)
  const eligibleCount   = visibleNodes.filter(n => getStatus(n.id) === 'active').length
  const unlockedCount   = visibleNodes.filter(n => getStatus(n.id) === 'unlocked').length
  const lockedCount     = visibleNodes.filter(n => getStatus(n.id) === 'locked').length

  const handleSetActive = useCallback((node: SkillNode) => {
    const tree       = getNodeTree(node)
    const currentId  = activeSkills[tree]
    const currentNode = currentId ? nodes.find(n => n.id === currentId) : null
    if (currentNode && currentNode.id !== node.id) {
      // Already have a different skill selected in this tree — ask for confirmation
      setConfirmReplace({ node, replacing: currentNode })
    } else {
      updateActiveSkill(tree, node.id)
      setSelected(null)
      setSelectedOrigin(null)
    }
  }, [updateActiveSkill, activeSkills, nodes])

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
            <div className="flex gap-3 mt-1 flex-wrap" style={{ fontFamily: 'DM Mono, monospace', fontSize: 11 }}>
              <span style={{ color: COLORS.lime }}>{selectedCount} selected</span>
              <span style={{ color: COLORS.text2 }}>{eligibleCount} eligible</span>
              <span style={{ color: COLORS.text2 }}>{unlockedCount} unlocked</span>
              <span style={{ color: COLORS.text3 }}>{lockedCount} locked</span>
            </div>
            {goalLabels.length > 0 && (
              <div className="mt-1" style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: COLORS.text3, letterSpacing: 1 }}>
                GOALS: {goalLabels.join(' · ')}
              </div>
            )}
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
                  padding:       '6px 12px',
                  background:    view === v ? COLORS.lime : 'transparent',
                  color:         view === v ? COLORS.bg : COLORS.text3,
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
        <div
          className="mx-4 mb-3 rounded"
          style={{ border: `1px solid ${COLORS.yellow}44`, background: `${COLORS.yellow}0a` }}
        >
          <div className="flex items-center justify-between px-3 pt-2 pb-1">
            <span style={{
              fontFamily:    'DM Mono, monospace',
              fontSize:      10,
              color:         COLORS.yellow,
              letterSpacing: 2,
              textTransform: 'uppercase',
            }}>
              ⚠ Stall Detected
            </span>
          </div>
          {visibleStalls.map(n => (
            <div key={n.id} className="flex items-center justify-between px-3 py-1">
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: COLORS.text2 }}>
                {n.name}
              </span>
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
          nodes={visibleNodes}
          getStatus={getStatus}
          activeSkills={activeSkills}
          selected={selected}
          onSelect={(node, origin) => {
            setSelectedOrigin(origin ?? null)
            setSelected(node)
          }}
        />
      ) : (
        <ListView
          nodes={visibleNodes}
          getStatus={getStatus}
          getSessionCount={getSessionCount}
          activeSkills={activeSkills}
          selected={selected}
          onSelect={(node) => {
            setSelectedOrigin(null)
            setSelected(node)
          }}
          filter={filter}
          setFilter={setFilter}
        />
      )}

      {/* ── Validation errors (dev) ── */}
      {!validation.valid && (
        <div
          className="mx-4 mb-4 rounded p-3"
          style={{ border: `1px solid ${COLORS.red}44`, background: `${COLORS.red}08` }}
        >
          <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: COLORS.red, letterSpacing: 2 }}>
            GRAPH ERRORS
          </p>
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
          onClose={() => { setSelected(null); setSelectedOrigin(null) }}
          origin={selectedOrigin}
        />
      )}

      {/* ── Replace confirmation modal ── */}
      {confirmReplace && (
        <>
          <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setConfirmReplace(null)} />
          <div
            className="fixed z-50 rounded-2xl"
            style={{
              left: '50%', top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 'min(340px, 90vw)',
              background: COLORS.bg3,
              border: `1px solid ${COLORS.line2}`,
              padding: 24,
            }}
          >
            <p style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 20, color: COLORS.text, letterSpacing: 1, marginBottom: 8 }}>
              Replace Active Skill?
            </p>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: COLORS.text2, lineHeight: 1.6, marginBottom: 20 }}>
              <span style={{ color: COLORS.lime }}>{confirmReplace.node.name}</span> will replace{' '}
              <span style={{ color: COLORS.yellow }}>{confirmReplace.replacing.name}</span> as your active{' '}
              {TREE_LABELS[CATEGORY_TO_TREE[confirmReplace.node.category] as SkillTreeType]} skill.
              Only one skill per tree can be trained at a time.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmReplace(null)}
                style={{
                  flex: 1, padding: '12px',
                  borderRadius: 8,
                  fontFamily: 'DM Mono, monospace', fontSize: 12, letterSpacing: 1,
                  background: 'transparent', color: COLORS.text3,
                  border: `1px solid ${COLORS.line2}`,
                  cursor: 'pointer',
                }}
              >CANCEL</button>
              <button
                onClick={() => {
                  const tree = CATEGORY_TO_TREE[confirmReplace.node.category] as SkillTreeType
                  updateActiveSkill(tree, confirmReplace.node.id)
                  setConfirmReplace(null)
                  setSelected(null)
                  setSelectedOrigin(null)
                }}
                style={{
                  flex: 1, padding: '12px',
                  borderRadius: 8,
                  fontFamily: 'Bebas Neue, sans-serif', fontSize: 16, letterSpacing: 1,
                  background: COLORS.lime, color: COLORS.bg,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >REPLACE</button>
            </div>
          </div>
        </>
      )}

      {/* CSS animations */}
      <style>{`
        @keyframes skillPulse {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.15); }
        }
        @keyframes skillGlowPulse {
          0%, 100% { opacity: 0.2; }
          50%       { opacity: 0.04; }
        }
        @keyframes starburst {
          0%   { transform: translate(var(--sx), var(--sy)) scale(1); opacity: 1; }
          100% { transform: translate(calc(var(--sx)*4.5), calc(var(--sy)*4.5)) scale(0); opacity: 0; }
        }
        @keyframes sheetExpand {
          0%   { transform: translateY(100%) scale(0.6); transform-origin: var(--ox) var(--oy); opacity: 0; }
          60%  { opacity: 1; }
          100% { transform: translateY(0%) scale(1);   transform-origin: var(--ox) var(--oy); opacity: 1; }
        }
        .skill-node-active {
          animation: skillPulse 2.5s ease-in-out infinite;
          transform-origin: center;
          transform-box: fill-box;
        }
        .skill-glow-ring {
          animation: skillGlowPulse 2.5s ease-in-out infinite;
        }
        .starburst-dot {
          animation: starburst 0.5s ease-out forwards;
        }
        .sheet-enter {
          animation: sheetExpand 0.38s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>
    </div>
  )
}

// ─── Active Skill Summary ─────────────────────────────────────────────────────

const ActiveSkillSummary: React.FC<{
  activeSkills: ActiveSkillSelection
  nodes:        SkillNode[]
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
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: TREE_COLORS[tree], display: 'inline-block', flexShrink: 0,
          }} />
          <span style={{
            fontFamily:    'DM Mono, monospace',
            fontSize:      10,
            color:         COLORS.text3,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}>
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

interface Transform { x: number; y: number; scale: number }

const ConstellationGraph: React.FC<{
  nodes:       SkillNode[]
  getStatus:   (id: string) => NodeStatus
  activeSkills: ActiveSkillSelection
  selected:    SkillNode | null
  onSelect:    (n: SkillNode, origin?: { x: number; y: number }) => void
}> = ({ nodes, getStatus, activeSkills, selected, onSelect }) => {
  const containerRef    = useRef<HTMLDivElement>(null)
  const [tx, setTx]     = useState<Transform>({ x: 0, y: 0, scale: 0.85 })
  const txRef           = useRef<Transform>({ x: 0, y: 0, scale: 0.85 })
  const isDragging      = useRef(false)
  const dragStart       = useRef({ cx: 0, cy: 0, tx: 0, ty: 0 })
  const pointerDelta    = useRef(0)
  const lastPinchDist   = useRef<number | null>(null)

  // Track which nodes just unlocked (for starburst)
  const prevStatusRef   = useRef<Map<string, NodeStatus>>(new Map())
  const [starbursts, setStarbursts] = useState<Map<string, number>>(new Map()) // nodeId → timestamp

  const { layouts, canvasWidth, canvasHeight } = useMemo(() => buildLayout(nodes), [nodes])
  const layoutMap = useMemo(() => {
    const m = new Map<string, NodeLayout>()
    layouts.forEach(l => m.set(l.node.id, l))
    return m
  }, [layouts])

  const stars = useMemo(() => generateStars(canvasWidth, canvasHeight), [canvasWidth, canvasHeight])

  // ── Bounds clamp ──────────────────────────────────────────────────────────
  const clamp = useCallback((next: Transform): Transform => {
    const container = containerRef.current
    if (!container) return next
    const { width: vw, height: vh } = container.getBoundingClientRect()

    // The canvas in world coords spans [0, canvasWidth] × [0, canvasHeight]
    // In screen coords: world * scale + offset
    // Clamp so at least PADDING px of canvas is visible on each side
    const pad = PADDING

    const minX = vw - canvasWidth  * next.scale - pad
    const maxX = pad
    const minY = vh - canvasHeight * next.scale - pad
    const maxY = pad

    return {
      x:     Math.min(maxX, Math.max(minX, next.x)),
      y:     Math.min(maxY, Math.max(minY, next.y)),
      scale: next.scale,
    }
  }, [canvasWidth, canvasHeight])

  // Instant apply — used during drag/pinch so there's zero lag
  const applyTx = useCallback((next: Transform) => {
    const clamped = clamp(next)
    txRef.current = clamped
    setTx(clamped)
  }, [clamp])

  // Animated apply — smooth eased transition used by buttons and node tap
  const animFrameRef = useRef<number | null>(null)
  const animateTo = useCallback((target: Transform, durationMs = 420) => {
    if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current)

    const clamped = clamp(target)
    const start   = { ...txRef.current }
    const startMs = performance.now()

    // Ease out cubic
    const ease = (t: number) => 1 - Math.pow(1 - t, 3)

    const tick = (now: number) => {
      const elapsed = now - startMs
      const t       = Math.min(1, elapsed / durationMs)
      const e       = ease(t)

      const current: Transform = {
        x:     start.x     + (clamped.x     - start.x)     * e,
        y:     start.y     + (clamped.y     - start.y)     * e,
        scale: start.scale + (clamped.scale - start.scale) * e,
      }
      txRef.current = current
      setTx(current)

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(tick)
      } else {
        animFrameRef.current = null
      }
    }

    animFrameRef.current = requestAnimationFrame(tick)
  }, [clamp])

  // Cancel any running animation when user starts dragging
  const cancelAnim = () => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
  }

  // ── Initial viewport: fit active nodes to container ──────────────────────
  useEffect(() => {
    const container = containerRef.current
    if (!container || layouts.length === 0) return
    const { width: vw, height: vh } = container.getBoundingClientRect()

    const activeLayouts = layouts.filter(l => {
      const s = getStatus(l.node.id)
      return s === 'active' || s === 'unlocked'
    })
    const target = activeLayouts.length > 0 ? activeLayouts : layouts

    const xs = target.map(l => l.x)
    const ys = target.map(l => l.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2

    // Compute a scale that fits the cluster with ~30% padding on each side
    const clusterW = Math.max(maxX - minX + NODE_R * 10, 200)
    const clusterH = Math.max(maxY - minY + NODE_R * 10, 200)
    const scaleX   = (vw  * 0.7) / clusterW
    const scaleY   = (vh  * 0.7) / clusterH
    const scale    = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.min(scaleX, scaleY)))

    const initTx = clamp({
      x:     vw / 2 - cx * scale,
      y:     vh / 2 - cy * scale,
      scale,
    })
    txRef.current = initTx
    setTx(initTx)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layouts.length, canvasWidth, canvasHeight])

  // ── Starburst detection ───────────────────────────────────────────────────
  useEffect(() => {
    const newBursts = new Map(starbursts)
    let changed = false
    for (const n of nodes) {
      const prev = prevStatusRef.current.get(n.id)
      const curr = getStatus(n.id)
      if (prev === 'active' && curr === 'unlocked') {
        newBursts.set(n.id, Date.now())
        changed = true
      }
      prevStatusRef.current.set(n.id, curr)
    }
    if (changed) setStarbursts(newBursts)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, getStatus])

  // ── Mouse events ─────────────────────────────────────────────────────────
  const onMouseDown = (e: React.MouseEvent) => {
    // Always reset pointer delta so stale drag distance never blocks a click
    pointerDelta.current = 0
    // Don't start a canvas pan when pressing on a node — but do NOT return early
    // so that pointerDelta is always reset before handleNodeClick fires
    if ((e.target as Element).closest('[data-node]')) return
    cancelAnim()
    isDragging.current = true
    dragStart.current = {
      cx: e.clientX, cy: e.clientY,
      tx: txRef.current.x, ty: txRef.current.y,
    }
    e.preventDefault()
  }

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return
    const dx = e.clientX - dragStart.current.cx
    const dy = e.clientY - dragStart.current.cy
    pointerDelta.current = Math.hypot(dx, dy)
    applyTx({ ...txRef.current, x: dragStart.current.tx + dx, y: dragStart.current.ty + dy })
  }, [applyTx])

  const onMouseUp = useCallback(() => { isDragging.current = false }, [])

  // ── Touch events ─────────────────────────────────────────────────────────
  const onTouchStart = (e: React.TouchEvent) => {
    cancelAnim()
    if (e.touches.length === 1) {
      isDragging.current   = true
      pointerDelta.current = 0
      dragStart.current = {
        cx: e.touches[0].clientX, cy: e.touches[0].clientY,
        tx: txRef.current.x,      ty: txRef.current.y,
      }
    }
    if (e.touches.length === 2) {
      isDragging.current = false
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastPinchDist.current = Math.hypot(dx, dy)
    }
  }

  const onTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault()
    if (e.touches.length === 1 && isDragging.current) {
      const dx = e.touches[0].clientX - dragStart.current.cx
      const dy = e.touches[0].clientY - dragStart.current.cy
      pointerDelta.current = Math.hypot(dx, dy)
      applyTx({ ...txRef.current, x: dragStart.current.tx + dx, y: dragStart.current.ty + dy })
    }
    if (e.touches.length === 2 && lastPinchDist.current !== null) {
      const dx     = e.touches[0].clientX - e.touches[1].clientX
      const dy     = e.touches[0].clientY - e.touches[1].clientY
      const dist   = Math.hypot(dx, dy)
      const factor = dist / lastPinchDist.current
      lastPinchDist.current = dist
      const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, txRef.current.scale * factor))
      applyTx({ ...txRef.current, scale: next })
    }
  }, [applyTx])

  const onTouchEnd = useCallback(() => {
    isDragging.current    = false
    lastPinchDist.current = null
  }, [])

  // ── Wheel: pan on trackpad swipe, zoom on pinch or mouse scroll wheel ───────
  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()

    // ctrlKey is set by the browser for trackpad pinch-to-zoom and physical scroll wheel.
    // Without ctrlKey it's a two-finger trackpad swipe → pan.
    if (e.ctrlKey) {
      // Zoom toward cursor
      const factor = e.deltaY < 0 ? 1.1 : 0.9
      const next   = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, txRef.current.scale * factor))
      const container = containerRef.current
      if (container) {
        const rect = container.getBoundingClientRect()
        const mx   = e.clientX - rect.left
        const my   = e.clientY - rect.top
        const sx   = (mx - txRef.current.x) / txRef.current.scale
        const sy   = (my - txRef.current.y) / txRef.current.scale
        applyTx({ x: mx - sx * next, y: my - sy * next, scale: next })
      } else {
        applyTx({ ...txRef.current, scale: next })
      }
    } else {
      // Pan — use deltaX + deltaY directly (trackpad two-finger swipe)
      applyTx({
        ...txRef.current,
        x: txRef.current.x - e.deltaX,
        y: txRef.current.y - e.deltaY,
      })
    }
  }, [applyTx])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup',   onMouseUp)
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend',  onTouchEnd)
    el.addEventListener('wheel',     onWheel, { passive: false })
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup',   onMouseUp)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend',  onTouchEnd)
      el.removeEventListener('wheel',     onWheel)
      if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current)
    }
  }, [onMouseMove, onMouseUp, onTouchMove, onTouchEnd, onWheel])

  // ── Centre-on-active button ───────────────────────────────────────────────
  const centreOnActive = () => {
    const container = containerRef.current
    if (!container) return
    const { width: vw, height: vh } = container.getBoundingClientRect()

    const activeLayouts = layouts.filter(l => {
      const s = getStatus(l.node.id)
      return s === 'active' || s === 'unlocked'
    })
    const target = activeLayouts.length > 0 ? activeLayouts : layouts

    const xs = target.map(l => l.x)
    const ys = target.map(l => l.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2

    // Compute a scale that fits the cluster with generous padding
    const clusterW = Math.max(maxX - minX + NODE_R * 8, 200)
    const clusterH = Math.max(maxY - minY + NODE_R * 8, 200)
    const scaleX   = (vw * 0.75) / clusterW
    const scaleY   = (vh * 0.75) / clusterH
    const scale    = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.min(scaleX, scaleY)))

    animateTo(clamp({
      x:     vw / 2 - cx * scale,
      y:     vh / 2 - cy * scale,
      scale,
    }))
  }

  // ── Fit-all button ────────────────────────────────────────────────────────
  const fitAll = () => {
    const container = containerRef.current
    if (!container || layouts.length === 0) return
    const { width: vw, height: vh } = container.getBoundingClientRect()

    const scaleX = (vw - PADDING * 2) / canvasWidth
    const scaleY = (vh - PADDING * 2) / canvasHeight
    const scale  = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.min(scaleX, scaleY)))

    animateTo(clamp({
      x:     (vw - canvasWidth  * scale) / 2,
      y:     (vh - canvasHeight * scale) / 2,
      scale,
    }))
  }

  // ── Edge list ─────────────────────────────────────────────────────────────
  const edges = useMemo(() => {
    const list: Array<{
      from:       NodeLayout
      to:         NodeLayout
      fromStatus: NodeStatus
      toStatus:   NodeStatus
    }> = []
    for (const layout of layouts) {
      for (const prereqId of layout.node.prerequisites) {
        const prereqLayout = layoutMap.get(prereqId)
        if (!prereqLayout) continue
        list.push({
          from:       prereqLayout,
          to:         layout,
          fromStatus: getStatus(prereqId),
          toStatus:   getStatus(layout.node.id),
        })
      }
    }
    return list
  }, [layouts, layoutMap, getStatus])

  // ── Bezier path helper ────────────────────────────────────────────────────
  const bezierPath = (from: NodeLayout, to: NodeLayout): string => {
    const x1 = from.x
    const y1 = from.y
    const x2 = to.x
    const y2 = to.y
    // Control points: vertical tension between points
    const ky = (y1 - y2) * 0.45
    return `M ${x1} ${y1} C ${x1} ${y1 - ky}, ${x2} ${y2 + ky}, ${x2} ${y2}`
  }

  // ── Starburst directions ──────────────────────────────────────────────────
  const BURST_DIRS = [0, 45, 90, 135, 180, 225, 270, 315].map(deg => {
    const rad = (deg * Math.PI) / 180
    return { sx: Math.cos(rad), sy: Math.sin(rad) }
  })

  // ── Node click handler (pan-safe) ─────────────────────────────────────────
  const handleNodeClick = (e: React.MouseEvent, node: SkillNode) => {
    e.stopPropagation()
    if (pointerDelta.current > 4) return

    const container = containerRef.current
    const layout    = layoutMap.get(node.id)

    // Compute the node's current screen position for the sheet origin animation
    let screenOrigin: { x: number; y: number } | undefined
    if (container && layout) {
      const rect  = container.getBoundingClientRect()
      const sx    = layout.x * txRef.current.scale + txRef.current.x + rect.left
      const sy    = layout.y * txRef.current.scale + txRef.current.y + rect.top
      screenOrigin = { x: sx, y: sy }

      // Zoom into the node — target upper third of viewport so it shows above the sheet
      const { width: vw, height: vh } = container.getBoundingClientRect()
      const targetScale = Math.min(ZOOM_MAX, Math.max(txRef.current.scale, 1.1))
      animateTo(
        clamp({
          x:     vw / 2 - layout.x * targetScale,
          y:     vh * 0.28 - layout.y * targetScale,  // upper third, not centre
          scale: targetScale,
        }),
        320
      )
    }

    // Open sheet after a short delay so the zoom reads first
    setTimeout(() => onSelect(node, screenOrigin), 160)
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden"
      style={{
        minHeight:   'calc(100vh - 200px)',
        width:       '100%',
        cursor:      isDragging.current ? 'grabbing' : 'grab',
        touchAction: 'none',
        userSelect:  'none',
      }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    >
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}
      >
        <defs>
          <filter id="glow-lime">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="glow-dim">
            <feGaussianBlur stdDeviation="1.5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          {/* Nebula gradients */}
          <radialGradient id="nebula1" cx="20%" cy="15%" r="40%">
            <stop offset="0%" stopColor="#4b3080" stopOpacity="0.12"/>
            <stop offset="100%" stopColor="#4b3080" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="nebula2" cx="80%" cy="50%" r="35%">
            <stop offset="0%" stopColor="#1e3a5f" stopOpacity="0.10"/>
            <stop offset="100%" stopColor="#1e3a5f" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="nebula3" cx="45%" cy="85%" r="40%">
            <stop offset="0%" stopColor="#3d1c6b" stopOpacity="0.09"/>
            <stop offset="100%" stopColor="#3d1c6b" stopOpacity="0"/>
          </radialGradient>
        </defs>

        <g transform={`translate(${tx.x}, ${tx.y}) scale(${tx.scale})`}>

          {/* ── Background: nebula blobs ── */}
          <rect x={0} y={0} width={canvasWidth} height={canvasHeight} fill="none"/>
          <rect x={0} y={0} width={canvasWidth} height={canvasHeight} fill="url(#nebula1)"/>
          <rect x={0} y={0} width={canvasWidth} height={canvasHeight} fill="url(#nebula2)"/>
          <rect x={0} y={0} width={canvasWidth} height={canvasHeight} fill="url(#nebula3)"/>

          {/* ── Background: star field ── */}
          {stars.map((s, i) => (
            <circle
              key={i}
              cx={s.x} cy={s.y} r={s.r}
              fill="white"
              opacity={s.opacity}
            />
          ))}

          {/* ── Tree column labels ── */}
          {TREE_ORDER.map((tree) => {
            const col = layouts.filter(l => l.tree === tree)
            if (col.length === 0) return null
            const cx = col[0].x
            return (
              <text
                key={tree}
                x={cx}
                y={HEADER_H - 10}
                textAnchor="middle"
                style={{
                  fontFamily:    'Bebas Neue, sans-serif',
                  fontSize:      12,
                  letterSpacing: 3,
                  fill:          TREE_COLORS[tree],
                  opacity:       0.7,
                  userSelect:    'none',
                }}
              >
                {TREE_LABELS[tree]}
              </text>
            )
          })}

          {/* ── Edges (rendered behind nodes) ── */}
          {edges.map((e, i) => {
            const bothUnlocked = e.fromStatus === 'unlocked' && e.toStatus === 'unlocked'
            const anyActive    = e.fromStatus !== 'locked' && e.toStatus !== 'locked'
            const stroke       = bothUnlocked || anyActive ? COLORS.lime : '#333333'
            const opacity      = bothUnlocked ? 0.4 : anyActive ? 0.2 : 0.4
            const strokeWidth  = bothUnlocked ? 1.5 : anyActive ? 1.2 : 0.8
            return (
              <path
                key={i}
                d={bezierPath(e.from, e.to)}
                stroke={stroke}
                strokeOpacity={opacity}
                strokeWidth={strokeWidth}
                fill="none"
              />
            )
          })}

          {/* ── Nodes ── */}
          {layouts.map(({ node, x, y }) => {
            const status     = getStatus(node.id)
            const isSelected = selected?.id === node.id
            const isChosen   = Object.values(activeSkills).includes(node.id)
            const hasBurst   = starbursts.has(node.id)

            // A node is "tree-occupied" if it's eligible (active status) but a DIFFERENT
            // node in the same tree is already the chosen active skill — signal to user
            // that selecting this would replace the current one
            const nodeTree     = getNodeTree(node)
            const treeChosen   = activeSkills[nodeTree]
            const treeOccupied = status === 'active' && !!treeChosen && treeChosen !== node.id

            // Derive visual stroke/fill based on state
            const strokeColor =
              isChosen      ? COLORS.lime :
              status === 'unlocked' ? COLORS.lime :
              status === 'active' && treeOccupied ? COLORS.yellow :
              status === 'active'   ? COLORS.lime :
              COLORS.lockedBorder

            const nodeOpacity = treeOccupied ? 0.5 : 1

            return (
              <g
                key={node.id}
                data-node={node.id}
                transform={`translate(${x}, ${y})`}
                style={{ cursor: 'pointer', opacity: nodeOpacity }}
                onClick={(e) => handleNodeClick(e as unknown as React.MouseEvent, node)}
              >
                {/* Glow ring (active only, not tree-occupied) — pulses via CSS */}
                {status === 'active' && !treeOccupied && (
                  <circle
                    r={NODE_R + 8}
                    fill="none"
                    stroke={COLORS.lime}
                    strokeWidth={1.5}
                    className="skill-glow-ring"
                  />
                )}

                {/* Tree-occupied ring — amber, no pulse */}
                {treeOccupied && (
                  <circle
                    r={NODE_R + 6}
                    fill="none"
                    stroke={COLORS.yellow}
                    strokeWidth={1}
                    opacity={0.3}
                  />
                )}

                {/* Selection ring */}
                {isSelected && (
                  <circle
                    r={NODE_R + 10}
                    fill="none"
                    stroke={COLORS.lime}
                    strokeWidth={2}
                    opacity={0.7}
                  />
                )}

                {/* Main circle */}
                <circle
                  r={NODE_R}
                  fill={
                    status === 'unlocked' ? `${COLORS.lime}26` :
                    COLORS.locked
                  }
                  stroke={strokeColor}
                  strokeWidth={status === 'locked' ? 1 : 2}
                  filter={
                    status === 'unlocked' ? 'url(#glow-lime)' :
                    status === 'active' && !treeOccupied ? 'url(#glow-dim)' :
                    undefined
                  }
                  className={status === 'active' && !treeOccupied ? 'skill-node-active' : undefined}
                />

                {/* Level number */}
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  style={{
                    fontFamily:   'DM Mono, monospace',
                    fontSize:     11,
                    fontWeight:   600,
                    fill:         status === 'unlocked' ? COLORS.lime :
                                  status === 'active'   ? COLORS.lime :
                                  COLORS.text3,
                    userSelect:   'none',
                    pointerEvents: 'none',
                  }}
                >
                  {node.progression_level}
                </text>

                {/* Active skill star badge */}
                {isChosen && (
                  <text
                    x={NODE_R - 3}
                    y={-(NODE_R - 3)}
                    textAnchor="middle"
                    dominantBaseline="central"
                    style={{ fontSize: 10, fill: COLORS.yellow, userSelect: 'none', pointerEvents: 'none' }}
                  >★</text>
                )}

                {/* Node label */}
                <NodeLabel name={node.name} status={status} r={NODE_R} />

                {/* Starburst on unlock */}
                {hasBurst && BURST_DIRS.map((dir, di) => (
                  <circle
                    key={`burst-${node.id}-${di}`}
                    cx={0}
                    cy={0}
                    r={3}
                    fill={COLORS.lime}
                    className="starburst-dot"
                    style={{
                      // @ts-expect-error CSS custom properties
                      '--sx': `${dir.sx * 18}px`,
                      '--sy': `${dir.sy * 18}px`,
                      animationDelay: `${di * 20}ms`,
                    }}
                    onAnimationEnd={() => {
                      if (di === BURST_DIRS.length - 1) {
                        setStarbursts(prev => {
                          const next = new Map(prev)
                          next.delete(node.id)
                          return next
                        })
                      }
                    }}
                  />
                ))}
              </g>
            )
          })}

        </g>
      </svg>

      {/* ── Navigation buttons ── */}
      <div
        className="absolute bottom-4 right-4 flex flex-col gap-2"
        style={{ pointerEvents: 'all' }}
      >
        <button
          onClick={centreOnActive}
          style={{
            padding:       '8px 14px',
            borderRadius:  20,
            background:    COLORS.bg3,
            border:        `1px solid ${COLORS.lime}55`,
            fontFamily:    'DM Mono, monospace',
            fontSize:      11,
            color:         COLORS.lime,
            letterSpacing: 1,
            cursor:        'pointer',
            whiteSpace:    'nowrap',
          }}
        >
          ⊙ CENTRE
        </button>
        <button
          onClick={fitAll}
          style={{
            padding:       '8px 14px',
            borderRadius:  20,
            background:    COLORS.bg3,
            border:        `1px solid ${COLORS.line2}`,
            fontFamily:    'DM Mono, monospace',
            fontSize:      11,
            color:         COLORS.text3,
            letterSpacing: 1,
            cursor:        'pointer',
            whiteSpace:    'nowrap',
          }}
        >
          ⊞ FIT ALL
        </button>
      </div>

      {/* ── Hint ── */}
      <div
        className="absolute bottom-4 left-4 pointer-events-none"
        style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: COLORS.text3, lineHeight: 1.6 }}
      >
        Drag · pinch · scroll
        <br />Tap node to inspect
      </div>
    </div>
  )
}

// ─── Node label (SVG foreignObject for text wrapping) ─────────────────────────

const NodeLabel: React.FC<{ name: string; status: NodeStatus; r: number }> = ({ name, status, r }) => {
  const color = status === 'locked' ? COLORS.text3 : COLORS.text2
  const y     = r + 7

  // Split on spaces, max 2 lines
  const words = name.split(' ')
  let line1 = ''
  let line2 = ''
  for (const w of words) {
    const candidate = line1 ? line1 + ' ' + w : w
    if (!line1 || candidate.length <= 13) {
      line1 = candidate
    } else if (!line2 || (line2 + ' ' + w).length <= 13) {
      line2 = line2 ? line2 + ' ' + w : w
    }
  }

  return (
    <>
      <text
        y={y + 4}
        textAnchor="middle"
        style={{
          fontFamily:    'DM Mono, monospace',
          fontSize:      8,
          fill:          color,
          userSelect:    'none',
          pointerEvents: 'none',
        }}
      >
        {line1.length > 14 ? line1.slice(0, 13) + '…' : line1}
      </text>
      {line2 && (
        <text
          y={y + 14}
          textAnchor="middle"
          style={{
            fontFamily:    'DM Mono, monospace',
            fontSize:      8,
            fill:          color,
            userSelect:    'none',
            pointerEvents: 'none',
          }}
        >
          {line2.length > 14 ? line2.slice(0, 13) + '…' : line2}
        </text>
      )}
    </>
  )
}

// ─── List View ────────────────────────────────────────────────────────────────

const CATEGORY_ORDER  = ['prerequisite', 'pulling', 'pushing', 'balance', 'mobility']
const CATEGORY_LABELS: Record<string, string> = {
  prerequisite: 'Prerequisites',
  pulling:      'Pulling Skills',
  pushing:      'Pushing Skills',
  balance:      'Balance',
  mobility:     'Mobility / Legs',
}

const ListView: React.FC<{
  nodes:           SkillNode[]
  getStatus:       (id: string) => NodeStatus
  getSessionCount: (id: string) => number
  activeSkills:    ActiveSkillSelection
  selected:        SkillNode | null
  onSelect:        (n: SkillNode) => void
  filter:          'all' | 'active' | 'unlocked' | 'locked'
  setFilter:       (f: 'all' | 'active' | 'unlocked' | 'locked') => void
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
              flex:          1,
              padding:       '8px 4px',
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
              <span style={{
                fontFamily:    'DM Mono, monospace',
                fontSize:      10,
                color:         COLORS.text3,
                textTransform: 'uppercase',
                letterSpacing: 2,
              }}>
                {CATEGORY_LABELS[category]}
              </span>
              <div style={{ flex: 1, height: 1, background: COLORS.line }}/>
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: COLORS.text3 }}>
                {filtered.length}
              </span>
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
                      padding:    '10px 12px',
                      background: isSelected ? `${COLORS.lime}12` : COLORS.bg2,
                      border:     `1px solid ${isSelected ? COLORS.lime + '50' : COLORS.line}`,
                      opacity:    status === 'locked' ? 0.45 : 1,
                    }}
                  >
                    <StatusDot status={status}/>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily:  'DM Sans, sans-serif',
                        fontSize:    14,
                        color:       COLORS.text,
                        whiteSpace:  'nowrap',
                        overflow:    'hidden',
                        textOverflow:'ellipsis',
                      }}>
                        {node.name}
                        {isActive && (
                          <span style={{ marginLeft: 6, fontSize: 11, color: COLORS.yellow }}>★</span>
                        )}
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
  const color = status !== 'locked' ? COLORS.lime : COLORS.text3
  return (
    <span style={{
      display:    'inline-block',
      width:      size,
      height:     size,
      borderRadius:'50%',
      background: status === 'unlocked' ? COLORS.lime : 'transparent',
      border:     `2px solid ${color}`,
      flexShrink: 0,
      boxShadow:  status !== 'locked' ? `0 0 6px ${COLORS.lime}60` : undefined,
    }}/>
  )
}

// ─── Node Detail Sheet ────────────────────────────────────────────────────────

const NodeDetailSheet: React.FC<{
  node:         SkillNode
  status:       NodeStatus
  sessionCount: number
  nodes:        SkillNode[]
  getStatus:    (id: string) => NodeStatus
  activeSkills: ActiveSkillSelection
  isStalled:    boolean
  onSetActive:  (node: SkillNode) => void
  onClose:      () => void
  origin?:      { x: number; y: number } | null
}> = ({ node, status, sessionCount, nodes, getStatus, activeSkills, isStalled, onSetActive, onClose, origin }) => {
  const tree      = getNodeTree(node)
  const isChosen  = activeSkills[tree] === node.id
  const canSelect = status === 'active' || status === 'unlocked'

  const criteria     = node.unlock_criteria
  const criteriaText = [
    criteria.hold_seconds ? `${criteria.hold_seconds}s hold` : null,
    criteria.reps         ? `${criteria.reps} reps`          : null,
    `${criteria.sets} sets`,
    `${criteria.consecutive_sessions} consecutive sessions`,
  ].filter(Boolean).join(' · ')

  const dayLabel       = node.session_placement.day_types.join(', ')
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
        key={node.id}
        className={`fixed inset-x-0 bottom-0 z-30 rounded-t-2xl flex flex-col sheet-enter`}
        style={{
          background:  COLORS.bg3,
          borderTop:   `1px solid ${COLORS.line2}`,
          // 60% max so the node is always visible above the sheet
          maxHeight:   'min(45dvh, 45vh)',
          // @ts-expect-error CSS custom properties
          '--ox': origin ? `${origin.x}px` : '50%',
          '--oy': origin ? `${origin.y}px` : '100%',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div style={{ width: 36, height: 4, borderRadius: 2, background: COLORS.line2 }}/>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 pt-2 pb-4">
          {/* Title row */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-start gap-3">
              <StatusOrb status={status}/>
              <div>
                <h2 style={{
                  fontFamily:    'Bebas Neue, sans-serif',
                  fontSize:      26,
                  color:         COLORS.text,
                  lineHeight:    1,
                  letterSpacing: 1,
                }}>
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
                  <StatusBadge status={status}/>
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

          <SheetSection label="Unlock Criteria">
            <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, color: COLORS.lime }}>
              {criteriaText}
            </p>
          </SheetSection>

          {node.prerequisites.length > 0 && (
            <SheetSection label="Prerequisite Nodes">
              <div className="space-y-1">
                {node.prerequisites.map(pid => {
                  const pn = nodes.find(n => n.id === pid)
                  const ps = getStatus(pid)
                  return (
                    <div key={pid} className="flex items-center gap-2">
                      <StatusDot status={ps} size={8}/>
                      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: ps === 'locked' ? COLORS.text3 : COLORS.text2 }}>
                        {pn?.name ?? pid}
                      </span>
                      <StatusBadge status={ps} small/>
                    </div>
                  )
                })}
              </div>
            </SheetSection>
          )}

          {node.strength_prerequisites.length > 0 && (
            <SheetSection label="Strength Prerequisites">
              <div className="flex flex-wrap gap-1">
                {node.strength_prerequisites.map((req, i) => (
                  <span
                    key={i}
                    style={{
                      fontFamily:   'DM Mono, monospace',
                      fontSize:     11,
                      color:        COLORS.text2,
                      background:   COLORS.bg2,
                      border:       `1px solid ${COLORS.line2}`,
                      borderRadius: 4,
                      padding:      '3px 7px',
                    }}
                  >
                    {req}
                  </span>
                ))}
              </div>
            </SheetSection>
          )}

          <SheetSection label="Accessory Injections">
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: COLORS.text3, marginBottom: 6 }}>
              These populate your session accessory slot when this skill is active.
            </p>
            <div className="space-y-1">
              {node.skill_specific_accessories.map((acc, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: COLORS.text3, display: 'inline-block', flexShrink: 0 }}/>
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: COLORS.text2 }}>{acc}</span>
                </div>
              ))}
            </div>
          </SheetSection>

          <SheetSection label="Session Placement">
            <div className="flex gap-3">
              <div>
                <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: COLORS.text3, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Days</p>
                <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 14, color: COLORS.text }}>{dayLabel}</p>
              </div>
              <div style={{ width: 1, background: COLORS.line }}/>
              <div>
                <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: COLORS.text3, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Order</p>
                <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 14, color: COLORS.text }}>{placementLabel}</p>
              </div>
            </div>
          </SheetSection>

          {sessionCount > 0 && (
            <SheetSection label="Your Progress">
              <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, color: COLORS.text2 }}>
                {sessionCount} sessions logged at this node
              </p>
            </SheetSection>
          )}

          <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: COLORS.text3, marginBottom: 4, opacity: 0.6 }}>
            Source: {node.source_credit}
          </p>
        </div>

        {/* Sticky CTA — always visible at bottom, never needs scrolling */}
        {canSelect && (
          <div
            className="flex-shrink-0 px-4 pb-4 pt-2"
            style={{
              borderTop:     `1px solid ${COLORS.line}`,
              background:    COLORS.bg3,
              paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
            }}
          >
            <button
              onClick={() => { onSetActive(node) }}
              disabled={isChosen}
              style={{
                width:         '100%',
                padding:       '16px',
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
              {isChosen
                ? `★ ACTIVE — ${TREE_LABELS[tree] ?? 'TREE'}`
                : `SET AS ACTIVE — ${TREE_LABELS[tree] ?? 'SKILL'}`}
            </button>
          </div>
        )}
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
    }}>
      {m.label}
    </span>
  )
}

const StatusOrb: React.FC<{ status: NodeStatus }> = ({ status }) => {
  const size = 40
  if (status === 'unlocked') {
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: COLORS.lime,
        boxShadow:  `0 0 16px ${COLORS.limeGlow}`,
        flexShrink: 0,
        display:    'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'DM Sans, sans-serif', fontSize: 18,
      }}>✓</div>
    )
  }
  if (status === 'active') {
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: COLORS.bg,
        border:     `2px solid ${COLORS.lime}`,
        boxShadow:  `0 0 10px ${COLORS.lime}50`,
        flexShrink: 0,
        display:    'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'DM Sans, sans-serif', fontSize: 18, color: COLORS.lime,
      }}>⚡</div>
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: COLORS.locked,
      border:     `2px solid ${COLORS.lockedBorder}`,
      flexShrink: 0,
      display:    'flex', alignItems: 'center', justifyContent: 'center',
      fontSize:   16,
    }}>🔒</div>
  )
}

export default SkillTree
