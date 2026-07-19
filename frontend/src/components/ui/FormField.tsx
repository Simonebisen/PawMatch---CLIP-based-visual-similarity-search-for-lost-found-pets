import type { ReactNode } from 'react'

export default function FormField({
  label,
  htmlFor,
  error,
  children,
  labelClassName = 'text-stone-700',
}: {
  label: string
  htmlFor: string
  error?: string
  children: ReactNode
  labelClassName?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className={`text-sm font-medium ${labelClassName}`}>
        {label}
      </label>
      {children}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
