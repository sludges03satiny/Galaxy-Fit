import React from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  loading?: boolean
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    'bg-lime text-bg font-heading tracking-widest',
    'hover:bg-opacity-90 active:scale-[0.98]',
    'shadow-lime',
  ].join(' '),
  secondary: [
    'bg-transparent border border-lime text-lime font-mono',
    'hover:bg-accent-dim active:scale-[0.98]',
  ].join(' '),
  ghost: [
    'bg-transparent text-text-2 font-mono',
    'hover:text-text hover:bg-bg-3 active:scale-[0.98]',
  ].join(' '),
  danger: [
    'bg-transparent border border-accent-3 text-accent-3 font-mono',
    'hover:bg-red-alert hover:bg-opacity-10 active:scale-[0.98]',
  ].join(' '),
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-mono-xs',
  md: 'h-10 px-5 text-mono-sm',
  lg: 'h-13 px-7 text-mono-base',
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  icon,
  iconPosition = 'left',
  children,
  disabled,
  className = '',
  ...props
}) => {
  const isDisabled = disabled || loading

  return (
    <button
      disabled={isDisabled}
      className={[
        // Base
        'inline-flex items-center justify-center gap-2',
        'rounded transition-all duration-150',
        'select-none cursor-pointer',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100',
        // Variant + size
        variantStyles[variant],
        sizeStyles[size],
        // Width
        fullWidth ? 'w-full' : '',
        // Custom
        className,
      ].filter(Boolean).join(' ')}
      {...props}
    >
      {loading ? (
        <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        iconPosition === 'left' && icon
      )}
      {children && (
        <span className={variant === 'primary' ? 'font-heading tracking-widest text-sm' : 'font-mono uppercase tracking-widest text-xs'}>
          {children}
        </span>
      )}
      {!loading && iconPosition === 'right' && icon}
    </button>
  )
}

export default Button
