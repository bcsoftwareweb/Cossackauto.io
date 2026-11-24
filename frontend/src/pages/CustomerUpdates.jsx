import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSiteImageUrl } from '../components/SiteContent'
import { supabase } from '../utils/supabase'

export default function CustomerUpdates() {
  const [user, setUser] = useState(null)
  const [updates, setUpdates] = useState([])
  const [loadingSession, setLoadingSession] = useState(true)
  const [loadingUpdates, setLoadingUpdates] = useState(false)
  const [sessionError, setSessionError] = useState('')
  const [updatesError, setUpdatesError] = useState('')

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) {
        console.error('Loading updates session failed:', error)
        setSessionError(error.message || 'Your sign-in status could not be checked.')
      } else {
        setUser(data.session?.user ?? null)
      }
      setLoadingSession(false)
    }).catch(error => {
      if (!active) return
      console.error('Loading updates session failed:', error)
      setSessionError(error.message || 'Your sign-in status could not be checked.')
      setLoadingSession(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setUser(session?.user ?? null)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!user) {
      setUpdates([])
      setUpdatesError('')
      setLoadingUpdates(false)
      return
    }

    let active = true
    setLoadingUpdates(true)
    setUpdatesError('')

    async function loadUpdates() {
      try {
        const { data, error } = await supabase
          .from('customer_updates')
          .select('id, title, body, image_path, created_at')
          .eq('is_published', true)
          .order('created_at', { ascending: false })
        if (error) throw error
        if (active) setUpdates(data ?? [])
      } catch (error) {
        console.error('Loading customer updates failed:', error)
        if (active) setUpdatesError(error.message || 'Customer updates could not be loaded.')
      } finally {
        if (active) setLoadingUpdates(false)
      }
    }

    loadUpdates()
    return () => { active = false }
  }, [user])

  return (
    <section className="customer-updates-section">
      <div className="max-w-4xl mx-auto px-4">
        <header className="page-header">
          <p className="page-eyebrow">From the shop</p>
          <h1>Customer updates</h1>
          <p className="page-header-lead">News and updates from Cossack Auto Solutions.</p>
        </header>

        {loadingSession ? (
          <p className="cms-status" role="status">Checking your sign-in...</p>
        ) : sessionError ? (
          <p className="account-message account-message--error" role="alert">{sessionError}</p>
        ) : !user ? (
          <div className="cms-empty-state">
            <p>Sign in to your account to read customer updates.</p>
            <Link to="/account" className="btn-primary">Sign in</Link>
          </div>
        ) : loadingUpdates ? (
          <p className="cms-status" role="status">Loading updates...</p>
        ) : updatesError ? (
          <p className="account-message account-message--error" role="alert">{updatesError}</p>
        ) : updates.length ? (
          <div className="customer-updates-list">
            {updates.map(update => {
              const imageUrl = getSiteImageUrl(update.image_path)
              return (
                <article className="customer-update-card" key={update.id}>
                  {imageUrl && <img src={imageUrl} alt="" />}
                  <div className="customer-update-content">
                    <p className="customer-update-date">
                      {new Date(update.created_at).toLocaleDateString()}
                    </p>
                    <h2>{update.title}</h2>
                    <p className="cms-section-body">{update.body}</p>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="cms-empty-state">
            <p>There are no updates yet. Check back later.</p>
          </div>
        )}
      </div>
    </section>
  )
}
