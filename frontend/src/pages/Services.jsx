import React from 'react'
import { Link } from 'react-router-dom'
import { getSiteImageUrl, PageIntro, SiteContentSections, useSiteSections } from '../components/SiteContent'

const DEFAULT_SERVICES = [
  { title: 'Oil Change', desc: 'Full synthetic, blend, or conventional oil change services.' },
  { title: 'Fluid Services', desc: 'Transmission, brake fluid, coolant, and related fluid flush services.' },
  { title: 'Brakes', desc: 'Brake pad, rotor, and caliper replacement and service.' },
  { title: 'Suspension and Steering', desc: 'Shocks, struts, CV axles, and steering component service.' },
  { title: 'Batteries, Starters and Alternators', desc: 'Battery, starter, alternator, and charging system service.' },
  { title: 'Diagnostics and Check Engine Lights', desc: 'Vehicle diagnostics and check engine light testing and troubleshooting.' },
  { title: 'Engine Repair Work', desc: 'Engine repair and related mechanical service.' },
  { title: 'Pre-purchase Inspections', desc: 'Vehicle inspections for buyers before making a purchase decision.' }
]

const DEFAULT_INTRO = {
  eyebrow: 'What we offer',
  title: 'Services',
  body: 'From oil changes and fluid service to brakes, suspension, diagnostics, engine repair, and pre-purchase inspections, we provide reliable maintenance and repair solutions for your vehicle.',
}

export default function Services() {
  const { sections, loading, error } = useSiteSections('services')
  const intro = sections.find(section => section.section_type === 'intro')
  const serviceSections = sections.filter(section => section.section_type === 'service')
  const services = loading || error ? DEFAULT_SERVICES : serviceSections

  return (
    <section id="services">
      <div className="max-w-6xl mx-auto px-4">
        <PageIntro section={intro} fallback={DEFAULT_INTRO} />

        <div className="mt-14 grid grid-cols-2 gap-3 sm:gap-6 lg:gap-8">
          {services.map(service => (
            <article key={service.id ?? service.title} className="service-card">
              {service.image_path && (
                <img
                  className="cms-service-image"
                  src={getSiteImageUrl(service.image_path)}
                  alt={service.title}
                />
              )}
              <h3>{service.title}</h3>
              <p className="cms-section-body">{service.body ?? service.desc}</p>
              <div className="mt-auto">
                <Link to="/reservation" state={{ prefill: service.title }} className="service-book">Book appointment</Link>
              </div>
            </article>
          ))}
        </div>

        {!loading && !error && services.length === 0 && (
          <p className="cms-load-error" role="status">No services are currently listed.</p>
        )}
        <p className="mt-10 text-center font-bold text-red-700">
          ***Not Offered*** Major rebuilds, subframe removal, or anything that needs a lift beyond what can safely be done on jack stands
        </p>
        <SiteContentSections sections={sections} error={error} />
      </div>
    </section>
  )
}
