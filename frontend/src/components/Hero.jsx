import React from 'react'
import { Link } from 'react-router-dom'
import { ContentAction, getSiteImageUrl } from './SiteContent'

const DEFAULT_HERO = {
  eyebrow: 'Neighborhood auto repair',
  title: 'Cossack Auto Solutions',
  body: 'Honest work and fair prices from a shop you can trust down the street.',
  button_label: 'Book an appointment',
  button_url: '/reservation',
}

export default function Hero({ content, error = '' }) {
  const hero = content ?? DEFAULT_HERO
  const imageUrl = getSiteImageUrl(hero.image_path)

  return (
    <section id="home" className="home-landing">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="hero-block">
          <div className="hero-accent" aria-hidden="true" />
          {error && <p className="cms-load-error" role="alert">{error}</p>}
          {hero.eyebrow && <p className="hero-eyebrow">{hero.eyebrow}</p>}
          <h1 className="hero-title">{hero.title}</h1>
          {hero.body && <p className="hero-lead cms-section-body">{hero.body}</p>}
          {imageUrl && <img className="hero-content-image" src={imageUrl} alt={hero.title || 'Shop image'} />}
          <div className="hero-actions">
            <ContentAction label={hero.button_label} url={hero.button_url} className="btn-primary btn-lg" />
            <Link to="/services" className="hero-link">Browse services</Link>
          </div>
        </div>
      </div>
    </section>
  )
}
