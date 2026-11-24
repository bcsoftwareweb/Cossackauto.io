import React, { useState, useRef, useEffect } from 'react'
import { logo, logoFallback } from '../config/brand'
import { SITE_HEADER_UPDATED_EVENT } from '../config/siteSettings'
import useSiteSettings from '../hooks/useSiteSettings'
import { Link } from 'react-router-dom'
import { getSafeContentUrl, getSiteImageUrl } from './SiteContent'
import { supabase } from '../utils/supabase'

const DEFAULT_NAV_ITEMS = [
  { id: 'home', label: 'Home', page_slug: 'home' },
  { id: 'about', label: 'About', page_slug: 'about' },
  { id: 'services', label: 'Services', page_slug: 'services' },
  { id: 'reviews', label: 'Reviews', page_slug: 'reviews' },
  { id: 'reservation', label: 'Reservation', page_slug: 'reservation' },
]

const BUILTIN_PAGE_PATHS = {
  home: '/',
  about: '/about',
  services: '/services',
  reviews: '/reviews',
  reservation: '/reservation',
}

function getNavigationTarget(item) {
  if (item.page_slug) {
    return BUILTIN_PAGE_PATHS[item.page_slug] ?? `/pages/${encodeURIComponent(item.page_slug)}`
  }
  return getSafeContentUrl(item.href)
}

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
  const [navItems, setNavItems] = useState(DEFAULT_NAV_ITEMS)
  const timeoutRef = useRef(null)
  const siteSettings = useSiteSettings()

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

    async function loadNavigationItems() {
      try {
        const { data, error } = await supabase
          .from('site_navigation')
          .select('id, label, page_slug, href')
          .eq('is_published', true)
          .order('sort_order', { ascending: true })
        if (error) throw error
        if (active) setNavItems(data ?? [])
      } catch (error) {
        if (active) {
          console.error('Loading site navigation failed:', error)
          setNavItems(DEFAULT_NAV_ITEMS)
        }
      }
    }

    loadNavigationItems()
    window.addEventListener(SITE_HEADER_UPDATED_EVENT, loadNavigationItems)
    return () => {
      active = false
      window.removeEventListener(SITE_HEADER_UPDATED_EVENT, loadNavigationItems)
    }
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

  const logoUrl = getSiteImageUrl(siteSettings.logo_path) || logo
  const headerStyle = {
    '--site-header-background': siteSettings.header_background_color,
    '--site-header-text': siteSettings.header_text_color,
    '--site-header-accent': siteSettings.header_accent_color,
  }

  function renderNavLink(item, onClick) {
    const target = getNavigationTarget(item)
    if (!target) return null
    if (target.startsWith('/')) {
      return <Link to={target} onClick={onClick}>{item.label}</Link>
    }
    return (
      <a href={target} target="_blank" rel="noreferrer" onClick={onClick}>
        {item.label}
      </a>
    )
  }

  return (
    <header className="site-header" style={headerStyle}>
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="logo flex-none flex items-center space-x-3">
          <img src={logoUrl} alt={siteSettings.site_name} className="h-12 w-12 object-contain" onError={(e)=>{e.currentTarget.onerror=null; e.currentTarget.src=logoFallback}} />
          <span>{siteSettings.site_name}</span>
        </Link>

        <button type="button" aria-label="toggle menu" aria-expanded={open} onClick={toggle} className="ml-auto lg:hidden p-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        </button>
        {/* Desktop nav - always visible on md+ */}
        <nav className="desktop-nav hidden lg:flex lg:items-center lg:justify-center lg:static lg:bg-transparent lg:text-inherit">
          <ul className="flex flex-row space-x-6 text-sm">
            {navItems.map(item => (
              <li key={item.id ?? item.page_slug ?? item.href}>{renderNavLink(item)}</li>
            ))}
          </ul>
        </nav>

        {/* Mobile nav - animated, only shown when `visible` */}
        {visible && (
          <nav className={`mobile-nav lg:hidden absolute left-0 right-0 top-full transform transition-all duration-200 ${open ? 'translate-y-0 opacity-100 pointer-events-auto z-50' : '-translate-y-2 opacity-0 pointer-events-none'}`}>
            <ul className="flex flex-col space-y-2 text-sm p-4">
              {navItems.map(item => (
                <li className="py-2" key={item.id ?? item.page_slug ?? item.href}>
                  {renderNavLink(item, handleNavLinkClick)}
                </li>
              ))}
            </ul>
            <div className="mobile-nav-actions p-4 border-t border-white/5">
              <Link to="/reservation" onClick={handleNavLinkClick} className="btn-primary flex-1 text-center py-3">Book now</Link>
              {profileRole === 'admin' && (
                <Link to="/admin" onClick={handleNavLinkClick} className="account-cta">Dashboard</Link>
              )}
              <Link to="/account" onClick={handleNavLinkClick} className="account-cta" aria-label="Account">
                <SignInIcon />
                <span>Account</span>
              </Link>
            </div>
          </nav>
        )}

        <div className="hidden lg:flex items-center ml-4 header-cta">
          <Link to="/reservation" className="btn-primary">Book now</Link>
          {profileRole === 'admin' && (
            <Link to="/admin" className="account-cta">Dashboard</Link>
          )}
          <Link to="/account" className="account-cta" aria-label="Account">
            <SignInIcon />
            <span>Account</span>
          </Link>
        </div>
      </div>
    </header>
  )
}
