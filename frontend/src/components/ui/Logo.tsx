// Same paw mark as public/favicon.svg, inlined as a component so it can be
// styled/sized with Tailwind classes instead of loaded as a separate image.
export default function Logo({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="#1c1917" />
      <g fill="#d97706">
        <ellipse cx="16" cy="20.5" rx="7" ry="6" />
        <ellipse cx="7.2" cy="13.5" rx="3.1" ry="4" />
        <ellipse cx="14" cy="8.6" rx="3.1" ry="4" />
        <ellipse cx="18" cy="8.6" rx="3.1" ry="4" />
        <ellipse cx="24.8" cy="13.5" rx="3.1" ry="4" />
      </g>
    </svg>
  )
}
