import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface CardProps {
  children: ReactNode
  to?: string
  className?: string
  highlighted?: boolean
  id?: string
}

export default function Card({ children, to, className = '', highlighted = false, id }: CardProps) {
  const classes = [
    'overflow-hidden rounded-lg border bg-white shadow-sm transition',
    highlighted ? 'border-amber-500 ring-2 ring-amber-300' : 'border-stone-200',
    to ? 'hover:border-stone-300 hover:shadow-md' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  if (to) {
    return (
      <Link to={to} id={id} className={classes}>
        {children}
      </Link>
    )
  }

  return (
    <div id={id} className={classes}>
      {children}
    </div>
  )
}
