import type { ReactNode } from 'react'

type BadgeVariant = 'lost' | 'found' | 'info' | 'neutral'

const variants: Record<BadgeVariant, string> = {
  lost: 'bg-red-100 text-red-700',
  found: 'bg-green-100 text-green-700',
  info: 'bg-amber-100 text-amber-800',
  neutral: 'bg-stone-100 text-stone-700',
}

export default function Badge({
  variant = 'neutral',
  children,
}: {
  variant?: BadgeVariant
  children: ReactNode
}) {
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-medium ${variants[variant]}`}
    >
      {children}
    </span>
  )
}
