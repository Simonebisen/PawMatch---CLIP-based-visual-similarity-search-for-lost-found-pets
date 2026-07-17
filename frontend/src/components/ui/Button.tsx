import type { ButtonHTMLAttributes } from 'react'
import { buttonClasses, type ButtonSize, type ButtonVariant } from './buttonStyles'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export default function Button({ variant = 'primary', size = 'md', className, ...rest }: ButtonProps) {
  return <button className={buttonClasses(variant, size, className)} {...rest} />
}
