import React, { useState, useRef, useCallback, useMemo } from 'react'
import { useSessions } from '../../hooks/useSessions'
import type { Session, LiftLogEntry, SkillLogEntry } from '../../types/session'

// ─── Constants ───────────────────────────────────────────────────────────────

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_ABBR    = ['Su','Mo','Tu','We','Th','Fr','Sa']

/** Day-type dot colors — note: swapped from original to match spec (A=blue, B=lime, C=yellow) */
const DAY_COLOR: Record<string, string> = {
  A: '#50c8f0',
  B: '#c8f050',
  C: '#f0c828',
  Z: '#6b6b60',
}

const PHASE_LABEL: Record<string, string> = {
  accumulation:    'ACCUM',
  deload:          'DELOAD',
  intensification: 'INTENS',
  realization:     'REAL',
}

const FEEL_EMOJI: Record<string, string> = {
  neutral: '😐',
  good:    '🙂',
  strong:  '💪',
}

const ACCENT = {
  lime:   '#c8f050',
  blue:   '#50c8f0',
  yellow: '#f0c828',
  red:    '#f05050',
  dim:    '#4a4a42',
  text3:  '#6b6b60',
  line:   '#1e1e18',
  bg2:    '#0f0f0c',
  bg3:    '#141410',
}

type ZoomWindow = '1M' | '3M' | '6M' | 'ALL'
type GraphTab   = 'STRENGTH' | 'SKILLS' | 'ACTIVITY' | 'CARDIO'

// ─── Epley 1RM ───────────────────────────────────────────────────────────────

function epley(weight: number, reps: number): number {
  if (reps === 1) return weight
  return Math.round(weight * (1 + reps / 30))
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function pad(n: number) { return String(n).padStart(2, '0') }
function toISO(y: number, m: number, d: number) { return `${y}-${pad(m+1)}-${pad(d)}` }

function subtractMonths(date: Date, months: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() - months)
  return d
}

function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getDay()
  const monday = new Date(d)
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return monday.toISOString().split('T')[0]
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr)
  return `${MONTH_NAMES[d.getMonth()].slice(0,3)} ${d.getDate()}`
}

// ─── SVG Chart Primitives ─────────────────────────────────────────────────────

interface Point { x: number; y: number; label: string; value: number; date: string }

interface TooltipState { x: number; y: number; label: string; value: string; date: string }

function buildPolyline(points: Point[], svgW: number, svgH: number, padX: number, padY: number): string {
  if (points.length === 0) return ''
  return points.map(p => `${p.x},${p.y}`).join(' ')
}

interface SVGLineChartProps {
  series: { id: string; label: string; color: string; points: Point[] }[]
  svgH?: number
  padX?: number
  padY?: number
  yUnit?: string
  formatY?: (v: number) => string
}

const SVGLineChart: React.FC<SVGLineChartProps> = ({
  series, svgH = 180, padX = 40, padY = 20, yUnit = '', formatY = (v) => String(Math.round(v))
}) => {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [svgW, setSvgW] = useState(600)

  const measuredRef = useCallback((el: SVGSVGElement | null) => {
    if (!el) return
    const obs = new ResizeObserver(entries => {
      setSvgW(entries[0].contentRect.width || 600)
    })
    obs.observe(el)
    ;(el as any).__obs = obs
  }, [])

  const allPoints = series.flatMap(s => s.points)
  if (allPoints.length === 0) return (
    <div className="flex items-center justify-center h-40 font-mono text-xs" style={{ color: ACCENT.text3 }}>
      No data yet — start training to see your progress here
    </div>
  )

  const allX = allPoints.map(p => p.x)
  const allY = allPoints.map(p => p.y)
  const minX = Math.min(...allX), maxX = Math.max(...allX)
  const minY = Math.min(...allY) * 0.9, maxY = Math.max(...allY) * 1.1

  const chartW = svgW - padX * 2
  const chartH = svgH - padY * 2

  function scaleX(v: number) { return maxX === minX ? padX + chartW / 2 : padX + ((v - minX) / (maxX - minX)) * chartW }
  function scaleY(v: number) { return maxY === minY ? padY + chartH / 2 : svgH - padY - ((v - minY) / (maxY - minY)) * chartH }

  // Y axis ticks
  const yTicks = 4
  const yTickVals = Array.from({ length: yTicks + 1 }, (_, i) => minY + ((maxY - minY) * i) / yTicks)

  // X axis ticks — up to 5
  const xDomain = allPoints.map(p => p.date).filter((v, i, a) => a.indexOf(v) === i).sort()
  const xTickStep = Math.max(1, Math.floor(xDomain.length / 5))
  const xTicks = xDomain.filter((_, i) => i % xTickStep === 0 || i === xDomain.length - 1)

  // Scaled series
  const scaledSeries = series.map(s => ({
    ...s,
    scaled: s.points.map(p => ({ ...p, sx: scaleX(p.x), sy: scaleY(p.y) }))
  }))

  return (
    <div style={{ position: 'relative' }}>
      <svg
        ref={(el) => { (svgRef as any).current = el; measuredRef(el) }}
        width="100%"
        height={svgH}
        style={{ display: 'block', overflow: 'visible' }}
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Grid lines */}
        {yTickVals.map((v, i) => (
          <line key={i}
            x1={padX} y1={scaleY(v)} x2={svgW - padX} y2={scaleY(v)}
            stroke={ACCENT.line} strokeWidth={1}
          />
        ))}

        {/* Y axis labels */}
        {yTickVals.map((v, i) => (
          <text key={i}
            x={padX - 6} y={scaleY(v) + 4}
            textAnchor="end"
            fontSize={10} fontFamily="DM Mono, monospace"
            fill={ACCENT.text3}
          >
            {formatY(v)}
          </text>
        ))}

        {/* X axis labels */}
        {xTicks.map((d, i) => {
          const xPos = scaleX(new Date(d).getTime())
          return (
            <text key={i}
              x={xPos} y={svgH - 4}
              textAnchor="middle"
              fontSize={9} fontFamily="DM Mono, monospace"
              fill={ACCENT.text3}
            >
              {formatDateShort(d)}
            </text>
          )
        })}

        {/* Lines */}
        {scaledSeries.map(s => (
          s.scaled.length > 1 && (
            <polyline key={s.id}
              points={s.scaled.map(p => `${p.sx},${p.sy}`).join(' ')}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity={0.85}
            />
          )
        ))}

        {/* Dots */}
        {scaledSeries.map(s =>
          s.scaled.map((p, pi) => (
            <circle key={`${s.id}-${pi}`}
              cx={p.sx} cy={p.sy} r={4}
              fill={s.color}
              stroke={ACCENT.bg2}
              strokeWidth={1.5}
              style={{ cursor: 'pointer' }}
              onMouseEnter={(e) => {
                setTooltip({
                  x: p.sx,
                  y: p.sy,
                  label: s.label,
                  value: formatY(p.value) + yUnit,
                  date: formatDateShort(p.date)
                })
              }}
            />
          ))
        )}

        {/* Tooltip */}
        {tooltip && (() => {
          const tx = Math.min(tooltip.x + 8, svgW - 90)
          const ty = Math.max(tooltip.y - 36, padY)
          return (
            <g>
              <rect x={tx} y={ty} width={88} height={32} rx={3}
                fill={ACCENT.bg3} stroke={ACCENT.line} strokeWidth={1}
              />
              <text x={tx + 6} y={ty + 12} fontSize={9} fontFamily="DM Mono, monospace" fill={ACCENT.text3}>
                {tooltip.date}
              </text>
              <text x={tx + 6} y={ty + 25} fontSize={11} fontFamily="DM Mono, monospace" fill={tooltip.label === '' ? '#fff' : ACCENT.lime}>
                {tooltip.value}
              </text>
            </g>
          )
        })()}
      </svg>
    </div>
  )
}

// ─── SVG Bar Chart ─────────────────────────────────────────────────────────────

interface BarDatum { weekKey: string; label: string; count: number; color: string }

const SVGBarChart: React.FC<{ bars: BarDatum[]; svgH?: number }> = ({ bars, svgH = 160 }) => {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string; count: number } | null>(null)
  const [svgW, setSvgW] = useState(600)
  const padX = 32, padY = 16, padBottom = 28

  const measuredRef = useCallback((el: SVGSVGElement | null) => {
    if (!el) return
    const obs = new ResizeObserver(entries => setSvgW(entries[0].contentRect.width || 600))
    obs.observe(el)
  }, [])

  if (bars.length === 0) return (
    <div className="flex items-center justify-center h-40 font-mono text-xs" style={{ color: ACCENT.text3 }}>
      No data yet — start training to see your progress here
    </div>
  )

  const maxCount = Math.max(...bars.map(b => b.count), 1)
  const chartW = svgW - padX * 2
  const chartH = svgH - padY - padBottom
  const barW = Math.max(4, (chartW / bars.length) * 0.6)
  const gap  = chartW / bars.length

  const yTicks = [0, Math.ceil(maxCount / 2), maxCount]

  return (
    <div style={{ position: 'relative' }}>
      <svg width="100%" height={svgH} style={{ display: 'block', overflow: 'visible' }}
        ref={measuredRef}
        onMouseLeave={() => setTooltip(null)}
      >
        {yTicks.map((v, i) => {
          const y = svgH - padBottom - (v / maxCount) * chartH
          return (
            <g key={i}>
              <line x1={padX} y1={y} x2={svgW - padX} y2={y} stroke={ACCENT.line} strokeWidth={1} />
              <text x={padX - 4} y={y + 4} textAnchor="end" fontSize={9} fontFamily="DM Mono, monospace" fill={ACCENT.text3}>{v}</text>
            </g>
          )
        })}

        {bars.map((b, i) => {
          const barH = Math.max(2, (b.count / maxCount) * chartH)
          const bx = padX + i * gap + gap / 2 - barW / 2
          const by = svgH - padBottom - barH
          return (
            <g key={b.weekKey}>
              <rect
                x={bx} y={by} width={barW} height={barH}
                fill={b.color} rx={2} opacity={0.85}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setTooltip({ x: bx + barW / 2, y: by, label: b.label, count: b.count })}
              />
            </g>
          )
        })}

        {/* X axis labels — only every 4th */}
        {bars.map((b, i) => {
          if (i % Math.max(1, Math.floor(bars.length / 6)) !== 0) return null
          const bx = padX + i * gap + gap / 2
          return (
            <text key={b.weekKey} x={bx} y={svgH - 4} textAnchor="middle"
              fontSize={8} fontFamily="DM Mono, monospace" fill={ACCENT.text3}
            >
              {b.label}
            </text>
          )
        })}

        {tooltip && (() => {
          const tx = Math.min(tooltip.x + 6, svgW - 90)
          const ty = Math.max(tooltip.y - 36, padY)
          return (
            <g>
              <rect x={tx} y={ty} width={80} height={30} rx={3} fill={ACCENT.bg3} stroke={ACCENT.line} strokeWidth={1} />
              <text x={tx + 6} y={ty + 12} fontSize={9} fontFamily="DM Mono, monospace" fill={ACCENT.text3}>{tooltip.label}</text>
              <text x={tx + 6} y={ty + 24} fontSize={11} fontFamily="DM Mono, monospace" fill={ACCENT.lime}>{tooltip.count} sessions</text>
            </g>
          )
        })()}
      </svg>
    </div>
  )
}

// ─── Session Detail Card ───────────────────────────────────────────────────────

const SessionDetailCard: React.FC<{ session: Session; onClose: () => void }> = ({ session, onClose }) => {
  const dayColor = DAY_COLOR[session.dayType] ?? '#9e9b8e'

  // Top set per lift
  const topSets = session.liftEntries.map((l: LiftLogEntry) => {
    const completedSets = l.sets.filter(s => s.completed === true)
    const setsToUse = completedSets.length > 0 ? completedSets : l.sets
    if (setsToUse.length === 0) return null
    const best = setsToUse.reduce((a, b) => epley(a.weight_kg, a.reps) >= epley(b.weight_kg, b.reps) ? a : b)
    return { name: l.liftName, weight: best.weight_kg, reps: best.reps, e1rm: epley(best.weight_kg, best.reps) }
  }).filter(Boolean)

  // Best hold/rep per skill
  const bestSkills = session.skillEntries.map((sl: SkillLogEntry) => {
    const completedSets = sl.sets.filter(s => s.completed === true)
    const setsToUse = completedSets.length > 0 ? completedSets : sl.sets
    if (setsToUse.length === 0) return null
    if (setsToUse[0].hold_seconds !== undefined) {
      const best = Math.max(...setsToUse.map(s => s.hold_seconds!))
      return { nodeId: sl.nodeId, value: `${best}s hold`, type: 'hold' }
    }
    if (setsToUse[0].reps !== undefined) {
      const best = Math.max(...setsToUse.map(s => s.reps!))
      return { nodeId: sl.nodeId, value: `${best} reps`, type: 'reps' }
    }
    return null
  }).filter(Boolean)

  return (
    <div style={{ background: ACCENT.bg2, border: `1px solid ${ACCENT.line}`, borderRadius: 6, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${ACCENT.line}`, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          background: dayColor + '22', color: dayColor, border: `1px solid ${dayColor}44`,
          borderRadius: 3, padding: '2px 8px', fontFamily: 'DM Mono, monospace', fontSize: 11, fontWeight: 600, letterSpacing: 2
        }}>
          DAY {session.dayType}
        </span>
        <span style={{
          background: '#1a1a14', color: ACCENT.text3, border: `1px solid ${ACCENT.line}`,
          borderRadius: 3, padding: '2px 7px', fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: 1
        }}>
          {PHASE_LABEL[session.phase] ?? session.phase.toUpperCase()}
        </span>
        {session.feel && (
          <span style={{ fontSize: 16, marginLeft: 2 }}>{FEEL_EMOJI[session.feel]}</span>
        )}
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 14 }}>
          {session.durationActualMinutes && (
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: ACCENT.text3 }}>
              ⏱ {session.durationActualMinutes}min
            </span>
          )}
          {session.peakBPM && (
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#f05050' }}>
              ♥ {session.peakBPM}bpm
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: ACCENT.text3, background: 'none', border: 'none', cursor: 'pointer', marginLeft: 8 }}
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Lifts */}
        {topSets.length > 0 && (
          <div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: ACCENT.text3, letterSpacing: 2, marginBottom: 6, textTransform: 'uppercase' }}>Lifts</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {topSets.map((t: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#d4d4c8', flex: 1 }}>{t.name}</span>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#d4d4c8' }}>{t.weight}kg × {t.reps}</span>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: ACCENT.text3 }}>~{t.e1rm}kg</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skills */}
        {bestSkills.length > 0 && (
          <div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: ACCENT.text3, letterSpacing: 2, marginBottom: 6, textTransform: 'uppercase' }}>Skills</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {bestSkills.map((s: any, i: number) => (
                <span key={i} style={{
                  background: '#1a1a14', border: `1px solid ${ACCENT.line}`,
                  borderRadius: 3, padding: '3px 8px',
                  fontFamily: 'DM Mono, monospace', fontSize: 10, color: ACCENT.yellow
                }}>
                  {s.nodeId.replace(/-/g, ' ')} · {s.value}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Note */}
        {session.notes && (
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: ACCENT.text3, fontStyle: 'italic', borderTop: `1px solid ${ACCENT.line}`, paddingTop: 8 }}>
            "{session.notes}"
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Graph Panel ───────────────────────────────────────────────────────────────

interface BenchmarkResult {
  date: string
  vo2max_estimate?: number
}

// Minimal hook stub — will gracefully degrade if not present
function useBenchmarks(): { benchmarks: BenchmarkResult[] } {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('../../hooks/useBenchmarks')
    if (typeof mod.useBenchmarks === 'function') return mod.useBenchmarks()
  } catch (_) {}
  return { benchmarks: [] }
}

const GraphPanel: React.FC<{ sessions: Session[] }> = ({ sessions }) => {
  const [activeTab, setActiveTab] = useState<GraphTab>('STRENGTH')
  const [zoom, setZoom] = useState<ZoomWindow>('3M')
  const { benchmarks } = useBenchmarks()

  // Filter sessions by zoom window
  const filteredSessions = useMemo(() => {
    const now = new Date()
    let from: Date | null = null
    if (zoom === '1M') from = subtractMonths(now, 1)
    else if (zoom === '3M') from = subtractMonths(now, 3)
    else if (zoom === '6M') from = subtractMonths(now, 6)
    if (!from) return sessions
    const fromStr = from.toISOString().split('T')[0]
    return sessions.filter(s => s.date >= fromStr)
  }, [sessions, zoom])

  // ── Strength tab ─────────────────────────────────────────────────────────
  const allLifts = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of filteredSessions) {
      for (const l of s.liftEntries) map.set(l.liftId, l.liftName)
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [filteredSessions])

  const [visibleLifts, setVisibleLifts] = useState<Set<string>>(new Set())

  // Auto-select first 3 lifts when they change
  const prevLiftIds = useRef<string>('')
  const liftIdKey = allLifts.map(l => l.id).join(',')
  if (prevLiftIds.current !== liftIdKey) {
    prevLiftIds.current = liftIdKey
    if (visibleLifts.size === 0 && allLifts.length > 0) {
      setVisibleLifts(new Set(allLifts.slice(0, 3).map(l => l.id)))
    }
  }

  const LIFT_COLORS = ['#c8f050','#50c8f0','#f0c828','#f05050','#c850f0','#50f0c8']

  const strengthSeries = useMemo(() => allLifts
    .filter(l => visibleLifts.has(l.id))
    .map((l, idx) => {
      const points: Point[] = []
      for (const s of filteredSessions) {
        const entry = s.liftEntries.find(le => le.liftId === l.id)
        if (!entry) continue
        const completedSets = entry.sets.filter(st => st.completed === true)
        const setsToUse = completedSets.length > 0 ? completedSets : entry.sets
        if (setsToUse.length === 0) continue
        const best = setsToUse.reduce((a, b) => epley(a.weight_kg, a.reps) >= epley(b.weight_kg, b.reps) ? a : b)
        const e1rm = epley(best.weight_kg, best.reps)
        points.push({ x: new Date(s.date).getTime(), y: e1rm, label: l.name, value: e1rm, date: s.date })
      }
      return { id: l.id, label: l.name, color: LIFT_COLORS[idx % LIFT_COLORS.length], points }
    }), [allLifts, visibleLifts, filteredSessions])

  // ── Skills tab ────────────────────────────────────────────────────────────
  const allSkills = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of filteredSessions) {
      for (const sl of s.skillEntries) map.set(sl.nodeId, sl.nodeId.replace(/-/g, ' '))
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [filteredSessions])

  const [visibleSkills, setVisibleSkills] = useState<Set<string>>(new Set())
  const prevSkillIds = useRef<string>('')
  const skillIdKey = allSkills.map(l => l.id).join(',')
  if (prevSkillIds.current !== skillIdKey) {
    prevSkillIds.current = skillIdKey
    if (visibleSkills.size === 0 && allSkills.length > 0) {
      setVisibleSkills(new Set(allSkills.slice(0, 3).map(s => s.id)))
    }
  }

  const SKILL_COLORS = ['#f0c828','#c8f050','#50c8f0','#f05050','#c850f0']

  const skillSeries = useMemo(() => allSkills
    .filter(s => visibleSkills.has(s.id))
    .map((sk, idx) => {
      const points: Point[] = []
      for (const s of filteredSessions) {
        const entry = s.skillEntries.find(se => se.nodeId === sk.id)
        if (!entry) continue
        const completedSets = entry.sets.filter(st => st.completed === true)
        const setsToUse = completedSets.length > 0 ? completedSets : entry.sets
        if (setsToUse.length === 0) continue
        const isHold = setsToUse[0].hold_seconds !== undefined
        const bestVal = isHold
          ? Math.max(...setsToUse.map(st => st.hold_seconds ?? 0))
          : Math.max(...setsToUse.map(st => st.reps ?? 0))
        points.push({ x: new Date(s.date).getTime(), y: bestVal, label: sk.name, value: bestVal, date: s.date })
      }
      return { id: sk.id, label: sk.name, color: SKILL_COLORS[idx % SKILL_COLORS.length], points }
    }), [allSkills, visibleSkills, filteredSessions])

  // ── Activity tab ──────────────────────────────────────────────────────────
  const activityBars = useMemo((): BarDatum[] => {
    const weekMap = new Map<string, { count: number; green: number; yellow: number; red: number }>()
    for (const s of filteredSessions) {
      const wk = getWeekKey(s.date)
      const prev = weekMap.get(wk) ?? { count: 0, green: 0, yellow: 0, red: 0 }
      prev.count++
      if (s.readiness === 'green') prev.green++
      else if (s.readiness === 'yellow') prev.yellow++
      else if (s.readiness === 'red') prev.red++
      weekMap.set(wk, prev)
    }
    return Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([wk, data]) => {
        // Color by majority readiness
        const color = data.green >= data.yellow && data.green >= data.red
          ? '#c8f050' : data.yellow >= data.red ? '#f0c828' : '#f05050'
        const d = new Date(wk)
        const label = `${MONTH_NAMES[d.getMonth()].slice(0,3)} ${d.getDate()}`
        return { weekKey: wk, label, count: data.count, color }
      })
  }, [filteredSessions])

  // ── Cardio tab ────────────────────────────────────────────────────────────
  const cardioPoints = useMemo((): Point[] => {
    return filteredSessions
      .filter(s => s.peakBPM != null)
      .map(s => ({ x: new Date(s.date).getTime(), y: s.peakBPM!, label: 'Peak BPM', value: s.peakBPM!, date: s.date }))
      .sort((a, b) => a.x - b.x)
  }, [filteredSessions])

  const vo2Points = useMemo((): Point[] => {
    return (benchmarks as BenchmarkResult[])
      .filter(b => b.vo2max_estimate != null)
      .map(b => ({ x: new Date(b.date).getTime(), y: b.vo2max_estimate!, label: 'VO₂max', value: b.vo2max_estimate!, date: b.date }))
      .sort((a, b) => a.x - b.x)
  }, [benchmarks])

  const cardioSeries = useMemo(() => {
    const s = []
    if (cardioPoints.length > 0) s.push({ id: 'bpm', label: 'Peak BPM', color: '#f05050', points: cardioPoints })
    if (vo2Points.length > 0)    s.push({ id: 'vo2', label: 'VO₂max',   color: '#50c8f0', points: vo2Points })
    return s
  }, [cardioPoints, vo2Points])

  const TABS: GraphTab[] = ['STRENGTH', 'SKILLS', 'ACTIVITY', 'CARDIO']

  return (
    <div style={{ background: ACCENT.bg2, border: `1px solid ${ACCENT.line}`, borderRadius: 6, overflow: 'hidden' }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${ACCENT.line}` }}>
        {TABS.map(tab => (
          <button key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1, padding: '10px 4px',
              fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: 2,
              textTransform: 'uppercase', cursor: 'pointer', border: 'none',
              background: activeTab === tab ? '#141410' : 'transparent',
              color: activeTab === tab ? ACCENT.lime : ACCENT.text3,
              borderBottom: activeTab === tab ? `2px solid ${ACCENT.lime}` : '2px solid transparent',
              transition: 'all 0.15s'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Zoom controls */}
      <div style={{ display: 'flex', gap: 6, padding: '8px 14px', borderBottom: `1px solid ${ACCENT.line}`, alignItems: 'center' }}>
        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: ACCENT.text3, letterSpacing: 2, marginRight: 4 }}>RANGE</span>
        {(['1M','3M','6M','ALL'] as ZoomWindow[]).map(z => (
          <button key={z}
            onClick={() => setZoom(z)}
            style={{
              fontFamily: 'DM Mono, monospace', fontSize: 10, padding: '3px 10px',
              background: zoom === z ? ACCENT.lime + '22' : 'transparent',
              color: zoom === z ? ACCENT.lime : ACCENT.text3,
              border: `1px solid ${zoom === z ? ACCENT.lime + '66' : ACCENT.line}`,
              borderRadius: 3, cursor: 'pointer'
            }}
          >
            {z}
          </button>
        ))}
      </div>

      {/* Chart area */}
      <div style={{ padding: '14px 14px 8px' }}>
        {activeTab === 'STRENGTH' && (
          <>
            <SVGLineChart series={strengthSeries} yUnit="kg" formatY={v => `${Math.round(v)}`} />
            {allLifts.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {allLifts.map((l, idx) => (
                  <label key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                    <input type="checkbox"
                      checked={visibleLifts.has(l.id)}
                      onChange={e => {
                        const next = new Set(visibleLifts)
                        if (e.target.checked) next.add(l.id); else next.delete(l.id)
                        setVisibleLifts(next)
                      }}
                      style={{ accentColor: LIFT_COLORS[idx % LIFT_COLORS.length] }}
                    />
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: LIFT_COLORS[idx % LIFT_COLORS.length] }}>
                      {l.name}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'SKILLS' && (
          <>
            <SVGLineChart series={skillSeries} yUnit="" formatY={v => `${Math.round(v)}`} svgH={180} />
            {allSkills.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {allSkills.map((sk, idx) => (
                  <label key={sk.id} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                    <input type="checkbox"
                      checked={visibleSkills.has(sk.id)}
                      onChange={e => {
                        const next = new Set(visibleSkills)
                        if (e.target.checked) next.add(sk.id); else next.delete(sk.id)
                        setVisibleSkills(next)
                      }}
                      style={{ accentColor: SKILL_COLORS[idx % SKILL_COLORS.length] }}
                    />
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: SKILL_COLORS[idx % SKILL_COLORS.length] }}>
                      {sk.name}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'ACTIVITY' && (
          <>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: ACCENT.text3, letterSpacing: 2, marginBottom: 8, textTransform: 'uppercase' }}>
              Sessions per week
            </div>
            <SVGBarChart bars={activityBars} svgH={160} />
            <div style={{ display: 'flex', gap: 14, marginTop: 10, flexWrap: 'wrap' }}>
              {[['#c8f050','Green readiness'],['#f0c828','Yellow readiness'],['#f05050','Red readiness']].map(([color, label]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: 'inline-block' }} />
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: ACCENT.text3 }}>{label}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'CARDIO' && (
          <>
            <SVGLineChart
              series={cardioSeries}
              svgH={180}
              yUnit=""
              formatY={v => `${Math.round(v)}`}
            />
            {cardioSeries.length > 0 && (
              <div style={{ display: 'flex', gap: 14, marginTop: 10 }}>
                {cardioSeries.map(s => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 20, height: 2, background: s.color, display: 'inline-block', borderRadius: 1 }} />
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: ACCENT.text3 }}>{s.label}</span>
                  </div>
                ))}
              </div>
            )}
            {cardioSeries.length === 0 && (
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: ACCENT.text3, textAlign: 'center', padding: '24px 0' }}>
                No cardio data yet — log peak BPM in your sessions to see trends here
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Main Calendar Component ───────────────────────────────────────────────────

export const Calendar: React.FC = () => {
  const { sessions } = useSessions()
  const now = new Date()

  const [viewYear,  setViewYear]  = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)

  // Build date → sessions map
  const sessionsByDate = useMemo(() => {
    const map = new Map<string, Session[]>()
    for (const s of sessions) {
      const arr = map.get(s.date) ?? []
      arr.push(s)
      map.set(s.date, arr)
    }
    return map
  }, [sessions])

  // Calendar grid
  const firstDay  = new Date(viewYear, viewMonth, 1)
  const lastDay   = new Date(viewYear, viewMonth + 1, 0)
  const startOffset = firstDay.getDay()

  const days: (null | number)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: lastDay.getDate() }, (_, i) => i + 1),
  ]

  const dateStr = (d: number) => `${viewYear}-${pad(viewMonth + 1)}-${pad(d)}`

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  const thisMonthSessions = useMemo(() =>
    sessions.filter(s => {
      const d = new Date(s.date)
      return d.getFullYear() === viewYear && d.getMonth() === viewMonth
    }),
    [sessions, viewYear, viewMonth]
  )

  const strongCount   = thisMonthSessions.filter(s => s.feel === 'strong').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Title */}
      <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 36, letterSpacing: 4, color: '#e8e8dc', lineHeight: 1, margin: 0 }}>
        CALENDAR
      </h1>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', background: ACCENT.bg2, border: `1px solid ${ACCENT.line}`, borderRadius: 6, overflow: 'hidden' }}>
        {[
          { value: thisMonthSessions.length, label: 'This Month', color: '#e8e8dc' },
          { value: strongCount, label: '💪 Strong', color: ACCENT.lime },
          { value: sessions.length, label: 'All Time', color: ACCENT.text3 },
        ].map((stat, i) => (
          <div key={i} style={{
            padding: '14px 16px',
            borderRight: i < 2 ? `1px solid ${ACCENT.line}` : 'none',
            display: 'flex', flexDirection: 'column', gap: 2
          }}>
            <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 28, color: stat.color, lineHeight: 1 }}>
              {stat.value}
            </span>
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: ACCENT.text3, letterSpacing: 2, textTransform: 'uppercase' }}>
              {stat.label}
            </span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ background: ACCENT.bg2, border: `1px solid ${ACCENT.line}`, borderRadius: 6, overflow: 'hidden' }}>
        {/* Month nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: `1px solid ${ACCENT.line}` }}>
          <button onClick={prevMonth} style={{ background: 'none', border: 'none', color: ACCENT.text3, cursor: 'pointer', fontSize: 18, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, transition: 'color 0.15s' }}>‹</button>
          <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 20, letterSpacing: 4, color: '#e8e8dc' }}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <button onClick={nextMonth} style={{ background: 'none', border: 'none', color: ACCENT.text3, cursor: 'pointer', fontSize: 18, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, transition: 'color 0.15s' }}>›</button>
        </div>

        {/* Day-of-week headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: `1px solid ${ACCENT.line}` }}>
          {DAY_ABBR.map(d => (
            <div key={d} style={{ textAlign: 'center', padding: '7px 0', fontFamily: 'DM Mono, monospace', fontSize: 9, color: ACCENT.text3, letterSpacing: 1 }}>
              {d}
            </div>
          ))}
        </div>

        {/* Days */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {days.map((day, i) => {
            if (day === null) {
              return <div key={`e-${i}`} style={{ aspectRatio: '1', borderRight: `1px solid ${ACCENT.line}`, borderBottom: `1px solid ${ACCENT.line}` }} />
            }
            const ds = dateStr(day)
            const daySessions = sessionsByDate.get(ds) ?? []
            const isToday = day === now.getDate() && viewMonth === now.getMonth() && viewYear === now.getFullYear()
            const isSelected = selectedSession?.date === ds

            return (
              <div
                key={ds}
                onClick={() => {
                  if (daySessions.length === 0) return
                  if (selectedSession?.date === ds) { setSelectedSession(null); return }
                  setSelectedSession(daySessions[0])
                }}
                style={{
                  aspectRatio: '1',
                  borderRight: `1px solid ${ACCENT.line}`,
                  borderBottom: `1px solid ${ACCENT.line}`,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'space-between',
                  padding: '4px 2px',
                  cursor: daySessions.length > 0 ? 'pointer' : 'default',
                  background: isSelected ? '#1a1a14' : 'transparent',
                  transition: 'background 0.1s'
                }}
              >
                <span style={{
                  fontFamily: 'DM Mono, monospace',
                  fontSize: 11,
                  width: 20, height: 20,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '50%',
                  background: isToday ? ACCENT.lime : 'transparent',
                  color: isToday ? '#0a0a08' : daySessions.length > 0 ? '#d4d4c8' : ACCENT.text3,
                  fontWeight: isToday ? 700 : 400,
                }}>
                  {day}
                </span>
                {/* Session dots */}
                {daySessions.length > 0 && (
                  <div style={{ display: 'flex', gap: 2, paddingBottom: 2 }}>
                    {daySessions.map(s => (
                      <span key={s.id} style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: DAY_COLOR[s.dayType] ?? '#6b6b60'
                      }} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Inline session detail */}
      {selectedSession && (
        <div style={{ animation: 'fadeUp 0.15s ease-out' }}>
          <SessionDetailCard session={selectedSession} onClose={() => setSelectedSession(null)} />
        </div>
      )}

      {/* Dot legend */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {Object.entries(DAY_COLOR).map(([type, color]) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block' }} />
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: ACCENT.text3, letterSpacing: 1 }}>
              DAY {type}
            </span>
          </div>
        ))}
      </div>

      {/* Graph panel */}
      <GraphPanel sessions={sessions} />

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

export default Calendar
