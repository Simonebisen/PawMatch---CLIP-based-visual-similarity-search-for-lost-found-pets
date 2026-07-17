import { Link, type LinkProps } from 'react-router-dom'
import { buttonClasses, type ButtonSize, type ButtonVariant } from './buttonStyles'

interface LinkButtonProps extends LinkProps {
  variant?: ButtonVariant
  size?: ButtonSize
}

export default function LinkButton({ variant = 'primary', size = 'md', className, ...rest }: LinkButtonProps) {
  return <Link className={buttonClasses(variant, size, className)} {...rest} />
}
