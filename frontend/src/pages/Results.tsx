import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ApiError, getMatches, getReport, imageUrl, type MatchResult, type Report } from '../api/reports'
import ResultsMap from '../components/ResultsMap'
import Badge from '../components/ui/Badge'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import ErrorBanner from '../components/ui/ErrorBanner'
import LoadingState from '../components/ui/LoadingState'
import { capitalize, formatDate } from '../lib/format'
import { useDocumentTitle } from '../lib/useDocumentTitle'

export default function Results() {
  const { id } = useParams<{ id: string }>()

  const [source, setSource] = useState<Report | null>(null)
  const [sourceError, setSourceError] = useState<string | null>(null)
  const [matches, setMatches] = useState<MatchResult[] | null>(null)
  const [matchesError, setMatchesError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  useDocumentTitle(source ? `Matches for ${source.breed || capitalize(source.species)}` : 'Matches')

  useEffect(() => {
    if (!id) return
    let cancelled = false

    setLoading(true)
    setSource(null)
    setSourceError(null)
    setMatches(null)
    setMatchesError(null)

    Promise.allSettled([getReport(id), getMatches(id)]).then(([reportResult, matchesResult]) => {
      if (cancelled) return

      if (reportResult.status === 'fulfilled') {
        setSource(reportResult.value)
      } else {
        setSourceError(errorMessage(reportResult.reason, 'Failed to load this report.'))
      }

      if (matchesResult.status === 'fulfilled') {
        setMatches(matchesResult.value.matches)
      } else {
        setMatchesError(errorMessage(matchesResult.reason, 'Failed to load matches.'))
      }

      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [id])

  function selectMatch(matchId: string) {
    setHighlightedId(matchId)
    document.getElementById(`match-${matchId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  if (loading) {
    return <LoadingState message="Loading matches..." />
  }

  if (sourceError || !source) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <ErrorBanner message={sourceError ?? 'Report not found.'} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <SourceHeader source={source} />

      {matches && matches.length > 0 && (
        <div className="mt-8">
          <ResultsMap source={source} matches={matches} onSelectMatch={selectMatch} />
        </div>
      )}

      <div className="mt-8">
        <h2 className="mb-4 text-xl font-bold text-stone-900">
          Possible matches{matches ? ` (${matches.length})` : ''}
        </h2>

        {matchesError && <ErrorBanner message={matchesError} />}

        {!matchesError && matches && matches.length === 0 && (
          <EmptyState message="No matches found yet — check back later." />
        )}

        {!matchesError && matches && matches.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {matches.map((match) => (
              <MatchCard key={match.id} match={match} highlighted={match.id === highlightedId} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function errorMessage(reason: unknown, fallback: string): string {
  return reason instanceof ApiError ? reason.message : fallback
}

function SourceHeader({ source }: { source: Report }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <img
        src={imageUrl(source.image_path)}
        alt={source.breed || source.species}
        className="h-48 w-48 shrink-0 rounded-lg border border-stone-200 object-cover"
      />
      <div className="flex flex-col gap-1">
        <Badge variant={source.report_type}>{source.report_type === 'lost' ? 'Lost' : 'Found'}</Badge>
        <h1 className="text-2xl font-bold text-stone-900">{source.breed || capitalize(source.species)}</h1>
        <p className="text-stone-600">
          {capitalize(source.species)}
          {source.color ? ` · ${source.color}` : ''}
        </p>
        <p className="text-stone-600">{formatDate(source.event_date)}</p>
        <p className="text-sm text-stone-500">
          {source.latitude.toFixed(4)}, {source.longitude.toFixed(4)}
        </p>
        {source.description && <p className="mt-2 text-stone-700">{source.description}</p>}
      </div>
    </div>
  )
}

function MatchCard({ match, highlighted }: { match: MatchResult; highlighted: boolean }) {
  return (
    <Card id={`match-${match.id}`} highlighted={highlighted}>
      <img
        src={imageUrl(match.image_path)}
        alt={match.breed || match.species}
        className="h-40 w-full object-cover"
      />
      <div className="flex flex-col gap-1 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-stone-900">{match.breed || capitalize(match.species)}</span>
          <Badge variant="info">{Math.round(match.score * 100)}% match</Badge>
        </div>
        <p className="text-sm text-stone-600">
          {capitalize(match.species)}
          {match.color ? ` · ${match.color}` : ''}
        </p>
        <p className="text-sm text-stone-600">{formatDate(match.event_date)}</p>
        <div className="mt-1 flex justify-between text-xs text-stone-500">
          <span>Similarity {Math.round(match.similarity * 100)}%</span>
          <span>{match.distance_km.toFixed(1)} km away</span>
        </div>
        <p className="mt-2 border-t border-stone-100 pt-2 text-sm text-stone-700">
          Contact: <span className="font-medium">{match.contact_info}</span>
        </p>
      </div>
    </Card>
  )
}
