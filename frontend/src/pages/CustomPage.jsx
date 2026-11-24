import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageIntro, SiteContentSections, useSiteSections } from '../components/SiteContent'
import { supabase } from '../utils/supabase'

export default function CustomPage() {
  const { slug = '' } = useParams()
  const { sections, loading: sectionsLoading, error: sectionsError } = useSiteSections(slug)
  const [page, setPage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadPage() {
      setLoading(true)
      setError('')
      try {
        const { data, error: loadError } = await supabase
          .from('site_pages')
          .select('slug, title')
          .eq('slug', slug)
          .eq('is_system', false)
          .eq('is_published', true)
          .maybeSingle()

        if (loadError) throw loadError
        if (active) setPage(data)
      } catch (loadError) {
        console.error(`Loading page "${slug}" failed:`, loadError)
        if (active) {
          setPage(null)
          setError(loadError.message || 'This page could not be loaded.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadPage()
    return () => { active = false }
  }, [slug])

  if (loading || sectionsLoading) {
    return <p className="max-w-6xl mx-auto px-4 py-16" role="status">Loading page...</p>
  }

  if (error) {
    return <p className="max-w-6xl mx-auto px-4 py-16 cms-load-error" role="alert">{error}</p>
  }

  if (!page) {
    return (
      <section className="custom-page">
        <div className="max-w-6xl mx-auto px-4">
          <h1>Page not found</h1>
          <p>This page may have been removed or is not published.</p>
          <Link to="/" className="btn-primary">Return home</Link>
        </div>
      </section>
    )
  }

  const intro = sections.find(section => section.section_type === 'intro')

  return (
    <section className="custom-page">
      <div className="max-w-6xl mx-auto px-4">
        <PageIntro section={intro} fallback={{ title: page.title }} heading="h1" />
        <SiteContentSections sections={sections} error={sectionsError} />
      </div>
    </section>
  )
}
