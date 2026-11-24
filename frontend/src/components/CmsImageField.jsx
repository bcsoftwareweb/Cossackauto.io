import { useState } from 'react'
import { getSiteImageUrl } from './SiteContent'
import { uploadSiteImage } from '../utils/cms'

export default function CmsImageField({ userId, value, onChange, label }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const imageUrl = getSiteImageUrl(value)

  async function onFileChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setUploading(true)
    setError('')
    try {
      const path = await uploadSiteImage(userId, file)
      onChange(path)
    } catch (uploadError) {
      console.error('Uploading site image failed:', uploadError)
      setError(uploadError.message || 'The image could not be uploaded.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="cms-image-field">
      <label className="cms-field">
        <span>{label}</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={onFileChange}
          disabled={uploading}
        />
        <span className="cms-field-hint">JPG, PNG, WebP, or GIF; up to 10 MB.</span>
      </label>
      {uploading && <p role="status">Uploading image...</p>}
      {error && <p className="account-message account-message--error" role="alert">{error}</p>}
      {imageUrl && (
        <div className="cms-image-preview">
          <img src={imageUrl} alt="Current content" />
          <button type="button" className="btn-secondary" onClick={() => onChange('')}>
            Remove image
          </button>
        </div>
      )}
    </div>
  )
}
