import React, { useState } from 'react'
import { useSkillTree } from '../../hooks/useSkillTree'
import { SkillNodeBadge } from '../../components/SkillNodeBadge'
import { Tag } from '../../components/Tag'
import type { SkillNode, NodeStatus } from '../../types/skill'

const CATEGORY_LABELS: Record<string, string> = {
  prerequisite: 'Prerequisites',
  pulling:      'Pulling Skills',
  pushing:      'Pushing Skills',
  balance:      'Balance',
  mobility:     'Mobility / Legs',
}

const CATEGORY_ORDER = ['prerequisite', 'pulling', 'pushing', 'balance', 'mobility']

const LEVEL_LABELS = ['', 'Beginner', 'Novice', 'Intermediate', 'Advanced', 'Elite']

export const SkillTree: React.FC = () => {
  const { nodes, byCategory, getStatus, getSessionCount, stalledNodes, validation } = useSkillTree()
  const [selectedNode, setSelectedNode] = useState<SkillNode | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'unlocked' | 'locked'>('all')

  const activeCount = nodes.filter(n => getStatus(n.id) === 'active').length
  const unlockedCount = nodes.filter(n => getStatus(n.id) === 'unlocked').length

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="font-heading text-display-md text-text leading-none">SKILL TREE</h1>
        <div className="flex gap-3 mt-2">
          <span className="font-mono text-mono-xs text-text-3">
            <span className="text-lime">{activeCount}</span> active
          </span>
          <span className="font-mono text-mono-xs text-text-3">
            <span className="text-text-2">{unlockedCount}</span> unlocked
          </span>
          <span className="font-mono text-mono-xs text-text-3">
            <span className="text-text-3">{nodes.length - activeCount - unlockedCount}</span> locked
          </span>
        </div>
      </div>

      {/* Stall warnings */}
      {stalledNodes.length > 0 && (
        <div className="bg-yellow bg-opacity-5 border border-yellow border-opacity-30 rounded p-3">
          <p className="font-mono uppercase tracking-widest text-mono-xs text-yellow mb-2">
            ⚠ Stall Detected
          </p>
          {stalledNodes.map(n => (
            <div key={n.id} className="flex items-center justify-between py-1">
              <span className="font-body text-sm text-text-2">{n.name}</span>
              <span className="font-mono text-mono-xs text-text-3">
                {getSessionCount(n.id)} sessions
              </span>
            </div>
          ))}
          <p className="font-body text-xs text-text-3 mt-2">
            Try dropping one level and adding a set. Focus on quality holds.
          </p>
        </div>
      )}

      {/* Validation errors (dev only) */}
      {!validation.valid && (
        <div className="bg-accent-3 bg-opacity-5 border border-accent-3 border-opacity-30 rounded p-3">
          <p className="font-mono text-mono-xs text-accent-3 mb-1">Graph errors:</p>
          {validation.errors.map((e, i) => (
            <p key={i} className="font-mono text-mono-xs text-text-2">{e}</p>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 bg-bg-2 border border-line rounded p-1">
        {(['all', 'active', 'unlocked', 'locked'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={[
              'flex-1 py-1.5 font-mono uppercase tracking-widest text-mono-xs rounded-sm transition-colors',
              filter === f
                ? 'bg-accent-dim text-lime'
                : 'text-text-3 hover:text-text-2',
            ].join(' ')}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Node list by category */}
      {CATEGORY_ORDER.map(category => {
        const categoryNodes = byCategory.get(category) ?? []
        const filtered = categoryNodes.filter(n => {
          const s = getStatus(n.id)
          if (filter === 'all') return true
          return s === filter
        })
        if (filtered.length === 0) return null

        return (
          <section key={category}>
            <div className="flex items-center gap-3 mb-3">
              <span className="font-mono uppercase tracking-widest text-mono-xs text-text-3">
                {CATEGORY_LABELS[category] ?? category}
              </span>
              <span className="flex-1 h-px bg-line" />
              <span className="font-mono text-mono-xs text-text-3">{filtered.length}</span>
            </div>

            <div className="space-y-1">
              {filtered
                .sort((a, b) => a.progression_level - b.progression_level)
                .map(node => (
                  <SkillNodeRow
                    key={node.id}
                    node={node}
                    status={getStatus(node.id)}
                    sessionCount={getSessionCount(node.id)}
                    isSelected={selectedNode?.id === node.id}
                    isStalled={stalledNodes.some(s => s.id === node.id)}
                    onClick={() =>
                      setSelectedNode(prev => prev?.id === node.id ? null : node)
                    }
                  />
                ))}
            </div>
          </section>
        )
      })}

      {/* Detail panel */}
      {selectedNode && (
        <NodeDetailPanel
          node={selectedNode}
          status={getStatus(selectedNode.id)}
          sessionCount={getSessionCount(selectedNode.id)}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  )
}

// ── Node row ──────────────────────────────────────────────────────────────────

interface RowProps {
  node: SkillNode
  status: NodeStatus
  sessionCount: number
  isSelected: boolean
  isStalled: boolean
  onClick: () => void
}

const SkillNodeRow: React.FC<RowProps> = ({
  node, status, sessionCount, isSelected, isStalled, onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className={[
        'w-full flex items-center gap-3 p-3 rounded text-left transition-all duration-150',
        'border',
        isSelected
          ? 'bg-accent-dim border-lime border-opacity-40'
          : status === 'locked'
          ? 'bg-bg-2 border-line opacity-50 hover:opacity-70'
          : 'bg-bg-2 border-line hover:border-line-2 hover:bg-bg-3',
      ].join(' ')}
    >
      <SkillNodeBadge status={status} size="sm" />
      <div className="flex-1 min-w-0">
        <p className={`font-body text-sm truncate ${status === 'locked' ? 'text-text-3' : 'text-text'}`}>
          {node.name}
        </p>
        <p className="font-mono text-mono-xs text-text-3 truncate">
          L{node.progression_level} · {LEVEL_LABELS[node.progression_level]}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {isStalled && (
          <Tag variant="yellow">STALL</Tag>
        )}
        {sessionCount > 0 && (
          <span className="font-mono text-mono-xs text-text-3">{sessionCount}×</span>
        )}
        <span className="text-text-3">›</span>
      </div>
    </button>
  )
}

// ── Node detail panel ─────────────────────────────────────────────────────────

interface DetailProps {
  node: SkillNode
  status: NodeStatus
  sessionCount: number
  onClose: () => void
}

const NodeDetailPanel: React.FC<DetailProps> = ({ node, status, sessionCount, onClose }) => {
  return (
    <div className="fixed inset-x-0 bottom-[64px] z-30 max-w-[700px] mx-auto animate-fade-up">
      <div className="bg-bg-3 border-t border-line shadow-panel rounded-t-lg p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <SkillNodeBadge status={status} size="md" />
            <div>
              <h3 className="font-heading text-display-sm text-text leading-none">{node.name}</h3>
              <p className="font-mono text-mono-xs text-text-3 mt-1">
                Level {node.progression_level} · {node.category}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-text-3 hover:text-text font-mono text-sm p-1"
          >
            ✕
          </button>
        </div>

        <p className="font-body text-sm text-text-2 leading-relaxed mb-3">
          {node.description}
        </p>

        {/* Unlock criteria */}
        <div className="bg-bg-2 rounded border border-line p-3 mb-3">
          <p className="font-mono uppercase tracking-widest text-mono-xs text-text-3 mb-2">
            Unlock Criteria
          </p>
          <div className="flex gap-4 flex-wrap">
            {node.unlock_criteria.hold_seconds && (
              <span className="font-mono text-mono-sm text-lime">
                {node.unlock_criteria.hold_seconds}s hold
              </span>
            )}
            {node.unlock_criteria.reps && (
              <span className="font-mono text-mono-sm text-lime">
                {node.unlock_criteria.reps} reps
              </span>
            )}
            <span className="font-mono text-mono-sm text-text-2">
              {node.unlock_criteria.sets} sets
            </span>
            <span className="font-mono text-mono-sm text-text-2">
              {node.unlock_criteria.consecutive_sessions} consecutive sessions
            </span>
          </div>
        </div>

        {/* Strength prerequisites */}
        {node.strength_prerequisites.length > 0 && (
          <div className="mb-3">
            <p className="font-mono uppercase tracking-widest text-mono-xs text-text-3 mb-2">
              Strength Prerequisites
            </p>
            <div className="flex flex-wrap gap-1">
              {node.strength_prerequisites.map((req, i) => (
                <Tag key={i} variant="dim">{req}</Tag>
              ))}
            </div>
          </div>
        )}

        {/* Session count */}
        {sessionCount > 0 && (
          <p className="font-mono text-mono-xs text-text-3">
            {sessionCount} sessions logged at this node
          </p>
        )}

        {/* Source credit */}
        <p className="font-mono text-mono-xs text-text-3 mt-2 opacity-50">
          Source: {node.source_credit}
        </p>
      </div>
    </div>
  )
}

export default SkillTree
