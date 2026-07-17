// Typed client for the backend reports API. Kept free of any React/UI
// concerns so it's reusable across pages/components.

export type ReportType = 'lost' | 'found'
export type Species = 'dog' | 'cat' | 'other'
export type ReportStatus = 'open' | 'resolved' | 'expired'

export interface Report {
  id: string
  report_type: ReportType
  species: Species
  breed: string | null
  color: string | null
  description: string | null
  contact_info: string
  image_path: string
  latitude: number
  longitude: number
  event_date: string
  status: ReportStatus
  created_at: string
}

export interface ReportListItem extends Report {
  // Only populated when the request included lat/lon/radius_km.
  distance_km: number | null
}

export interface MatchResult extends Report {
  similarity: number
  distance_km: number
  score: number
}

export interface MatchResponse {
  source: Report
  matches: MatchResult[]
}

export interface CreateReportInput {
  report_type: ReportType
  species: Species
  breed?: string
  color?: string
  description?: string
  contact_info: string
  latitude: number
  longitude: number
  event_date: string
  image: File
}

export interface ListReportsParams {
  limit?: number
  offset?: number
  report_type?: ReportType
  species?: Species
  lat?: number
  lon?: number
  radius_km?: number
}

export interface GetMatchesParams {
  radius_km?: number
  date_window_days?: number
  w_visual?: number
  w_distance?: number
  w_recency?: number
  limit?: number
}

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

interface ValidationErrorItem {
  loc?: unknown[]
  msg?: string
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json()
    if (typeof body?.detail === 'string') {
      return body.detail
    }
    if (Array.isArray(body?.detail)) {
      return (body.detail as ValidationErrorItem[])
        .map((item) => {
          const field = Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : undefined
          return field ? `${field}: ${item.msg}` : item.msg
        })
        .join('; ')
    }
  } catch {
    // response body wasn't JSON; fall through to the generic message below
  }
  return response.statusText || 'Something went wrong'
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init)
  if (!response.ok) {
    throw new ApiError(response.status, await parseErrorMessage(response))
  }
  return response.json() as Promise<T>
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value))
  }
  const query = search.toString()
  return query ? `?${query}` : ''
}

export async function createReport(input: CreateReportInput): Promise<Report> {
  const form = new FormData()
  form.set('report_type', input.report_type)
  form.set('species', input.species)
  form.set('contact_info', input.contact_info)
  form.set('latitude', String(input.latitude))
  form.set('longitude', String(input.longitude))
  form.set('event_date', input.event_date)
  if (input.breed) form.set('breed', input.breed)
  if (input.color) form.set('color', input.color)
  if (input.description) form.set('description', input.description)
  form.set('image', input.image)

  return request<Report>('/api/reports', { method: 'POST', body: form })
}

export async function listReports(params: ListReportsParams = {}): Promise<ReportListItem[]> {
  return request<ReportListItem[]>(`/api/reports${buildQuery({ ...params })}`)
}

export async function getReport(id: string): Promise<Report> {
  return request<Report>(`/api/reports/${id}`)
}

export async function getMatches(id: string, params: GetMatchesParams = {}): Promise<MatchResponse> {
  return request<MatchResponse>(`/api/reports/${id}/matches${buildQuery({ ...params })}`)
}

// `image_path` is a server-side filesystem path (e.g. /data/images/xxx.jpg),
// not something the browser can fetch directly — derive the served URL from
// its filename (see the /api/images mount in the backend).
export function imageUrl(imagePath: string): string {
  const filename = imagePath.split('/').pop()
  return `/api/images/${filename}`
}
