import React from 'react'

interface StatBlockProps {
  value: string | number
  label: string
  sublabel?: string
  accent?: 'lime' | 'yellow' | 'red' | 'blue' | 'neutral'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  onClick?: () => void
}

const accentStyles = {
  lime:    'text-lime',
  yellow:  'text-yellow',
  red:     'text-accent-3',
  blue:    'text-accent-4',
  neutral: 'text-text',
}

const valueSizes = {
  sm: 'text-display-sm',
  md: 'text-display-md',
  lg: 'text-display-lg',
}

export const StatBlock: React.FC<StatBlockProps> = ({
  value,
  label,
  sublabel,
  accent = 'neutral',
  size = 'md',
  className = '',
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={[
        'flex flex-col gap-0.5',
        onClick ? 'cursor-pointer group' : '',
        className,
      ].filter(Boolean).join(' ')}
    >
      <span
        className={[
          'font-heading leading-none tracking-wide',
          valueSizes[size],
          accentStyles[accent],
          onClick ? 'group-hover:opacity-80 transition-opacity' : '',
        ].filter(Boolean).join(' ')}
      >
        {value}
      </span>
      <span className="font-mono uppercase tracking-widest text-mono-xs text-text-3">
        {label}
      </span>
      {sublabel && (
        <span className="font-mono text-mono-xs text-text-3 opacity-60">
          {sublabel}
        </span>
      )}
    </div>
  )
}

export default StatBlock
