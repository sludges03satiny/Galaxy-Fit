import React from 'react'
import type { NodeStatus } from '../types/skill'

interface Props {
  status: NodeStatus
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

const configs: Record<NodeStatus, {
  icon: string
  className: string
  label: string
}> = {
  locked: {
    icon: '🔒',
    className: 'text-text-3 bg-bg-3 border-line',
    label: 'Locked',
  },
  active: {
    icon: '⚡',
    className: 'text-lime bg-accent-dim border-lime border-opacity-40 animate-pulse-slow',
    label: 'Active',
  },
  unlocked: {
    icon: '✓',
    className: 'text-lime bg-accent-dim border-lime shadow-lime',
    label: 'Unlocked',
  },
}

const sizeStyles = {
  sm: 'w-5 h-5 text-xs',
  md: 'w-7 h-7 text-sm',
  lg: 'w-9 h-9 text-base',
}

export const SkillNodeBadge: React.FC<Props> = ({
  status,
  size = 'md',
  showLabel = false,
}) => {
  const cfg = configs[status]

  if (showLabel) {
    return (
      <div className="flex items-center gap-1.5">
        <span
          className={`inline-flex items-center justify-center rounded border flex-shrink-0 ${sizeStyles[size]} ${cfg.className}`}
        >
          {cfg.icon}
        </span>
        <span className={`font-mono uppercase tracking-widest text-mono-xs ${
          status === 'locked' ? 'text-text-3' : 'text-lime'
        }`}>
          {cfg.label}
        </span>
      </div>
    )
  }

  return (
    <span
      className={`inline-flex items-center justify-center rounded border ${sizeStyles[size]} ${cfg.className}`}
      title={cfg.label}
    >
      {cfg.icon}
    </span>
  )
}

export default SkillNodeBadge
