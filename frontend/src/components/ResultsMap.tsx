import { useEffect, useMemo } from 'react'
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import type { LatLngTuple } from 'leaflet'
import type { MatchResult, Report } from '../api/reports'
import { DEFAULT_CENTER } from '../lib/mapConfig'

interface ResultsMapProps {
  source: Report
  matches: MatchResult[]
  onSelectMatch: (id: string) => void
}

// Green (high score) -> red (low score).
function scoreColor(score: number): string {
  const hue = Math.max(0, Math.min(1, score)) * 120
  return `hsl(${hue}, 70%, 45%)`
}

function FitBounds({ points }: { points: LatLngTuple[] }) {
  const map = useMap()

  useEffect(() => {
    if (points.length === 0) return
    if (points.length === 1) {
      map.setView(points[0], 13)
    } else {
      map.fitBounds(points, { padding: [30, 30] })
    }
    // `points` is memoized by the caller so this only fires when the actual
    // source/matches data changes, not on every unrelated re-render.
  }, [map, points])

  return null
}

export default function ResultsMap({ source, matches, onSelectMatch }: ResultsMapProps) {
  const points = useMemo<LatLngTuple[]>(() => {
    const pts: LatLngTuple[] = [[source.latitude, source.longitude]]
    for (const m of matches) pts.push([m.latitude, m.longitude])
    return pts
  }, [source, matches])

  return (
    <div className="h-96 w-full overflow-hidden rounded-lg border border-slate-300">
      <MapContainer center={DEFAULT_CENTER} zoom={11} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} />

        <Marker position={[source.latitude, source.longitude]}>
          <Popup>
            <strong>{source.report_type === 'lost' ? 'Lost' : 'Found'} report</strong>
            <br />
            {source.breed || source.species}
          </Popup>
        </Marker>

        {matches.map((m) => (
          <CircleMarker
            key={m.id}
            center={[m.latitude, m.longitude]}
            radius={6 + m.score * 14}
            pathOptions={{ color: scoreColor(m.score), fillColor: scoreColor(m.score), fillOpacity: 0.7 }}
            eventHandlers={{ click: () => onSelectMatch(m.id) }}
          >
            <Popup>
              <strong>{m.breed || m.species}</strong>
              <br />
              {Math.round(m.score * 100)}% match · {m.distance_km.toFixed(1)} km away
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  )
}
