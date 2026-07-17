import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ApiError, getReport, imageUrl, type Report } from '../api/reports'
import Badge from '../components/ui/Badge'
import ErrorBanner from '../components/ui/ErrorBanner'
import LinkButton from '../components/ui/LinkButton'
import LoadingState from '../components/ui/LoadingState'
import { capitalize, formatDate } from '../lib/format'
import { useDocumentTitle } from '../lib/useDocumentTitle'

function reportErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    return err.status === 404 ? 'Report not found.' : err.message
  }
  return 'Failed to load this report.'
}

export default function ReportDetail() {
  const { id } = useParams<{ id: string }>()
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useDocumentTitle(report ? report.breed || capitalize(report.species) : 'Report')

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setReport(null)

    getReport(id)
      .then((r) => {
        if (!cancelled) setReport(r)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(reportErrorMessage(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return <LoadingState message="Loading report..." />
  }

  if (error || !report) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <ErrorBanner message={error ?? 'Report not found.'} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex flex-col gap-6 sm:flex-row">
        <img
          src={imageUrl(report.image_path)}
          alt={report.breed || report.species}
          className="h-72 w-full shrink-0 rounded-lg border border-stone-200 object-cover sm:h-64 sm:w-64"
        />
        <div className="flex flex-1 flex-col gap-2">
          <Badge variant={report.report_type}>{report.report_type === 'lost' ? 'Lost' : 'Found'}</Badge>
          <h1 className="text-3xl font-bold text-stone-900">{report.breed || capitalize(report.species)}</h1>

          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-stone-600">
            <dt className="font-medium text-stone-500">Species</dt>
            <dd>{capitalize(report.species)}</dd>
            <dt className="font-medium text-stone-500">Color</dt>
            <dd>{report.color || '—'}</dd>
            <dt className="font-medium text-stone-500">Date</dt>
            <dd>{formatDate(report.event_date)}</dd>
            <dt className="font-medium text-stone-500">Location</dt>
            <dd>
              {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
            </dd>
          </dl>

          <div className="mt-4">
            <LinkButton to={`/results/${report.id}`} variant="primary" size="lg">
              View Matches
            </LinkButton>
          </div>
        </div>
      </div>

      {report.description && (
        <div className="mt-8">
          <h2 className="mb-1 text-sm font-semibold text-stone-500">Description</h2>
          <p className="text-stone-700">{report.description}</p>
        </div>
      )}

      <div className="mt-8 rounded-lg border border-stone-200 bg-white p-4">
        <h2 className="mb-1 text-sm font-semibold text-stone-500">Contact</h2>
        <p className="text-stone-900">{report.contact_info}</p>
      </div>
    </div>
  )
}
