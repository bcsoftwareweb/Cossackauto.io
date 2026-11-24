import React, { useEffect, useState } from 'react'
import { supabase } from '../utils/supabase'

export default function Account() {
  const [mode, setMode] = useState('signin')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [profileError, setProfileError] = useState('')

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) {
        console.error('Loading the authentication session failed:', error)
        setErrorMessage(error.message)
      } else {
        setUser(data.session?.user ?? null)
      }
      setLoadingSession(false)
    }).catch(error => {
      if (!active) return
      console.error('Loading the authentication session failed:', error)
      setErrorMessage(error.message || 'Your account session could not be loaded.')
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

  async function onSubmit(event) {
    event.preventDefault()
    if (mode === 'signup' && password !== confirmPassword) {
      setErrorMessage('Passwords do not match.')
      return
    }

    setSubmitting(true)
    setMessage('')
    setErrorMessage('')

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: fullName.trim() } },
        })
        if (error) throw error
        if (!data.user) throw new Error('Sign-up did not return an account. Please try again.')

        if (data.session) {
          setUser(data.user)
          setMessage('Your customer account has been created.')
        } else {
          setMessage('If this email can be registered, a confirmation link will be sent. Check your inbox to finish creating your account.')
        }
        setPassword('')
        setConfirmPassword('')
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (error) throw error
        if (!data.user) throw new Error('Sign-in did not return an account. Please try again.')

        setUser(data.user)
        setMessage('You are signed in.')
        setPassword('')
      }
    } catch (error) {
      console.error(mode === 'signup' ? 'Account sign-up failed:' : 'Account sign-in failed:', error)
      setErrorMessage(error.message || 'The account request failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function onSignOut() {
    setSubmitting(true)
    setMessage('')
    setErrorMessage('')
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
      setProfile(null)
      setMessage('You are signed out.')
    } catch (error) {
      console.error('Signing out failed:', error)
      setErrorMessage(error.message || 'Sign-out failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="account-section">
      <div className="account-card">
        <p className="page-eyebrow">Your account</p>
        <h1>{user ? 'Account details' : 'Sign in or create an account'}</h1>

        {loadingSession ? (
          <p role="status">Checking your account...</p>
        ) : user ? (
          <div className="account-signed-in">
            <p className="account-email">{user.email}</p>
            {profile ? (
              <p className="account-role">
                {profile.full_name ? `${profile.full_name} · ` : ''}
                {profile.role === 'admin' ? 'Administrator' : 'Customer'}
              </p>
            ) : profileError ? (
              <p className="account-message account-message--error" role="alert">{profileError}</p>
            ) : (
              <p role="status">Loading account details...</p>
            )}
            {message && <p className="account-message" role="status">{message}</p>}
            {errorMessage && <p className="account-message account-message--error" role="alert">{errorMessage}</p>}
            <button type="button" className="btn-secondary account-submit" onClick={onSignOut} disabled={submitting}>
              {submitting ? 'Signing out...' : 'Sign out'}
            </button>
          </div>
        ) : (
          <>
            <div className="account-mode-toggle" role="group" aria-label="Account action">
              <button
                type="button"
                aria-pressed={mode === 'signin'}
                className={mode === 'signin' ? 'is-active' : ''}
                onClick={() => {
                  setMode('signin')
                  setMessage('')
                  setErrorMessage('')
                  setConfirmPassword('')
                }}
              >
                Sign in
              </button>
              <button
                type="button"
                aria-pressed={mode === 'signup'}
                className={mode === 'signup' ? 'is-active' : ''}
                onClick={() => {
                  setMode('signup')
                  setMessage('')
                  setErrorMessage('')
                }}
              >
                Customer sign up
              </button>
            </div>

            <form className="account-form" onSubmit={onSubmit}>
              {mode === 'signup' && (
                <label className="account-field">
                  <span>Full name</span>
                  <input
                    type="text"
                    name="name"
                    autoComplete="name"
                    value={fullName}
                    onChange={event => setFullName(event.target.value)}
                    required
                    maxLength={120}
                  />
                </label>
              )}
              <label className="account-field">
                <span>Email</span>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  required
                />
              </label>
              <label className="account-field">
                <span>Password</span>
                <input
                  type="password"
                  name="password"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={event => setPassword(event.target.value)}
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
                    name="confirm-password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={event => setConfirmPassword(event.target.value)}
                    minLength={8}
                    required
                  />
                </label>
              )}
              {message && <p className="account-message" role="status">{message}</p>}
              {errorMessage && <p className="account-message account-message--error" role="alert">{errorMessage}</p>}
              <button type="submit" className="btn-primary account-submit" disabled={submitting}>
                {submitting ? 'Please wait...' : mode === 'signup' ? 'Create customer account' : 'Sign in'}
              </button>
            </form>

            <p className="account-admin-note">
              Admin accounts are created and granted access manually by the site owner. Admins can sign in here once their account is provisioned.
            </p>
          </>
        )}
      </div>
    </section>
  )
}
