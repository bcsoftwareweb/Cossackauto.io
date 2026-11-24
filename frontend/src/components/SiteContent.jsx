import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../utils/supabase'

export const SITE_PAGES = [
  { value: 'home', label: 'Home' },
  { value: 'about', label: 'About' },
  { value: 'services', label: 'Services' },
  { value: 'reviews', label: 'Reviews' },
  { value: 'reservation', label: 'Reservation' },
]

export function useSiteSections(pageSlug) {
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadSections() {
      setLoading(true)
      setError('')
      try {
        const { data, error: loadError } = await supabase
          .from('site_sections')
          .select('id, page_slug, section_key, section_type, eyebrow, title, body, image_path, button_label, button_url, sort_order, is_published')
          .eq('page_slug', pageSlug)
          .eq('is_published', true)
          .order('sort_order', { ascending: true })

        if (loadError) throw loadError
        if (active) setSections(data ?? [])
      } catch (loadError) {
        console.error(`Loading ${pageSlug} page content failed:`, loadError)
        if (active) {
          setSections([])
          setError('Some site content could not be loaded. Please try again later.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadSections()
    return () => { active = false }
  }, [pageSlug])

  return { sections, loading, error }
}

export function getSiteImageUrl(imagePath) {
  if (!imagePath) return ''
  return supabase.storage.from('site-media').getPublicUrl(imagePath).data.publicUrl
}

export function getSafeContentUrl(value) {
  const url = (value ?? '').trim()
  if (!url) return ''
  if (url.startsWith('/') && !url.startsWith('//')) return url

  try {
    const parsedUrl = new URL(url)
    if (parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'http:') return parsedUrl.href
  } catch {
    return ''
  }

  return ''
}

export function ContentAction({ label, url, className = 'btn-primary' }) {
  const href = getSafeContentUrl(url)
  if (!label || !href) return null

  return href.startsWith('/')
    ? <Link to={href} className={className}>{label}</Link>
    : <a href={href} className={className} target="_blank" rel="noreferrer">{label}</a>
}

export function PageIntro({ section, fallback, heading = 'h2' }) {
  const Heading = heading
  const content = section ?? fallback
  const imageUrl = getSiteImageUrl(content.image_path)

  return (
    <div className="page-header">
      {content.eyebrow && <p className="page-eyebrow">{content.eyebrow}</p>}
      <Heading>{content.title}</Heading>
      {content.body && <p className="page-header-lead cms-section-body">{content.body}</p>}
      {imageUrl && <img className="page-header-image" src={imageUrl} alt={content.title || 'Page image'} />}
      <ContentAction label={content.button_label} url={content.button_url} className="btn-primary cms-page-action" />
    </div>
  )
}

export function SiteContentSections({ sections, error = '' }) {
  const contentSections = sections.filter(section => section.section_type === 'content')

  return (
    <>
      {error && <p className="cms-load-error" role="alert">{error}</p>}
      {contentSections.map(section => {
        const imageUrl = getSiteImageUrl(section.image_path)

        return (
          <article className="cms-content-section" key={section.id}>
            <div className="cms-content-inner">
              <div className="cms-content-copy">
                {section.eyebrow && <p className="page-eyebrow">{section.eyebrow}</p>}
                {section.title && <h2>{section.title}</h2>}
                {section.body && <p className="cms-section-body">{section.body}</p>}
                <ContentAction label={section.button_label} url={section.button_url} />
              </div>
              {imageUrl && <img src={imageUrl} alt={section.title || 'Site content'} />}
            </div>
          </article>
        )
      })}
    </>
  )
}
