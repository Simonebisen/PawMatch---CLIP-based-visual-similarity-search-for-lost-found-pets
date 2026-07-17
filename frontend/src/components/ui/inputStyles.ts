export function inputClasses(hasError = false): string {
  return [
    'w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2',
    hasError ? 'border-red-400 focus:ring-red-300' : 'border-stone-300 focus:ring-amber-400',
  ].join(' ')
}
