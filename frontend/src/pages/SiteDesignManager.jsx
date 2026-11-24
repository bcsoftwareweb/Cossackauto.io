import { useEffect, useState } from 'react'
import CmsImageField from '../components/CmsImageField'
import { getSafeContentUrl } from '../components/SiteContent'
import { DEFAULT_SITE_SETTINGS, SITE_HEADER_UPDATED_EVENT } from '../config/siteSettings'
import { supabase } from '../utils/supabase'

const EMPTY_NAVIGATION_ITEM = {
  label: '',
  page_slug: '',
  href: '',
  sort_order: 50,
  is_published: true,
}

function announceHeaderUpdate() {
  window.dispatchEvent(new Event(SITE_HEADER_UPDATED_EVENT))
}

export default function SiteDesignManager({ user }) {
  const [settings, setSettings] = useState({ ...DEFAULT_SITE_SETTINGS })
  const [navigationItems, setNavigationItems] = useState([])
  const [pages, setPages] = useState([])
  const [form, setForm] = useState({ ...EMPTY_NAVIGATION_ITEM })
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)
  const [savingNavigation, setSavingNavigation] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [formError, setFormError] = useState('')
  const [message, setMessage] = useState('')

  async function loadSiteDesign() {
    setLoading(true)
    setLoadError('')
    try {
      const [settingsResult, navigationResult, pagesResult] = await Promise.all([
        supabase
          .from('site_settings')
          .select('id, site_name, logo_path, header_background_color, header_text_color, header_accent_color')
          .eq('id', 1)
          .maybeSingle(),
        supabase
          .from('site_navigation')
          .select('id, label, page_slug, href, sort_order, is_published')
          .order('sort_order', { ascending: true }),
        supabase
          .from('site_pages')
          .select('slug, title, is_published')
          .order('title', { ascending: true }),
      ])

      if (settingsResult.error) throw settingsResult.error
      if (navigationResult.error) throw navigationResult.error
      if (pagesResult.error) throw pagesResult.error

      setSettings({ ...DEFAULT_SITE_SETTINGS, ...settingsResult.data })
      setNavigationItems(navigationResult.data ?? [])
      setPages(pagesResult.data ?? [])
    } catch (error) {
      console.error('Loading site design settings failed:', error)
      setLoadError(error.message || 'Site design settings could not be loaded.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadSiteDesign() }, [])

  async function saveSettings(event) {
    event.preventDefault()
    setSavingSettings(true)
    setFormError('')
    setMessage('')

    try {
      const payload = {
        site_name: settings.site_name.trim(),
        logo_path: settings.logo_path || null,
        header_background_color: settings.header_background_color,
        header_text_color: settings.header_text_color,
        header_accent_color: settings.header_accent_color,
      }
      const { data, error } = await supabase
        .from('site_settings')
        .update(payload)
        .eq('id', 1)
        .select()
        .single()

      if (error) throw error
      setSettings({ ...DEFAULT_SITE_SETTINGS, ...data })
      announceHeaderUpdate()
      setMessage('Site identity and header design saved.')
    } catch (error) {
      console.error('Saving site design settings failed:', error)
      setFormError(error.message || 'Site design settings could not be saved.')
    } finally {
      setSavingSettings(false)
    }
  }

  function startNewNavigationItem() {
    setEditingId(null)
    setForm({ ...EMPTY_NAVIGATION_ITEM, sort_order: (navigationItems.length + 1) * 10 })
    setFormError('')
    setMessage('')
  }

  function startEditingNavigationItem(item) {
    setEditingId(item.id)
    setForm({
      ...EMPTY_NAVIGATION_ITEM,
      ...item,
      page_slug: item.page_slug ?? '',
      href: item.href ?? '',
    })
    setFormError('')
    setMessage('')
  }

  function updateNavigationForm(field, value) {
    setForm(current => {
      const next = { ...current, [field]: value }
      if (field === 'page_slug' && value) next.href = ''
      if (field === 'page_slug' && !value) next.href = current.href ?? ''
      return next
    })
  }

  async function saveNavigationItem(event) {
    event.preventDefault()
    setSavingNavigation(true)
    setFormError('')
    setMessage('')

    const safeHref = form.page_slug ? null : getSafeContentUrl(form.href)
    if (!form.page_slug && !safeHref) {
      setFormError('Enter a safe website path or an http/https link.')
      setSavingNavigation(false)
      return
    }

    try {
      const payload = {
        label: form.label.trim(),
        page_slug: form.page_slug || null,
        href: safeHref,
        sort_order: Number(form.sort_order),
        is_published: Boolean(form.is_published),
      }
      const result = editingId
        ? await supabase.from('site_navigation').update(payload).eq('id', editingId)
        : await supabase.from('site_navigation').insert(payload)

      if (result.error) throw result.error
      setMessage('Navigation link saved.')
      startNewNavigationItem()
      await loadSiteDesign()
      announceHeaderUpdate()
    } catch (error) {
      console.error('Saving navigation link failed:', error)
      setFormError(error.message || 'The navigation link could not be saved.')
    } finally {
      setSavingNavigation(false)
    }
  }

  async function deleteNavigationItem(item) {
    if (!window.confirm(`Remove "${item.label}" from the main navigation?`)) return

    setFormError('')
    setMessage('')
    try {
      const { error } = await supabase.from('site_navigation').delete().eq('id', item.id)
      if (error) throw error
      if (editingId === item.id) startNewNavigationItem()
      setMessage('Navigation link removed.')
      await loadSiteDesign()
      announceHeaderUpdate()
    } catch (error) {
      console.error('Deleting navigation link failed:', error)
      setFormError(error.message || 'The navigation link could not be removed.')
    }
  }

  if (loading) return <p role="status">Loading site design...</p>

  return (
    <div className="cms-manager">
      <div className="cms-manager-heading">
        <div>
          <h2>Header and navigation</h2>
          <p>Change your logo and site name, choose header colors, and organize the main menu.</p>
        </div>
      </div>

      {loadError && <p className="account-message account-message--error" role="alert">{loadError}</p>}
      {formError && <p className="account-message account-message--error" role="alert">{formError}</p>}
      {message && <p className="account-message" role="status">{message}</p>}
      {loadError && <button type="button" className="btn-secondary" onClick={loadSiteDesign}>Try again</button>}

      {!loadError && (
        <>
          <form className="cms-editor-card cms-design-settings" onSubmit={saveSettings}>
            <h3>Site identity and header style</h3>
            <label className="cms-field">
              <span>Site name</span>
              <input
                value={settings.site_name}
                onChange={event => setSettings(current => ({ ...current, site_name: event.target.value }))}
                maxLength={100}
                required
              />
            </label>
            <CmsImageField
              userId={user.id}
              value={settings.logo_path ?? ''}
              onChange={logoPath => setSettings(current => ({ ...current, logo_path: logoPath }))}
              label="Site logo"
            />
            <div className="cms-design-colors">
              <label className="cms-field">
                <span>Header background</span>
                <input
                  type="color"
                  value={settings.header_background_color}
                  onChange={event => setSettings(current => ({ ...current, header_background_color: event.target.value }))}
                />
              </label>
              <label className="cms-field">
                <span>Header text</span>
                <input
                  type="color"
                  value={settings.header_text_color}
                  onChange={event => setSettings(current => ({ ...current, header_text_color: event.target.value }))}
                />
              </label>
              <label className="cms-field">
                <span>Button accent</span>
                <input
                  type="color"
                  value={settings.header_accent_color}
                  onChange={event => setSettings(current => ({ ...current, header_accent_color: event.target.value }))}
                />
              </label>
            </div>
            <button type="submit" className="btn-primary" disabled={savingSettings}>
              {savingSettings ? 'Saving...' : 'Save header design'}
            </button>
          </form>

          <div className="cms-manager-heading cms-navigation-heading">
            <div>
              <h3>Main navigation links</h3>
              <p>Choose an existing page or add a safe external link. Change display order to rearrange the menu.</p>
            </div>
            <button type="button" className="btn-primary" onClick={startNewNavigationItem}>Add link</button>
          </div>

          <div className="cms-manager-layout">
            <div className="cms-item-list" aria-label="Main navigation links">
              {navigationItems.length ? navigationItems.map(item => (
                <article className={`cms-item ${editingId === item.id ? 'is-selected' : ''}`} key={item.id}>
                  <button type="button" className="cms-item-select" onClick={() => startEditingNavigationItem(item)}>
                    <span className="cms-item-title">{item.label}</span>
                    <span className="cms-item-meta">
                      {item.page_slug
                        ? pages.find(page => page.slug === item.page_slug)?.title ?? item.page_slug
                        : item.href}
                      {' · Order '}{item.sort_order}
                      {' · '}{item.is_published ? 'Visible' : 'Hidden'}
                    </span>
                  </button>
                  <button type="button" className="cms-item-delete" onClick={() => deleteNavigationItem(item)}>Remove</button>
                </article>
              )) : <p>No links are in the main navigation yet.</p>}
            </div>

            <form className="cms-editor-card" onSubmit={saveNavigationItem}>
              <h3>{editingId ? 'Edit navigation link' : 'Add navigation link'}</h3>
              <label className="cms-field">
                <span>Link label</span>
                <input
                  value={form.label}
                  onChange={event => updateNavigationForm('label', event.target.value)}
                  maxLength={60}
                  required
                />
              </label>
              <label className="cms-field">
                <span>Link to a page</span>
                <select
                  value={form.page_slug}
                  onChange={event => updateNavigationForm('page_slug', event.target.value)}
                >
                  <option value="">Custom website URL</option>
                  {pages.map(page => {
                    const alreadyLinked = navigationItems.some(item =>
                      item.id !== editingId && item.page_slug === page.slug
                    )
                    return (
                      <option key={page.slug} value={page.slug} disabled={alreadyLinked}>
                        {page.title}{alreadyLinked ? ' (already linked)' : page.is_published ? '' : ' (Draft)'}
                      </option>
                    )
                  })}
                </select>
              </label>
              {!form.page_slug && (
                <label className="cms-field">
                  <span>Website URL</span>
                  <input
                    value={form.href}
                    onChange={event => updateNavigationForm('href', event.target.value)}
                    maxLength={500}
                    placeholder="/reservation or https://example.com"
                    required
                  />
                </label>
              )}
              <label className="cms-field">
                <span>Display order</span>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={event => updateNavigationForm('sort_order', event.target.value)}
                  min={0}
                  max={10000}
                  required
                />
              </label>
              <label className="cms-checkbox-field">
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={event => updateNavigationForm('is_published', event.target.checked)}
                />
                <span>Show this link in the navbar</span>
              </label>
              <div className="cms-form-actions">
                <button type="submit" className="btn-primary" disabled={savingNavigation}>
                  {savingNavigation ? 'Saving...' : 'Save navigation link'}
                </button>
                {editingId && (
                  <button type="button" className="btn-secondary" onClick={startNewNavigationItem}>
                    Cancel edit
                  </button>
                )}
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
