import { useEffect, useState } from 'react'
import {
  ApiError,
  imageUrl,
  listReports,
  type ListReportsParams,
  type ReportListItem,
  type ReportType,
  type Species,
} from '../api/reports'
import LocationPicker, { type LatLng } from '../components/LocationPicker'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import ErrorBanner from '../components/ui/ErrorBanner'
import { inputClasses } from '../components/ui/inputStyles'
import LoadingState from '../components/ui/LoadingState'
import { capitalize, formatDate } from '../lib/format'
import { useDocumentTitle } from '../lib/useDocumentTitle'

const PAGE_SIZE = 12
const MIN_RADIUS_KM = 1
const MAX_RADIUS_KM = 100

export default function Browse() {
  useDocumentTitle('Browse Reports')

  const [reportType, setReportType] = useState<ReportType | 'all'>('all')
  const [species, setSpecies] = useState<Species | 'all'>('all')
  const [locationEnabled, setLocationEnabled] = useState(false)
  const [location, setLocation] = useState<LatLng | null>(null)
  const [radiusKm, setRadiusKm] = useState(25)
  const [page, setPage] = useState(0)

  const [reports, setReports] = useState<ReportListItem[] | null>(null)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const locationFilterActive = locationEnabled && location !== null

  // Fetches server-side: report_type/species/lat/lon/radius_km are all real
  // query params on GET /api/reports (see backend/app/api/reports.py) — the
  // grid never filters a locally-cached full list, each change re-fetches.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const params: ListReportsParams = {
      limit: PAGE_SIZE + 1, // fetch one extra to cheaply know if there's a next page
      offset: page * PAGE_SIZE,
    }
    if (reportType !== 'all') params.report_type = reportType
    if (species !== 'all') params.species = species
    if (locationFilterActive && location) {
      params.lat = location.lat
      params.lon = location.lon
      params.radius_km = radiusKm
    }

    listReports(params)
      .then((results) => {
        if (cancelled) return
        setHasNextPage(results.length > PAGE_SIZE)
        setReports(results.slice(0, PAGE_SIZE))
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof ApiError ? err.message : 'Failed to load reports.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [reportType, species, locationFilterActive, location, radiusKm, page])

  function updateReportType(value: ReportType | 'all') {
    setReportType(value)
    setPage(0)
  }

  function updateSpecies(value: Species | 'all') {
    setSpecies(value)
    setPage(0)
  }

  function toggleLocationFilter(enabled: boolean) {
    setLocationEnabled(enabled)
    setPage(0)
  }

  function updateLocation(value: LatLng) {
    setLocation(value)
    setPage(0)
  }

  function updateRadius(value: number) {
    setRadiusKm(value)
    setPage(0)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-stone-900">Browse Reports</h1>

      <div className="mb-6 flex flex-col gap-4 rounded-lg border border-stone-200 bg-white p-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label htmlFor="filter-type" className="mb-1 block text-sm font-medium text-stone-700">
              Type
            </label>
            <select
              id="filter-type"
              value={reportType}
              onChange={(e) => updateReportType(e.target.value as ReportType | 'all')}
              className={inputClasses(false)}
            >
              <option value="all">All</option>
              <option value="lost">Lost</option>
              <option value="found">Found</option>
            </select>
          </div>
          <div>
            <label htmlFor="filter-species" className="mb-1 block text-sm font-medium text-stone-700">
              Species
            </label>
            <select
              id="filter-species"
              value={species}
              onChange={(e) => updateSpecies(e.target.value as Species | 'all')}
              className={inputClasses(false)}
            >
              <option value="all">All</option>
              <option value="dog">Dog</option>
              <option value="cat">Cat</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <label className="flex w-fit items-center gap-2 text-sm font-medium text-stone-700">
          <input
            type="checkbox"
            checked={locationEnabled}
            onChange={(e) => toggleLocationFilter(e.target.checked)}
            className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-400"
          />
          Filter by location
        </label>

        {locationEnabled && (
          <div className="flex flex-col gap-3">
            <LocationPicker value={location} onChange={updateLocation} />
            <div className="flex items-center gap-3">
              <label htmlFor="radius" className="shrink-0 text-sm text-stone-600">
                Radius: <span className="font-medium text-stone-900">{radiusKm} km</span>
              </label>
              <input
                id="radius"
                type="range"
                min={MIN_RADIUS_KM}
                max={MAX_RADIUS_KM}
                value={radiusKm}
                onChange={(e) => updateRadius(Number(e.target.value))}
                className="flex-1 accent-amber-600"
              />
            </div>
            {!location && <p className="text-sm text-stone-500">Click the map to set a center point.</p>}
          </div>
        )}
      </div>

      {loading && <LoadingState message="Loading reports..." />}

      {!loading && error && <ErrorBanner message={error} />}

      {!loading && !error && reports && reports.length === 0 && (
        <EmptyState message="No reports match your filters." />
      )}

      {!loading && !error && reports && reports.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {reports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>

          <div className="mt-8 flex items-center justify-center gap-4">
            <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="text-sm text-stone-600">Page {page + 1}</span>
            <Button variant="secondary" size="sm" disabled={!hasNextPage} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

function ReportCard({ report }: { report: ReportListItem }) {
  return (
    <Card to={`/reports/${report.id}`}>
      <img
        src={imageUrl(report.image_path)}
        alt={report.breed || report.species}
        className="h-40 w-full object-cover"
      />
      <div className="flex flex-col gap-1 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-stone-900">{report.breed || capitalize(report.species)}</span>
          <Badge variant={report.report_type}>{report.report_type === 'lost' ? 'Lost' : 'Found'}</Badge>
        </div>
        <p className="text-sm text-stone-600">
          {capitalize(report.species)}
          {report.color ? ` · ${report.color}` : ''}
        </p>
        <p className="text-sm text-stone-600">{formatDate(report.event_date)}</p>
        <p className="text-xs text-stone-500">
          {report.distance_km !== null ? `${report.distance_km.toFixed(1)} km away` : 'Location on map'}
        </p>
      </div>
    </Card>
  )
}
