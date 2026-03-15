import React from 'react'

type TagVariant = 'lime' | 'yellow' | 'red' | 'blue' | 'neutral' | 'dim'

interface TagProps {
  variant?: TagVariant
  children: React.ReactNode
  className?: string
  dot?: boolean
}

const variantStyles: Record<TagVariant, string> = {
  lime:    'bg-accent-dim text-lime border-lime border-opacity-30',
  yellow:  'bg-yellow bg-opacity-10 text-yellow border-yellow border-opacity-30',
  red:     'bg-accent-3 bg-opacity-10 text-accent-3 border-accent-3 border-opacity-30',
  blue:    'bg-accent-4 bg-opacity-10 text-accent-4 border-accent-4 border-opacity-30',
  neutral: 'bg-bg-3 text-text-2 border-line-2',
  dim:     'bg-bg-2 text-text-3 border-line',
}

const dotColors: Record<TagVariant, string> = {
  lime:    'bg-lime',
  yellow:  'bg-yellow',
  red:     'bg-accent-3',
  blue:    'bg-accent-4',
  neutral: 'bg-text-2',
  dim:     'bg-text-3',
}

export const Tag: React.FC<TagProps> = ({
  variant = 'neutral',
  children,
  className = '',
  dot = false,
}) => {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5',
        'font-mono uppercase tracking-widest',
        'text-mono-xs px-2 py-0.5',
        'border rounded-sm',
        variantStyles[variant],
        className,
      ].filter(Boolean).join(' ')}
    >
      {dot && (
        <span className={`w-1 h-1 rounded-full flex-shrink-0 ${dotColors[variant]}`} />
      )}
      {children}
    </span>
  )
}

export default Tag
