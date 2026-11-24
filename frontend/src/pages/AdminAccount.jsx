import React, { useEffect, useState } from 'react'
import { supabase } from '../utils/supabase'

const initialForm = { fullName: '', email: '', password: '', confirmPassword: '' }

export default function AdminAccount() {
  const [mode, setMode] = useState('signin')
  const [form, setForm] = useState(initialForm)
  const [feedback, setFeedback] = useState({ message: '', error: '' })
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [sessionMessage, setSessionMessage] = useState('')
  const [sessionError, setSessionError] = useState('')
  const [profileError, setProfileError] = useState('')

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) {
        console.error('Loading the admin session failed:', error)
        setSessionError(error.message)
      } else {
        setUser(data.session?.user ?? null)
      }
      setLoadingSession(false)
    }).catch(error => {
      if (!active) return
      console.error('Loading the admin session failed:', error)
      setSessionError(error.message || 'Your account session could not be loaded.')
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
      setProfile(null)
      setProfileError('')
      return
    }

    let active = true

    async function loadProfile() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', user.id)
          .maybeSingle()

        if (error) throw error
        if (!active) return
        if (!data) {
          setProfileError('No account profile was found. Ask the site owner to apply the latest database schema.')
          return
        }

        setProfile(data)
        setProfileError('')
      } catch (error) {
        if (!active) return
        console.error('Loading the admin profile failed:', error)
        setProfileError(error.message || 'Account details could not be loaded.')
      }
    }

    loadProfile()
    return () => { active = false }
  }, [user])

  function updateForm(field, value) {
    setForm(current => ({ ...current, [field]: value }))
  }

  function changeMode(nextMode) {
    setMode(nextMode)
    setFeedback({ message: '', error: '' })
  }

  async function onSubmit(event) {
    event.preventDefault()
    if (mode === 'signup' && form.password !== form.confirmPassword) {
      setFeedback({ message: '', error: 'Passwords do not match.' })
      return
    }

    setSubmitting(true)
    setSessionMessage('')
    setSessionError('')
    setFeedback({ message: '', error: '' })

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: {
            data: {
              full_name: form.fullName.trim(),
              requested_role: 'admin',
            },
          },
        })
        if (error) throw error
        if (!data.user) throw new Error('Sign-up did not return an account. Please try again.')

        if (data.session) {
          setUser(data.user)
          setSessionMessage('Your account was created. Admin access remains pending until the site owner reviews your request.')
        } else {
          setFeedback({
            message: 'If this email can be registered, a confirmation link will be sent. Admin access remains pending until the site owner reviews your request.',
            error: '',
          })
        }
        setForm(current => ({ ...current, password: '', confirmPassword: '' }))
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.password,
        })
        if (error) throw error
        if (!data.user) throw new Error('Sign-in did not return an account. Please try again.')

        setUser(data.user)
        setSessionMessage('You are signed in.')
        setForm(current => ({ ...current, password: '' }))
      }
    } catch (error) {
      console.error('Admin account request failed:', error)
      setFeedback({ message: '', error: error.message || 'The account request failed. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  async function onSignOut() {
    setSubmitting(true)
    setSessionMessage('')
    setSessionError('')
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
      setProfile(null)
      setSessionMessage('You are signed out.')
    } catch (error) {
      console.error('Signing out failed:', error)
      setSessionError(error.message || 'Sign-out failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const isAdmin = profile?.role === 'admin'
  const hasAdminRequest = user?.user_metadata?.requested_role === 'admin'

  return (
    <section className="account-section">
      <header className="account-page-header">
        <p className="page-eyebrow">Admin access</p>
        <h1>{user ? 'Admin account' : 'Admin sign in or request access'}</h1>
      </header>

      {loadingSession ? (
        <p role="status">Checking your account...</p>
      ) : user ? (
        <div className="account-card account-card--admin account-signed-in">
          <p className="account-email">{user.email}</p>
          {profile ? (
            <>
              <p className="account-role">
                {profile.full_name ? `${profile.full_name} · ` : ''}
                {isAdmin ? 'Administrator' : hasAdminRequest ? 'Admin access pending' : 'No admin access'}
              </p>
              {!isAdmin && (
                <p className="account-admin-note">
                  Admin privileges are granted manually by the site owner. This account cannot access admin tools until approved.
                </p>
              )}
            </>
          ) : profileError ? (
            <p className="account-message account-message--error" role="alert">{profileError}</p>
          ) : (
            <p role="status">Loading account details...</p>
          )}
          {sessionMessage && <p className="account-message" role="status">{sessionMessage}</p>}
          {sessionError && <p className="account-message account-message--error" role="alert">{sessionError}</p>}
          <button type="button" className="btn-secondary account-submit" onClick={onSignOut} disabled={submitting}>
            {submitting ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      ) : (
        <article className="account-card account-card--admin">
          {sessionError && <p className="account-message account-message--error" role="alert">{sessionError}</p>}
          {sessionMessage && <p className="account-message" role="status">{sessionMessage}</p>}
          <div className="account-mode-toggle" role="group" aria-label="Admin account action">
            <button
              type="button"
              aria-pressed={mode === 'signin'}
              className={mode === 'signin' ? 'is-active' : ''}
              onClick={() => changeMode('signin')}
            >
              Admin sign in
            </button>
            <button
              type="button"
              aria-pressed={mode === 'signup'}
              className={mode === 'signup' ? 'is-active' : ''}
              onClick={() => changeMode('signup')}
            >
              Admin sign up
            </button>
          </div>
          <form className="account-form" onSubmit={onSubmit}>
            {mode === 'signup' && (
              <label className="account-field">
                <span>Full name</span>
                <input
                  type="text"
                  name="admin-name"
                  autoComplete="name"
                  value={form.fullName}
                  onChange={event => updateForm('fullName', event.target.value)}
                  maxLength={120}
                  required
                />
              </label>
            )}
            <label className="account-field">
              <span>Email</span>
              <input
                type="email"
                name="admin-email"
                autoComplete="email"
                value={form.email}
                onChange={event => updateForm('email', event.target.value)}
                required
              />
            </label>
            <label className="account-field">
              <span>Password</span>
              <input
                type="password"
                name="admin-password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                value={form.password}
                onChange={event => updateForm('password', event.target.value)}
                minLength={mode === 'signup' ? 8 : undefined}
                required
              />
              {mode === 'signup' && <span className="account-hint">Use at least 8 characters.</span>}
            </label>
            {mode === 'signup' && (
              <label className="account-field">
                <span>Confirm password</span>
                <input
                  type="password"
                  name="admin-confirm-password"
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={event => updateForm('confirmPassword', event.target.value)}
                  minLength={8}
                  required
                />
              </label>
            )}
            {feedback.message && <p className="account-message" role="status">{feedback.message}</p>}
            {feedback.error && <p className="account-message account-message--error" role="alert">{feedback.error}</p>}
            <button type="submit" className="btn-primary account-submit" disabled={submitting}>
              {submitting ? 'Please wait...' : mode === 'signup' ? 'Request admin account' : 'Sign in as admin'}
            </button>
          </form>
          <p className="account-admin-note">
            Admin sign-up creates an account request; it does not grant admin privileges. The site owner must review and approve access.
          </p>
        </article>
      )}
    </section>
  )
}
