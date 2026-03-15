import React from 'react'
import type { ReadinessLight as ReadinessLightType } from '../types/athlete'

interface Props {
  readiness: ReadinessLightType
  compact?: boolean
}

const configs = {
  green: {
    dot: 'bg-[#50f090]',
    glow: 'shadow-[0_0_12px_rgba(80,240,144,0.6)]',
    text: 'text-[#50f090]',
    border: 'border-[#50f090] border-opacity-30',
    bg: 'bg-[#50f090] bg-opacity-5',
  },
  yellow: {
    dot: 'bg-yellow',
    glow: 'shadow-[0_0_12px_rgba(240,200,40,0.6)]',
    text: 'text-yellow',
    border: 'border-yellow border-opacity-30',
    bg: 'bg-yellow bg-opacity-5',
  },
  red: {
    dot: 'bg-accent-3',
    glow: 'shadow-[0_0_12px_rgba(240,80,80,0.6)]',
    text: 'text-accent-3',
    border: 'border-accent-3 border-opacity-30',
    bg: 'bg-accent-3 bg-opacity-5',
  },
}

export const ReadinessLight: React.FC<Props> = ({ readiness, compact = false }) => {
  const cfg = configs[readiness.state]

  if (compact) {
    return (
      <span
        className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot} ${cfg.glow} animate-pulse-slow`}
        title={readiness.label}
      />
    )
  }

  return (
    <div className={`flex items-start gap-3 rounded p-3 border ${cfg.border} ${cfg.bg}`}>
      <span
        className={`mt-0.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot} ${cfg.glow} animate-pulse-slow`}
      />
      <div className="min-w-0">
        <p className={`font-mono uppercase tracking-widest text-mono-xs font-medium ${cfg.text}`}>
          {readiness.label}
        </p>
        <p className="font-body text-xs text-text-2 mt-0.5 leading-relaxed">
          {readiness.description}
        </p>
        <div className="flex gap-3 mt-2">
          <span className="font-mono text-mono-xs text-text-3">
            Sleep <span className="text-text-2">{readiness.sleepScore}/10</span>
          </span>
          <span className="font-mono text-mono-xs text-text-3">
            Stress <span className="text-text-2">{readiness.stressScore}/10</span>
          </span>
        </div>
      </div>
    </div>
  )
}

export default ReadinessLight
