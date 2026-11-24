import React from 'react'
import { Link } from 'react-router-dom'

export default function Hero() {
  return (
    <section id="home" className="home-landing">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="hero-block">
          <div className="hero-accent" aria-hidden="true" />
          <p className="hero-eyebrow">Neighborhood auto repair</p>
          <h1 className="hero-title">Cossack Auto Solutions</h1>
          <p className="hero-lead">
            Honest work and fair prices from a shop you can trust down the street.
          </p>
          <div className="hero-actions">
            <Link to="/reservation" className="btn-primary btn-lg">Book an appointment</Link>
            <Link to="/services" className="hero-link">Browse services</Link>
          </div>
        </div>
      </div>
    </section>
  )
}
