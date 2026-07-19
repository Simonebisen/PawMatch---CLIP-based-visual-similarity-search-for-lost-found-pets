import { useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../components/ui/Button'
import LinkButton from '../components/ui/LinkButton'
import { useDocumentTitle } from '../lib/useDocumentTitle'

export default function Landing() {
  useDocumentTitle('Home')
  const [showWelcome, setShowWelcome] = useState(true)

  return (
    <div>
      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 text-center shadow-xl">
            <h2 className="mb-2 text-xl font-bold text-stone-900">Hello, welcome to PetMatcher!</h2>
            <p className="mb-5 text-stone-600">
              Report a lost or found pet with a photo and we'll help find the match.
            </p>
            <Button onClick={() => setShowWelcome(false)} className="w-full">
              Got it
            </Button>
          </div>
        </div>
      )}
      <section className="bg-stone-900 text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-24 text-center">
          <span className="rounded-full bg-white/10 px-4 py-1 text-sm font-medium text-amber-300">
            Photo-matching for lost & found pets
          </span>
          <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
            Reunite lost pets with their families, faster.
          </h1>
          <p className="max-w-xl text-lg text-stone-300">
            Upload a photo of a lost or found pet. We compare it against every other report using
            computer vision, location, and timing to surface the most likely matches.
          </p>
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

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
          <HowItWorksStep
            number="1"
            title="Submit a report"
            text="Add a photo, description, and where and when you lost or found the pet."
          />
          <HowItWorksStep
            number="2"
            title="We compare photos"
            text="A vision model embeds every photo, so visually similar pets surface automatically."
          />
          <HowItWorksStep
            number="3"
            title="Review ranked matches"
            text="Matches are ranked by photo similarity, distance, and recency — reach out directly."
          />
        </div>
      </section>
    </div>
  )
}

function HowItWorksStep({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700">
        {number}
      </span>
      <h3 className="font-semibold text-stone-900">{title}</h3>
      <p className="text-sm text-stone-600">{text}</p>
    </div>
  )
}
