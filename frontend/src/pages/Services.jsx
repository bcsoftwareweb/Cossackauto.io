import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

const services = [
  { title: 'Oil Change', desc: 'Full synthetic, blend, or conventional oil change services.' },
  { title: 'Fluid Services', desc: 'Transmission, brake fluid, coolant, and related fluid flush services.' },
  { title: 'Brakes', desc: 'Brake pad, rotor, and caliper replacement and service.' },
  { title: 'Suspension and Steering', desc: 'Shocks, struts, CV axles, and steering component service.' },
  { title: 'Batteries, Starters and Alternators', desc: 'Battery, starter, alternator, and charging system service.' },
  { title: 'Diagnostics and Check Engine Lights', desc: 'Vehicle diagnostics and check engine light testing and troubleshooting.' },
  { title: 'Engine Repair Work', desc: 'Engine repair and related mechanical service.' },
  { title: 'Pre-purchase Inspections', desc: 'Vehicle inspections for buyers before making a purchase decision.' }
]

export default function Services(){
  const servicesTrackRef = useRef(null)
  const [canScrollPrevious, setCanScrollPrevious] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(false)

  useEffect(() => {
    const track = servicesTrackRef.current
    if (!track) return

    function updateScrollControls() {
      setCanScrollPrevious(track.scrollLeft > 1)
      setCanScrollNext(track.scrollLeft + track.clientWidth < track.scrollWidth - 1)
    }

    updateScrollControls()
    track.addEventListener('scroll', updateScrollControls, { passive: true })
    window.addEventListener('resize', updateScrollControls)

    return () => {
      track.removeEventListener('scroll', updateScrollControls)
      window.removeEventListener('resize', updateScrollControls)
    }
  }, [])

  function scrollServices(direction) {
    const track = servicesTrackRef.current
    if (!track) return

    track.scrollBy({ left: track.clientWidth * direction, behavior: 'smooth' })
  }

  return (
    <section id="services">
      <div className="max-w-6xl mx-auto px-4">
        <div className="page-header">
          <p className="page-eyebrow">What we offer</p>
          <h2>Services</h2>
          <p className="page-header-lead">From oil changes and fluid service to brakes, suspension, diagnostics, engine repair, and pre-purchase inspections, we provide reliable maintenance and repair solutions for your vehicle.</p>
        </div>

        <div className="service-carousel">
          <div
            ref={servicesTrackRef}
            className="service-carousel-track"
            role="region"
            aria-label="Available services"
            tabIndex={0}
          >
            {services.map(s => (
              <article key={s.title} className="service-card">
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
                <div className="mt-auto">
                  <Link to="/reservation" state={{ prefill: s.title }} className="service-book">Book appointment</Link>
                </div>
              </article>
            ))}
          </div>

          <div className="service-carousel-controls">
            <button
              type="button"
              className="service-carousel-arrow"
              onClick={() => scrollServices(-1)}
              disabled={!canScrollPrevious}
              aria-label="Previous services"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              className="service-carousel-arrow"
              onClick={() => scrollServices(1)}
              disabled={!canScrollNext}
              aria-label="Next services"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>

        <p className="mt-10 text-center font-bold text-red-700">
          ***Not Offered*** Major rebuilds, subframe removal, or anything that needs a lift beyond what can safely be done on jack stands
        </p>
      </div>
    </section>
  )
}
