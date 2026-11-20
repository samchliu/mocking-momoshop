import type { InputHTMLAttributes, Ref } from 'react'
import styles from './TextInput.module.css'

export type TextInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'style' | 'type'> & {
  type?: 'text' | 'search' | 'number'
  /** `bare`: inside a composite control that draws its own border and focus ring (:focus-within). */
  appearance?: 'boxed' | 'bare'
  /** Layout only (width / margin / flex); see ADR-006 className rules. */
  className?: string
  ref?: Ref<HTMLInputElement>
}

// knowledge: ADR-006 — label association stays with the caller
export function TextInput({
  type = 'text',
  appearance = 'boxed',
  className,
  ...rest
}: TextInputProps) {
  const classes = [styles.root, styles[appearance], className].filter(Boolean).join(' ')
  return <input {...rest} type={type} className={classes} />
}
