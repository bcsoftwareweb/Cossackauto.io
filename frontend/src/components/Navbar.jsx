import React, { useState, useRef, useEffect } from 'react'
import { logo, logoFallback } from '../config/brand'
import { Link } from 'react-router-dom'
import { supabase } from '../utils/supabase'

function SignInIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="8" cy="7" r="3" />
      <path d="M2.5 20c.4-3.1 2.2-5 5.5-5 2.5 0 4.1 1.2 4.9 3.5" />
      <path d="M14 8h8m-3-3 3 3-3 3" />
    </svg>
  )
}

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [visible, setVisible] = useState(false)
  const [userId, setUserId] = useState(null)
  const [profileRole, setProfileRole] = useState('')
  const timeoutRef = useRef(null)

  const openMenu = () => {
    clearTimeout(timeoutRef.current)
    setVisible(true)
    requestAnimationFrame(() => setOpen(true))
  }

  const closeMenu = () => {
    setOpen(false)
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setVisible(false), 220)
  }

  const toggle = () => {
    if (!open) openMenu()
    else closeMenu()
  }

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current)
  }, [])

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) {
        console.error('Loading navbar session failed:', error)
        return
      }
      setUserId(data.session?.user?.id ?? null)
    }).catch(error => {
      if (active) console.error('Loading navbar session failed:', error)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setUserId(session?.user?.id ?? null)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!userId) {
      setProfileRole('')
      return
    }

    let active = true

    async function loadProfileRole() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .maybeSingle()
        if (error) throw error
        if (active) setProfileRole(data?.role ?? '')
      } catch (error) {
        if (active) console.error('Loading navbar profile role failed:', error)
      }
    }

    loadProfileRole()
    return () => { active = false }
  }, [userId])

  const handleNavLinkClick = () => {
    closeMenu()
  }

  const navItems = [
    { to: '/', label: 'Home' },
    { to: '/about', label: 'About' },
    { to: '/services', label: 'Services' },
    { to: '/reviews', label: 'Reviews' },
    { to: '/reservation', label: 'Reservation' },
    ...(userId ? [{ to: '/updates', label: 'Updates' }] : []),
    ...(profileRole === 'admin' ? [{ to: '/admin', label: 'Manage site' }] : []),
  ]

  return (
    <header className="site-header">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="logo flex-none flex items-center space-x-3">
          <img src={logo} alt="Cossack Auto Solutions" className="h-12 w-12 object-contain" onError={(e)=>{e.currentTarget.onerror=null; e.currentTarget.src=logoFallback}} />
          <span>Cossack Auto Solutions</span>
        </Link>

        <button type="button" aria-label="toggle menu" aria-expanded={open} onClick={toggle} className="ml-auto lg:hidden p-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 6h16M4 12h16M4 18h16" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
        </button>
        {/* Desktop nav - always visible on md+ */}
        <nav className="desktop-nav hidden lg:flex lg:items-center lg:justify-center lg:static lg:bg-transparent lg:text-inherit">
          <ul className="flex flex-row space-x-6 text-sm">
            {navItems.map(item => (
              <li key={item.to}><Link to={item.to}>{item.label}</Link></li>
            ))}
          </ul>
        </nav>

        {/* Mobile nav - animated, only shown when `visible` */}
        {visible && (
          <nav className={`mobile-nav lg:hidden absolute left-0 right-0 top-full bg-[var(--color-charcoal)] text-[var(--color-offwhite)] transform transition-all duration-200 ${open ? 'translate-y-0 opacity-100 pointer-events-auto z-50' : '-translate-y-2 opacity-0 pointer-events-none'}`}>
            <ul className="flex flex-col space-y-2 text-sm p-4">
              {navItems.map(item => (
                <li className="py-2" key={item.to}>
                  <Link to={item.to} onClick={handleNavLinkClick}>{item.label}</Link>
                </li>
              ))}
            </ul>
            <div className="mobile-nav-actions p-4 border-t border-white/5">
              <Link to="/reservation" onClick={handleNavLinkClick} className="btn-primary flex-1 text-center py-3">Book now</Link>
              <Link to="/account" onClick={handleNavLinkClick} className="account-cta" aria-label="Account">
                <SignInIcon />
                <span>Account</span>
              </Link>
            </div>
          </nav>
        )}

        <div className="hidden lg:flex items-center ml-4 header-cta">
          <Link to="/reservation" className="btn-primary">Book now</Link>
          <Link to="/account" className="account-cta" aria-label="Account">
            <SignInIcon />
            <span>Account</span>
          </Link>
        </div>
      </div>
    </header>
  )
}
