import React, { useEffect } from 'react'
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Footer from './components/Footer'
import StickyContact from './components/StickyContact'
import Reservation from './pages/Reservation'
import About from './pages/About'
import Home from './pages/Home'
import Services from './pages/Services'
import Reviews from './pages/Reviews'
import Account from './pages/Account'

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    document.body.scrollTop = 0
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}

export default function App() {
  return (
    <HashRouter>
      <ScrollToTop />
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/services" element={<Services />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/reservation" element={<Reservation />} />
            <Route path="/account" element={<Account />} />
          </Routes>
        </main>
        <Footer />
        <StickyContact />
      </div>
    </HashRouter>
  )
}
