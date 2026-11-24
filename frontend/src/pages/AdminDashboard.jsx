import React, { useEffect, useState } from 'react'
import { getSiteImageUrl, SITE_PAGES } from '../components/SiteContent'
import { uploadSiteImage } from '../utils/cms'
import { supabase } from '../utils/supabase'

const EMPTY_SECTION = {
  page_slug: 'home',
  section_type: 'content',
  eyebrow: '',
  title: '',
  body: '',
  image_path: '',
  button_label: '',
  button_url: '',
  sort_order: 100,
  is_published: false,
}

const EMPTY_UPDATE = {
  title: '',
  body: '',
  image_path: '',
  is_published: false,
}

function ImageUploadField({ userId, value, onChange, label }) {
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

function SiteSectionManager({ user }) {
  const [sections, setSections] = useState([])
  const [form, setForm] = useState(EMPTY_SECTION)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [formError, setFormError] = useState('')
  const [message, setMessage] = useState('')
  const [servicesExpanded, setServicesExpanded] = useState(false)

  async function loadSections() {
    setLoading(true)
    setLoadError('')
    try {
      const { data, error } = await supabase
        .from('site_sections')
        .select('id, page_slug, section_key, section_type, eyebrow, title, body, image_path, button_label, button_url, sort_order, is_published, updated_at')
        .order('page_slug', { ascending: true })
        .order('sort_order', { ascending: true })

      if (error) throw error
      setSections(data ?? [])
    } catch (error) {
      console.error('Loading site sections failed:', error)
      setLoadError(error.message || 'Website sections could not be loaded.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadSections() }, [])

  function startNewSection() {
    setEditingId(null)
    setForm({ ...EMPTY_SECTION })
    setFormError('')
    setMessage('')
  }

  function startEditing(section) {
    setEditingId(section.id)
    setForm({
      ...EMPTY_SECTION,
      ...section,
      image_path: section.image_path ?? '',
      button_label: section.button_label ?? '',
      button_url: section.button_url ?? '',
    })
    setFormError('')
    setMessage('')
  }

  function updateForm(field, value) {
    setForm(current => {
      const next = { ...current, [field]: value }
      if (field === 'page_slug' && value !== 'services' && next.section_type === 'service') {
        next.section_type = 'content'
      }
      return next
    })
  }

  async function saveSection(event) {
    event.preventDefault()
    setSaving(true)
    setFormError('')
    setMessage('')

    const payload = {
      page_slug: form.page_slug,
      eyebrow: form.eyebrow.trim(),
      title: form.title.trim(),
      body: form.body.trim(),
      image_path: form.image_path || null,
      button_label: form.button_label.trim() || null,
      button_url: form.button_url.trim() || null,
      sort_order: Number(form.sort_order),
      is_published: Boolean(form.is_published),
    }

    try {
      let result
      if (editingId) {
        result = await supabase
          .from('site_sections')
          .update(payload)
          .eq('id', editingId)
          .select()
          .single()
      } else {
        result = await supabase
          .from('site_sections')
          .insert({ ...payload, section_type: form.section_type })
          .select()
          .single()
      }

      if (result.error) throw result.error
      setEditingId(result.data.id)
      setForm(current => ({ ...current, ...result.data, image_path: result.data.image_path ?? '' }))
      setMessage('Section saved.')
      await loadSections()
    } catch (error) {
      console.error('Saving site section failed:', error)
      setFormError(error.message || 'The section could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteSection(section) {
    if (!window.confirm(`Delete "${section.title || 'this section'}"?`)) return

    setFormError('')
    setMessage('')
    try {
      const { error } = await supabase.from('site_sections').delete().eq('id', section.id)
      if (error) throw error
      if (editingId === section.id) startNewSection()
      setMessage('Section deleted.')
      await loadSections()
    } catch (error) {
      console.error('Deleting site section failed:', error)
      setFormError(error.message || 'The section could not be deleted.')
    }
  }

  function renderSectionItem(section) {
    return (
      <article className={`cms-item ${editingId === section.id ? 'is-selected' : ''}`} key={section.id}>
        <button type="button" className="cms-item-select" onClick={() => startEditing(section)}>
          <span className="cms-item-title">
            {section.page_slug === 'services' && section.section_type === 'intro'
              ? 'Services page introduction'
              : section.title || 'Untitled section'}
          </span>
          <span className="cms-item-meta">
            {SITE_PAGES.find(page => page.value === section.page_slug)?.label ?? section.page_slug}
            {' · '}{section.section_type}
            {' · '}{section.is_published ? 'Published' : 'Draft'}
          </span>
        </button>
        {!['hero', 'intro', 'profile'].includes(section.section_type) && (
          <button type="button" className="cms-item-delete" onClick={() => deleteSection(section)}>
            Delete
          </button>
        )}
      </article>
    )
  }

  const servicePageSections = sections.filter(section => section.page_slug === 'services')
  const serviceCount = servicePageSections.filter(section => section.section_type === 'service').length

  return (
    <div className="cms-manager">
      <div className="cms-manager-heading">
        <div>
          <h2>Website content</h2>
          <p>Edit page headings and service cards, or add a new text and image section.</p>
        </div>
        <button type="button" className="btn-primary" onClick={startNewSection}>Add section</button>
      </div>

      {loadError && <p className="account-message account-message--error" role="alert">{loadError}</p>}
      {formError && <p className="account-message account-message--error" role="alert">{formError}</p>}
      {message && <p className="account-message" role="status">{message}</p>}

      <div className="cms-manager-layout">
        <div className="cms-item-list" aria-label="Existing website sections">
          {loading ? (
            <p role="status">Loading sections...</p>
          ) : sections.length ? (
            <>
              {sections.filter(section => section.page_slug !== 'services').map(renderSectionItem)}
              {servicePageSections.length > 0 && (
                <div className="cms-service-group">
                  <button
                    type="button"
                    className="cms-service-group-toggle"
                    aria-expanded={servicesExpanded}
                    onClick={() => setServicesExpanded(expanded => !expanded)}
                  >
                    <span className="cms-service-group-heading">
                      <span className="cms-item-title">Services</span>
                      <span className="cms-item-meta">
                        {serviceCount} {serviceCount === 1 ? 'service card' : 'service cards'}
                      </span>
                    </span>
                    <span className="cms-service-group-chevron" aria-hidden="true" />
                  </button>
                  {servicesExpanded && (
                    <div className="cms-service-group-items" id="cms-services-sections">
                      {servicePageSections.map(renderSectionItem)}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <p>No website sections exist yet.</p>
          )}
        </div>

        <form className="cms-editor-card" onSubmit={saveSection}>
          <h3>{editingId ? 'Edit section' : 'Add a section'}</h3>
          <label className="cms-field">
            <span>Page</span>
            <select value={form.page_slug} onChange={event => updateForm('page_slug', event.target.value)} disabled={Boolean(editingId)}>
              {SITE_PAGES.map(page => <option key={page.value} value={page.value}>{page.label}</option>)}
            </select>
          </label>
          {editingId ? (
            <p className="cms-field-hint">Section type: {form.section_type}</p>
          ) : (
            <label className="cms-field">
              <span>Section type</span>
              <select value={form.section_type} onChange={event => updateForm('section_type', event.target.value)}>
                <option value="content">Text and image</option>
                {form.page_slug === 'services' && <option value="service">Service card</option>}
              </select>
            </label>
          )}
          <label className="cms-field">
            <span>Small heading</span>
            <input value={form.eyebrow} onChange={event => updateForm('eyebrow', event.target.value)} maxLength={120} />
          </label>
          <label className="cms-field">
            <span>Title</span>
            <input value={form.title} onChange={event => updateForm('title', event.target.value)} maxLength={180} required />
          </label>
          <label className="cms-field">
            <span>Text</span>
            <textarea value={form.body} onChange={event => updateForm('body', event.target.value)} rows={6} maxLength={10000} />
          </label>
          <ImageUploadField
            userId={user.id}
            value={form.image_path}
            onChange={imagePath => updateForm('image_path', imagePath)}
            label="Section image"
          />
          <label className="cms-field">
            <span>Button text (optional)</span>
            <input value={form.button_label} onChange={event => updateForm('button_label', event.target.value)} maxLength={80} />
          </label>
          <label className="cms-field">
            <span>Button link (optional)</span>
            <input value={form.button_url} onChange={event => updateForm('button_url', event.target.value)} maxLength={500} placeholder="/reservation or https://example.com" />
          </label>
          <label className="cms-field">
            <span>Display order</span>
            <input type="number" value={form.sort_order} onChange={event => updateForm('sort_order', event.target.value)} min={0} max={10000} required />
          </label>
          <label className="cms-checkbox-field">
            <input type="checkbox" checked={form.is_published} onChange={event => updateForm('is_published', event.target.checked)} />
            <span>Published on the website</span>
          </label>
          <div className="cms-form-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save section'}
            </button>
            {editingId && <button type="button" className="btn-secondary" onClick={startNewSection}>Cancel edit</button>}
          </div>
        </form>
      </div>
    </div>
  )
}

function CustomerUpdateManager({ user }) {
  const [updates, setUpdates] = useState([])
  const [form, setForm] = useState({ ...EMPTY_UPDATE })
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [formError, setFormError] = useState('')
  const [message, setMessage] = useState('')

  async function loadUpdates() {
    setLoading(true)
    setLoadError('')
    try {
      const { data, error } = await supabase
        .from('customer_updates')
        .select('id, title, body, image_path, is_published, created_at, updated_at')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUpdates(data ?? [])
    } catch (error) {
      console.error('Loading customer updates failed:', error)
      setLoadError(error.message || 'Customer updates could not be loaded.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadUpdates() }, [])

  function startNewUpdate() {
    setEditingId(null)
    setForm({ ...EMPTY_UPDATE })
    setFormError('')
    setMessage('')
  }

  function startEditing(update) {
    setEditingId(update.id)
    setForm({ ...EMPTY_UPDATE, ...update, image_path: update.image_path ?? '' })
    setFormError('')
    setMessage('')
  }

  function updateForm(field, value) {
    setForm(current => ({ ...current, [field]: value }))
  }

  async function saveUpdate(event) {
    event.preventDefault()
    setSaving(true)
    setFormError('')
    setMessage('')

    const payload = {
      title: form.title.trim(),
      body: form.body.trim(),
      image_path: form.image_path || null,
      is_published: Boolean(form.is_published),
    }

    try {
      let result
      if (editingId) {
        result = await supabase.from('customer_updates').update(payload).eq('id', editingId).select().single()
      } else {
        result = await supabase.from('customer_updates').insert(payload).select().single()
      }
      if (result.error) throw result.error

      setEditingId(result.data.id)
      setForm({ ...EMPTY_UPDATE, ...result.data, image_path: result.data.image_path ?? '' })
      setMessage('Update saved.')
      await loadUpdates()
    } catch (error) {
      console.error('Saving customer update failed:', error)
      setFormError(error.message || 'The update could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteUpdate(update) {
    if (!window.confirm(`Delete "${update.title}"?`)) return

    setFormError('')
    setMessage('')
    try {
      const { error } = await supabase.from('customer_updates').delete().eq('id', update.id)
      if (error) throw error
      if (editingId === update.id) startNewUpdate()
      setMessage('Update deleted.')
      await loadUpdates()
    } catch (error) {
      console.error('Deleting customer update failed:', error)
      setFormError(error.message || 'The update could not be deleted.')
    }
  }

  return (
    <div className="cms-manager">
      <div className="cms-manager-heading">
        <div>
          <h2>Customer updates</h2>
          <p>Published updates are visible only to signed-in customers.</p>
        </div>
        <button type="button" className="btn-primary" onClick={startNewUpdate}>Write an update</button>
      </div>

      {loadError && <p className="account-message account-message--error" role="alert">{loadError}</p>}
      {formError && <p className="account-message account-message--error" role="alert">{formError}</p>}
      {message && <p className="account-message" role="status">{message}</p>}

      <div className="cms-manager-layout">
        <div className="cms-item-list" aria-label="Existing customer updates">
          {loading ? (
            <p role="status">Loading updates...</p>
          ) : updates.length ? updates.map(update => (
            <article className={`cms-item ${editingId === update.id ? 'is-selected' : ''}`} key={update.id}>
              <button type="button" className="cms-item-select" onClick={() => startEditing(update)}>
                <span className="cms-item-title">{update.title}</span>
                <span className="cms-item-meta">{update.is_published ? 'Published' : 'Draft'}</span>
              </button>
              <button type="button" className="cms-item-delete" onClick={() => deleteUpdate(update)}>Delete</button>
            </article>
          )) : (
            <p>No customer updates yet.</p>
          )}
        </div>

        <form className="cms-editor-card" onSubmit={saveUpdate}>
          <h3>{editingId ? 'Edit update' : 'Write an update'}</h3>
          <label className="cms-field">
            <span>Title</span>
            <input value={form.title} onChange={event => updateForm('title', event.target.value)} maxLength={180} required />
          </label>
          <label className="cms-field">
            <span>Message</span>
            <textarea value={form.body} onChange={event => updateForm('body', event.target.value)} rows={8} maxLength={10000} required />
          </label>
          <ImageUploadField
            userId={user.id}
            value={form.image_path}
            onChange={imagePath => updateForm('image_path', imagePath)}
            label="Optional image"
          />
          <label className="cms-checkbox-field">
            <input type="checkbox" checked={form.is_published} onChange={event => updateForm('is_published', event.target.checked)} />
            <span>Publish for signed-in customers</span>
          </label>
          <div className="cms-form-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save update'}
            </button>
            {editingId && <button type="button" className="btn-secondary" onClick={startNewUpdate}>Cancel edit</button>}
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminDashboard({ user, onSignOut }) {
  const [tab, setTab] = useState('content')

  return (
    <section className="cms-admin-section">
      <header className="cms-admin-header">
        <div>
          <p className="page-eyebrow">Admin dashboard</p>
          <h1>Manage your website</h1>
          <p>{user.email}</p>
        </div>
        <button type="button" className="btn-secondary" onClick={onSignOut}>Sign out</button>
      </header>

      <div className="cms-dashboard-layout">
        <nav className="cms-sidebar" aria-label="Dashboard navigation">
          <button type="button" aria-current={tab === 'content' ? 'page' : undefined} className={tab === 'content' ? 'is-active' : ''} onClick={() => setTab('content')}>
            Manage Content
          </button>
          <button type="button" aria-current={tab === 'updates' ? 'page' : undefined} className={tab === 'updates' ? 'is-active' : ''} onClick={() => setTab('updates')}>
            Customer Updates
          </button>
        </nav>

        <div className="cms-dashboard-main">
          {tab === 'content'
            ? <SiteSectionManager user={user} />
            : <CustomerUpdateManager user={user} />}
        </div>
      </div>
    </section>
  )
}
