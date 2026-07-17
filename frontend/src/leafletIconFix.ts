// Leaflet's default marker icon references relative image paths that don't
// resolve once bundled by Vite. Re-point them at the bundled asset URLs.
// Import this once at app entry, before any map renders.
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// `_getIconUrl` is a private Leaflet internal not present in the public
// type defs, hence the Record cast instead of `any`.
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})
