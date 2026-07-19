export function inputClasses(hasError = false): string {
  return [
    // bg-white + text-stone-900 + [color-scheme:light] pin the field to a
    // light control regardless of OS/browser dark-mode preference — without
    // this, browsers auto-apply dark native styling (dark bg, light text) to
    // unstyled form controls, which reads fine on this page's light
    // backgrounds but turns nearly unreadable on ReportForm's black one.
    'w-full rounded-md border bg-white px-3 py-2 text-sm text-stone-900 shadow-sm [color-scheme:light] focus:outline-none focus:ring-2',
    hasError ? 'border-red-400 focus:ring-red-300' : 'border-stone-300 focus:ring-amber-400',
  ].join(' ')
}
