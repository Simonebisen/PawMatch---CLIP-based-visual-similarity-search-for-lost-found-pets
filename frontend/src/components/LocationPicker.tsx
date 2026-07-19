import { useState } from 'react'
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet'
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '../lib/mapConfig'
import Button from './ui/Button'

export interface LatLng {
  lat: number
  lon: number
}

interface LocationPickerProps {
  value: LatLng | null
  onChange: (value: LatLng) => void
  // 'light' (default) for use on light-background pages (e.g. Browse);
  // 'dark' for dark-background pages (e.g. ReportForm) — swaps text/button
  // styling so the hint text and "Use my location" button stay readable.
  theme?: 'light' | 'dark'
}

function ClickHandler({ onChange }: { onChange: (value: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lon: e.latlng.lng })
    },
  })
  return null
}

export default function LocationPicker({ value, onChange, theme = 'light' }: LocationPickerProps) {
  const [geoError, setGeoError] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)
  const hintClass = theme === 'dark' ? 'text-white' : 'text-stone-600'

  function useMyLocation() {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not available in this browser.')
      return
    }
    setGeoError(null)
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({ lat: pos.coords.latitude, lon: pos.coords.longitude })
        setLocating(false)
      },
      () => {
        setGeoError('Could not get your location — click the map to set it manually.')
        setLocating(false)
      },
      { timeout: 8000 },
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="h-64 w-full overflow-hidden rounded-md border border-stone-300">
        <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onChange={onChange} />
          {value && <Marker position={[value.lat, value.lon]} />}
        </MapContainer>
      </div>

      <div className={`flex flex-wrap items-center justify-between gap-2 text-sm ${hintClass}`}>
        <span>
          {value
            ? `Selected: ${value.lat.toFixed(5)}, ${value.lon.toFixed(5)}`
            : 'Click the map to set a location'}
        </span>
        <Button type="button" variant={theme === 'dark' ? 'outline' : 'secondary'} size="sm" onClick={useMyLocation} disabled={locating}>
          {locating ? 'Locating...' : 'Use my location'}
        </Button>
      </div>
      {geoError && <p className={`text-sm ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>{geoError}</p>}
    </div>
  )
}
