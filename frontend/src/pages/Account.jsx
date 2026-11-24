import React, { useEffect, useState } from 'react'
import { supabase } from '../utils/supabase'

const initialForm = { fullName: '', email: '', password: '', confirmPassword: '' }
const initialFeedback = {
  customer: { message: '', error: '' },
  admin: { message: '', error: '' },
}

export default function Account() {
  const [customerMode, setCustomerMode] = useState('signin')
  const [adminMode, setAdminMode] = useState('signin')
  const [customerForm, setCustomerForm] = useState(initialForm)
  const [adminForm, setAdminForm] = useState(initialForm)
  const [feedback, setFeedback] = useState(initialFeedback)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [submitting, setSubmitting] = useState('')
  const [sessionMessage, setSessionMessage] = useState('')
  const [sessionError, setSessionError] = useState('')
  const [profileError, setProfileError] = useState('')

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) {
        console.error('Loading the authentication session failed:', error)
        setSessionError(error.message)
      } else {
        setUser(data.session?.user ?? null)
      }
      setLoadingSession(false)
    }).catch(error => {
      if (!active) return
      console.error('Loading the authentication session failed:', error)
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
        console.error('Loading the account profile failed:', error)
        setProfileError(error.message || 'Account details could not be loaded.')
      }
    }

    loadProfile()
    return () => { active = false }
  }, [user])

  function updateForm(type, field, value) {
    const setForm = type === 'admin' ? setAdminForm : setCustomerForm
    setForm(current => ({ ...current, [field]: value }))
  }

  function updateFeedback(type, field, value) {
    setFeedback(current => ({
      ...current,
      [type]: { ...current[type], [field]: value },
    }))
  }

  function changeMode(type, mode) {
    const setMode = type === 'admin' ? setAdminMode : setCustomerMode
    setMode(mode)
    setFeedback(current => ({ ...current, [type]: { message: '', error: '' } }))
  }

  async function onSubmit(event, type) {
    event.preventDefault()
    const mode = type === 'admin' ? adminMode : customerMode
    const form = type === 'admin' ? adminForm : customerForm

    if (mode === 'signup' && form.password !== form.confirmPassword) {
      updateFeedback(type, 'error', 'Passwords do not match.')
      return
    }

    setSubmitting(type)
    setSessionMessage('')
    setSessionError('')
    updateFeedback(type, 'message', '')
    updateFeedback(type, 'error', '')

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: {
            data: {
              full_name: form.fullName.trim(),
              ...(type === 'admin' ? { requested_role: 'admin' } : {}),
            },
          },
        })
        if (error) throw error
        if (!data.user) throw new Error('Sign-up did not return an account. Please try again.')

        if (data.session) {
          setUser(data.user)
          setSessionMessage(type === 'admin'
            ? 'Your account was created. Admin access remains pending until the site owner reviews your request.'
            : 'Your customer account has been created.')
        } else {
          updateFeedback(
            type,
            'message',
            type === 'admin'
              ? 'If this email can be registered, a confirmation link will be sent. Admin access remains pending until the site owner reviews your request.'
              : 'If this email can be registered, a confirmation link will be sent. Check your inbox to finish creating your account.'
          )
        }

        const setForm = type === 'admin' ? setAdminForm : setCustomerForm
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
        const setForm = type === 'admin' ? setAdminForm : setCustomerForm
        setForm(current => ({ ...current, password: '' }))
      }
    } catch (error) {
      console.error(`${type === 'admin' ? 'Admin' : 'Customer'} account request failed:`, error)
      updateFeedback(type, 'error', error.message || 'The account request failed. Please try again.')
    } finally {
      setSubmitting('')
    }
  }

  async function onSignOut() {
    setSubmitting('signout')
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
      setSubmitting('')
    }
  }

  return (
    <section className="account-section">
      <header className="account-page-header">
        <p className="page-eyebrow">Account access</p>
        <h1>{user ? 'Account details' : 'Choose your account type'}</h1>
      </header>

      {loadingSession ? (
        <p role="status">Checking your account...</p>
      ) : user ? (
        <div className="account-card account-signed-in">
          <p className="account-email">{user.email}</p>
          {profile ? (
            <>
              <p className="account-role">
                {profile.full_name ? `${profile.full_name} · ` : ''}
                {profile.role === 'admin'
                  ? 'Administrator'
                  : user.user_metadata?.requested_role === 'admin'
                    ? 'Admin access pending'
                    : 'Customer'}
              </p>
              {profile.role !== 'admin' && user.user_metadata?.requested_role === 'admin' && (
                <p className="account-admin-note">
                  Your account does not have admin privileges until the site owner approves the request.
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
          <button type="button" className="btn-secondary account-submit" onClick={onSignOut} disabled={submitting !== ''}>
            {submitting === 'signout' ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      ) : (
        <>
          {sessionError && <p className="account-message account-message--error" role="alert">{sessionError}</p>}
          {sessionMessage && <p className="account-message" role="status">{sessionMessage}</p>}
          <div className="account-grid">
            <article className="account-card">
              <p className="account-panel-eyebrow">Customer</p>
              <h2>Customer account</h2>
              <p className="account-panel-intro">Create an account or sign in to your customer account.</p>
              <div className="account-mode-toggle" role="group" aria-label="Customer account action">
                <button
                  type="button"
                  aria-pressed={customerMode === 'signin'}
                  className={customerMode === 'signin' ? 'is-active' : ''}
                  onClick={() => changeMode('customer', 'signin')}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  aria-pressed={customerMode === 'signup'}
                  className={customerMode === 'signup' ? 'is-active' : ''}
                  onClick={() => changeMode('customer', 'signup')}
                >
                  Sign up
                </button>
              </div>
              <form className="account-form" onSubmit={event => onSubmit(event, 'customer')}>
                {customerMode === 'signup' && (
                  <label className="account-field">
                    <span>Full name</span>
                    <input
                      type="text"
                      name="customer-name"
                      autoComplete="name"
                      value={customerForm.fullName}
                      onChange={event => updateForm('customer', 'fullName', event.target.value)}
                      maxLength={120}
                      required
                    />
                  </label>
                )}
                <label className="account-field">
                  <span>Email</span>
                  <input
                    type="email"
                    name="customer-email"
                    autoComplete="email"
                    value={customerForm.email}
                    onChange={event => updateForm('customer', 'email', event.target.value)}
                    required
                  />
                </label>
                <label className="account-field">
                  <span>Password</span>
                  <input
                    type="password"
                    name="customer-password"
                    autoComplete={customerMode === 'signup' ? 'new-password' : 'current-password'}
                    value={customerForm.password}
                    onChange={event => updateForm('customer', 'password', event.target.value)}
                    minLength={customerMode === 'signup' ? 8 : undefined}
                    required
                  />
                  {customerMode === 'signup' && <span className="account-hint">Use at least 8 characters.</span>}
                </label>
                {customerMode === 'signup' && (
                  <label className="account-field">
                    <span>Confirm password</span>
                    <input
                      type="password"
                      name="customer-confirm-password"
                      autoComplete="new-password"
                      value={customerForm.confirmPassword}
                      onChange={event => updateForm('customer', 'confirmPassword', event.target.value)}
                      minLength={8}
                      required
                    />
                  </label>
                )}
                {feedback.customer.message && <p className="account-message" role="status">{feedback.customer.message}</p>}
                {feedback.customer.error && <p className="account-message account-message--error" role="alert">{feedback.customer.error}</p>}
                <button type="submit" className="btn-primary account-submit" disabled={submitting !== ''}>
                  {submitting === 'customer' ? 'Please wait...' : customerMode === 'signup' ? 'Create customer account' : 'Sign in as customer'}
                </button>
              </form>
            </article>

            <article className="account-card account-card--admin">
              <p className="account-panel-eyebrow">Administrator</p>
              <h2>Admin account</h2>
              <p className="account-panel-intro">Use the separate admin form to request or access an administrator account.</p>
              <div className="account-mode-toggle" role="group" aria-label="Admin account action">
                <button
                  type="button"
                  aria-pressed={adminMode === 'signin'}
                  className={adminMode === 'signin' ? 'is-active' : ''}
                  onClick={() => changeMode('admin', 'signin')}
                >
                  Admin sign in
                </button>
                <button
                  type="button"
                  aria-pressed={adminMode === 'signup'}
                  className={adminMode === 'signup' ? 'is-active' : ''}
                  onClick={() => changeMode('admin', 'signup')}
                >
                  Admin sign up
                </button>
              </div>
              <form className="account-form" onSubmit={event => onSubmit(event, 'admin')}>
                {adminMode === 'signup' && (
                  <label className="account-field">
                    <span>Full name</span>
                    <input
                      type="text"
                      name="admin-name"
                      autoComplete="name"
                      value={adminForm.fullName}
                      onChange={event => updateForm('admin', 'fullName', event.target.value)}
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
                    value={adminForm.email}
                    onChange={event => updateForm('admin', 'email', event.target.value)}
                    required
                  />
                </label>
                <label className="account-field">
                  <span>Password</span>
                  <input
                    type="password"
                    name="admin-password"
                    autoComplete={adminMode === 'signup' ? 'new-password' : 'current-password'}
                    value={adminForm.password}
                    onChange={event => updateForm('admin', 'password', event.target.value)}
                    minLength={adminMode === 'signup' ? 8 : undefined}
                    required
                  />
                  {adminMode === 'signup' && <span className="account-hint">Use at least 8 characters.</span>}
                </label>
                {adminMode === 'signup' && (
                  <label className="account-field">
                    <span>Confirm password</span>
                    <input
                      type="password"
                      name="admin-confirm-password"
                      autoComplete="new-password"
                      value={adminForm.confirmPassword}
                      onChange={event => updateForm('admin', 'confirmPassword', event.target.value)}
                      minLength={8}
                      required
                    />
                  </label>
                )}
                {feedback.admin.message && <p className="account-message" role="status">{feedback.admin.message}</p>}
                {feedback.admin.error && <p className="account-message account-message--error" role="alert">{feedback.admin.error}</p>}
                <button type="submit" className="btn-primary account-submit" disabled={submitting !== ''}>
                  {submitting === 'admin' ? 'Please wait...' : adminMode === 'signup' ? 'Request admin account' : 'Sign in as admin'}
                </button>
              </form>
              <p className="account-admin-note">
                Admin sign-up creates an account request; it does not grant admin privileges. The site owner must review and approve access.
              </p>
            </article>
          </div>
        </>
      )}
    </section>
  )
}
