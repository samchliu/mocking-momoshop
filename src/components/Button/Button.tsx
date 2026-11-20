import type { ButtonHTMLAttributes, Ref } from 'react'
import styles from './Button.module.css'

type Native = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'style' | 'aria-busy' | 'type'>

// knowledge: ADR-006 — tone only exists on primary (omitted variant = primary)
type Look =
  | { variant?: 'primary'; tone?: 'brand' | 'cart' | 'nav' }
  | { variant: 'secondary' | 'text'; tone?: never }

export type ButtonProps = Native &
  Look & {
    size?: 'md' | 'lg'
    /** The request this button triggered is in flight. Other reasons to disable → `disabled`. */
    pending?: boolean
    fullWidth?: boolean
    type?: 'button' | 'submit' | 'reset'
    /** Layout only (width / margin / flex); see ADR-006 className rules. */
    className?: string
    ref?: Ref<HTMLButtonElement>
  }

export function Button({
  variant = 'primary',
  tone = 'brand',
  size = 'md',
  pending = false,
  fullWidth = false,
  type = 'button',
  disabled = false,
  className,
  children,
  ...rest
}: ButtonProps) {
  const classes = [
    styles.root,
    styles[variant],
    variant === 'primary' ? styles[tone] : undefined,
    styles[size],
    fullWidth ? styles.fullWidth : undefined,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      {...rest}
      type={type}
      className={classes}
      // knowledge: ADR-006, BR-003#R4 — pending always disables; aria-busy only while pending
      disabled={disabled || pending}
      aria-busy={pending || undefined}
    >
      {children}
    </button>
  )
}
