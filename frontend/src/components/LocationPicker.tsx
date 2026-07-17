import { useState } from 'react'
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet'
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '../lib/mapConfig'

export interface LatLng {
  lat: number
  lon: number
}

interface LocationPickerProps {
  value: LatLng | null
  onChange: (value: LatLng) => void
}

function ClickHandler({ onChange }: { onChange: (value: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lon: e.latlng.lng })
    },
  })
  return null
}

export default function LocationPicker({ value, onChange }: LocationPickerProps) {
  const [geoError, setGeoError] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)

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
      <div className="h-64 w-full overflow-hidden rounded-md border border-slate-300">
        <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onChange={onChange} />
          {value && <Marker position={[value.lat, value.lon]} />}
        </MapContainer>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
        <span>
          {value
            ? `Selected: ${value.lat.toFixed(5)}, ${value.lon.toFixed(5)}`
            : 'Click the map to set a location'}
        </span>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="rounded-md border border-slate-300 px-3 py-1 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {locating ? 'Locating...' : 'Use my location'}
        </button>
      </div>
      {geoError && <p className="text-sm text-red-600">{geoError}</p>}
    </div>
  )
}
