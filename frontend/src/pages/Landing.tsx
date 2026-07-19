import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import heroDog from '../assets/hero-dog.jpg'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import LinkButton from '../components/ui/LinkButton'
import Logo from '../components/ui/Logo'
import { useDocumentTitle } from '../lib/useDocumentTitle'

const WELCOME_SEEN_KEY = 'petmatcher_welcome_seen'

export default function Landing() {
  useDocumentTitle('Home')

  // Lazy initializer so the popup only ever shows once per browser —
  // localStorage is checked before the first render, not after.
  const [showWelcome, setShowWelcome] = useState(() => {
    try {
      return !localStorage.getItem(WELCOME_SEEN_KEY)
    } catch {
      return true
    }
  })

  function dismissWelcome() {
    try {
      localStorage.setItem(WELCOME_SEEN_KEY, '1')
    } catch {
      // localStorage unavailable (private browsing etc.) — just close it for this view.
    }
    setShowWelcome(false)
  }

  return (
    <div>
      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 text-center shadow-xl">
            <Logo className="mx-auto mb-4 h-16 w-16" />
            <h2 className="mb-2 text-xl font-bold text-stone-900">Hello, welcome to PetMatcher!</h2>
            <p className="mb-5 text-stone-600">
              Report a lost or found pet with a photo and we'll help find the match.
            </p>
            <Button onClick={dismissWelcome} className="w-full">
              Got it
            </Button>
          </div>
        </div>
      )}

      <section className="relative overflow-hidden bg-stone-900 text-white">
        {/* Background photo, heavily darkened + blurred — stays a "black" section, just with warmth behind it. */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25 blur-sm"
          style={{ backgroundImage: `url(${heroDog})` }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-stone-900/90 via-stone-900/85 to-stone-900" />

        <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-24 text-center">
          <span className="rounded-full bg-white/10 px-4 py-1 text-sm font-medium text-amber-300">
            Photo-matching for lost & found pets
          </span>
          <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
            Reunite lost pets with their families, faster.
          </h1>
          <blockquote className="max-w-xl text-lg text-stone-200 italic">
            "Somewhere out there, a family is hoping for good news. Let's help you bring it to
            them."
          </blockquote>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <LinkButton to="/report/lost" variant="danger" size="lg">
              Report a Lost Pet
            </LinkButton>
            <LinkButton to="/report/found" variant="success" size="lg">
              Report a Found Pet
            </LinkButton>
          </div>
          <Link to="/browse" className="text-sm font-medium text-stone-300 underline hover:text-white">
            Or browse all reports →
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="mx-auto mb-12 max-w-xl text-center">
          <h2 className="text-3xl font-bold text-stone-900">How it works</h2>
          <p className="mt-2 text-stone-600">Three steps from a photo to a real lead.</p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <HowItWorksStep
            icon={<CameraIcon />}
            number="1"
            title="Submit a report"
            text="Add a photo, description, and where and when you lost or found the pet."
          />
          <HowItWorksStep
            icon={<ScanIcon />}
            number="2"
            title="We compare photos"
            text="A vision model embeds every photo, so visually similar pets surface automatically."
          />
          <HowItWorksStep
            icon={<RankIcon />}
            number="3"
            title="Review ranked matches"
            text="Matches are ranked by photo similarity, distance, and recency — reach out directly."
          />
        </div>
      </section>
    </div>
  )
}

function HowItWorksStep({
  icon,
  number,
  title,
  text,
}: {
  icon: ReactNode
  number: string
  title: string
  text: string
}) {
  return (
    <Card className="flex flex-col items-center gap-3 p-8 text-center transition hover:shadow-md">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
        {icon}
      </div>
      <span className="text-xs font-bold tracking-widest text-amber-600 uppercase">Step {number}</span>
      <h3 className="text-lg font-semibold text-stone-900">{title}</h3>
      <p className="text-sm text-stone-600">{text}</p>
    </Card>
  )
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-6 w-6">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 9a2 2 0 0 1 2-2h1.5l1-1.5h5l1 1.5H16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"
      />
      <circle cx="12" cy="13" r="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ScanIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-6 w-6">
      <circle cx="10" cy="10" r="6" />
      <path strokeLinecap="round" d="M20 20l-5.5-5.5" />
    </svg>
  )
}

function RankIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 18V11M13 18V6M18 18v-4" />
    </svg>
  )
}
