import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ApiError, createReport, type Species } from '../api/reports'
import LocationPicker, { type LatLng } from '../components/LocationPicker'
import Button from '../components/ui/Button'
import ErrorBanner from '../components/ui/ErrorBanner'
import FormField from '../components/ui/FormField'
import { inputClasses } from '../components/ui/inputStyles'
import { useDocumentTitle } from '../lib/useDocumentTitle'

type ReportType = 'lost' | 'found'

interface FormState {
  species: Species | ''
  breed: string
  color: string
  location: LatLng | null
  event_date: string
  description: string
  contact_info: string
}

const initialState: FormState = {
  species: '',
  breed: '',
  color: '',
  location: null,
  event_date: '',
  description: '',
  contact_info: '',
}

export default function ReportForm() {
  const { type } = useParams<{ type: string }>()

  if (type !== 'lost' && type !== 'found') {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center text-red-600">
        Unknown report type "{type}". Use /report/lost or /report/found.
      </div>
    )
  }

  return <ReportFormInner reportType={type} />
}

// Split out so `reportType` is a plain required prop (ReportType, never null)
// rather than something narrowed from a nullable local — TS can't carry that
// narrowing through the async handleSubmit closure below.
function ReportFormInner({ reportType }: { reportType: ReportType }) {
  const navigate = useNavigate()
  useDocumentTitle(reportType === 'lost' ? 'Report a Lost Pet' : 'Report a Found Pet')

  const [form, setForm] = useState<FormState>(initialState)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Revoke the object URL when it changes or the component unmounts, so we
  // don't leak blob URLs as the user swaps the selected photo.
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview)
    }
  }, [imagePreview])

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImageFile(file)
    setImagePreview(file ? URL.createObjectURL(file) : null)
  }

  function validate(): Record<string, string> {
    const next: Record<string, string> = {}
    if (!imageFile) next.image = 'Please select a photo.'
    if (!form.species) next.species = 'Species is required.'
    if (!form.contact_info.trim()) next.contact_info = 'Contact info is required.'
    if (!form.event_date) next.event_date = 'Date is required.'
    if (!form.location) next.location = 'Please select a location on the map.'
    return next
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitError(null)

    const validationErrors = validate()
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setSubmitting(true)
    try {
      const location = form.location as LatLng
      const report = await createReport({
        report_type: reportType,
        species: form.species as Species,
        breed: form.breed || undefined,
        color: form.color || undefined,
        description: form.description || undefined,
        contact_info: form.contact_info,
        latitude: location.lat,
        longitude: location.lon,
        event_date: form.event_date,
        image: imageFile as File,
      })
      navigate(`/results/${report.id}`)
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const title = reportType === 'lost' ? 'Report a Lost Pet' : 'Report a Found Pet'
  const submitVariant = reportType === 'lost' ? 'danger' : 'success'

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-stone-900">{title}</h1>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <FormField label="Photo" htmlFor="image" error={errors.image}>
          <input
            id="image"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="block w-full text-sm text-stone-700 file:mr-3 file:rounded-md file:border-0 file:bg-stone-800 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-stone-700"
          />
          {imagePreview && (
            <img
              src={imagePreview}
              alt="Selected pet"
              className="mt-3 h-40 w-40 rounded-md border border-stone-200 object-cover"
            />
          )}
        </FormField>

        <FormField label="Species" htmlFor="species" error={errors.species}>
          <select
            id="species"
            value={form.species}
            onChange={(e) => updateField('species', e.target.value as Species | '')}
            className={inputClasses(!!errors.species)}
          >
            <option value="">Select species</option>
            <option value="dog">Dog</option>
            <option value="cat">Cat</option>
            <option value="other">Other</option>
          </select>
        </FormField>

        <FormField label="Breed (optional)" htmlFor="breed">
          <input
            id="breed"
            type="text"
            value={form.breed}
            onChange={(e) => updateField('breed', e.target.value)}
            className={inputClasses(false)}
          />
        </FormField>

        <FormField label="Color" htmlFor="color">
          <input
            id="color"
            type="text"
            value={form.color}
            onChange={(e) => updateField('color', e.target.value)}
            className={inputClasses(false)}
          />
        </FormField>

        <FormField label="Location" htmlFor="location-picker" error={errors.location}>
          <LocationPicker value={form.location} onChange={(location) => updateField('location', location)} />
        </FormField>

        <FormField label="Date" htmlFor="event_date" error={errors.event_date}>
          <input
            id="event_date"
            type="date"
            value={form.event_date}
            onChange={(e) => updateField('event_date', e.target.value)}
            className={inputClasses(!!errors.event_date)}
          />
        </FormField>

        <FormField label="Description (optional)" htmlFor="description">
          <textarea
            id="description"
            rows={4}
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
            className={inputClasses(false)}
          />
        </FormField>

        <FormField label="Contact info" htmlFor="contact_info" error={errors.contact_info}>
          <input
            id="contact_info"
            type="text"
            placeholder="Email or phone number"
            value={form.contact_info}
            onChange={(e) => updateField('contact_info', e.target.value)}
            className={inputClasses(!!errors.contact_info)}
          />
        </FormField>

        {submitError && <ErrorBanner message={submitError} />}

        <Button type="submit" variant={submitVariant} size="lg" disabled={submitting}>
          {submitting ? 'Submitting...' : `Submit ${reportType === 'lost' ? 'Lost' : 'Found'} Report`}
        </Button>
      </form>
    </div>
  )
}
