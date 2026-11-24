import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { SITE_PAGES } from '../components/SiteContent'
import { SITE_HEADER_UPDATED_EVENT } from '../config/siteSettings'
import { supabase } from '../utils/supabase'

const EMPTY_PAGE = {
  title: '',
  slug: '',
  is_published: false,
}

function slugFromTitle(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function announceHeaderUpdate() {
  window.dispatchEvent(new Event(SITE_HEADER_UPDATED_EVENT))
}

export default function SitePagesManager() {
  const [pages, setPages] = useState([])
  const [form, setForm] = useState({ ...EMPTY_PAGE })
  const [editingSlug, setEditingSlug] = useState(null)
  const [slugEdited, setSlugEdited] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [formError, setFormError] = useState('')
  const [message, setMessage] = useState('')

  async function loadPages() {
    setLoading(true)
    setLoadError('')
    try {
      const { data, error } = await supabase
        .from('site_pages')
        .select('slug, title, is_system, is_published')
        .order('is_system', { ascending: false })
        .order('title', { ascending: true })

      if (error) throw error
      setPages(data ?? [])
    } catch (error) {
      console.error('Loading site pages failed:', error)
      setLoadError(error.message || 'Website pages could not be loaded.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadPages() }, [])

  function startNewPage() {
    setEditingSlug(null)
    setSlugEdited(false)
    setForm({ ...EMPTY_PAGE })
    setFormError('')
    setMessage('')
  }

  function startEditingPage(page) {
    setEditingSlug(page.slug)
    setSlugEdited(true)
    setForm({
      title: page.title,
      slug: page.slug,
      is_published: page.is_published,
    })
    setFormError('')
    setMessage('')
  }

  function updateTitle(title) {
    setForm(current => ({
      ...current,
      title,
      slug: slugEdited ? current.slug : slugFromTitle(title),
    }))
  }

  async function savePage(event) {
    event.preventDefault()
    setSaving(true)
    setFormError('')
    setMessage('')

    const slug = slugFromTitle(form.slug)
    if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
      setFormError('Use a page address with lowercase letters, numbers, and hyphens.')
      setSaving(false)
      return
    }
    if (SITE_PAGES.some(page => page.value === slug)) {
      setFormError('That address belongs to a built-in page. Choose a different one.')
      setSaving(false)
      return
    }

    try {
      const payload = {
        title: form.title.trim(),
        slug,
        is_published: Boolean(form.is_published),
      }
      const result = editingSlug
        ? await supabase.from('site_pages').update(payload).eq('slug', editingSlug).select().single()
        : await supabase.from('site_pages').insert(payload).select().single()

      if (result.error) throw result.error
      setEditingSlug(result.data.slug)
      setSlugEdited(true)
      setForm({
        title: result.data.title,
        slug: result.data.slug,
        is_published: result.data.is_published,
      })
      setMessage('Page saved.')
      await loadPages()
      announceHeaderUpdate()
    } catch (error) {
      console.error('Saving site page failed:', error)
      setFormError(error.message || 'The page could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  async function deletePage(page) {
    if (!window.confirm(`Delete "${page.title}"? Its sections and navbar link will also be deleted.`)) return

    setFormError('')
    setMessage('')
    try {
      const { error } = await supabase.from('site_pages').delete().eq('slug', page.slug)
      if (error) throw error
      if (editingSlug === page.slug) startNewPage()
      setMessage('Page deleted.')
      await loadPages()
      announceHeaderUpdate()
    } catch (error) {
      console.error('Deleting site page failed:', error)
      setFormError(error.message || 'The page could not be deleted.')
    }
  }

  return (
    <div className="cms-manager">
      <div className="cms-manager-heading">
        <div>
          <h2>Website pages</h2>
          <p>Create pages for the site, then add text and image sections in Manage Content.</p>
        </div>
        <button type="button" className="btn-primary" onClick={startNewPage}>Add page</button>
      </div>

      {loadError && <p className="account-message account-message--error" role="alert">{loadError}</p>}
      {formError && <p className="account-message account-message--error" role="alert">{formError}</p>}
      {message && <p className="account-message" role="status">{message}</p>}

      <div className="cms-manager-layout">
        <div className="cms-item-list" aria-label="Website pages">
          {loading ? (
            <p role="status">Loading pages...</p>
          ) : pages.length ? pages.map(page => (
            <article className={`cms-item ${editingSlug === page.slug ? 'is-selected' : ''}`} key={page.slug}>
              <button
                type="button"
                className="cms-item-select"
                onClick={() => !page.is_system && startEditingPage(page)}
                disabled={page.is_system}
              >
                <span className="cms-item-title">{page.title}</span>
                <span className="cms-item-meta">
                  /{page.slug} · {page.is_system ? 'Built-in page' : page.is_published ? 'Published' : 'Draft'}
                </span>
              </button>
              {page.is_system ? (
                <span className="cms-item-meta">Managed by site</span>
              ) : (
                <div className="cms-page-actions">
                  {page.is_published && <Link to={`/pages/${page.slug}`}>Preview</Link>}
                  <button type="button" className="cms-item-delete" onClick={() => deletePage(page)}>Delete</button>
                </div>
              )}
            </article>
          )) : (
            <p>No website pages exist yet.</p>
          )}
        </div>

        <form className="cms-editor-card" onSubmit={savePage}>
          <h3>{editingSlug ? 'Edit page' : 'Create a page'}</h3>
          <label className="cms-field">
            <span>Page name</span>
            <input
              value={form.title}
              onChange={event => updateTitle(event.target.value)}
              maxLength={120}
              required
            />
          </label>
          <label className="cms-field">
            <span>Page address</span>
            <input
              value={form.slug}
              onChange={event => {
                setSlugEdited(true)
                setForm(current => ({ ...current, slug: event.target.value }))
              }}
              maxLength={80}
              pattern="[a-zA-Z0-9]+(-[a-zA-Z0-9]+)*"
              placeholder="our-story"
              required
            />
            <span className="cms-field-hint">
              Visitors will open this page at /pages/{form.slug || 'your-page-name'}.
            </span>
          </label>
          <label className="cms-checkbox-field">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={event => setForm(current => ({ ...current, is_published: event.target.checked }))}
            />
            <span>Publish this page on the website</span>
          </label>
          <div className="cms-form-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save page'}
            </button>
            {editingSlug && (
              <button type="button" className="btn-secondary" onClick={startNewPage}>Cancel edit</button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
