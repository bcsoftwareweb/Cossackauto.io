import React from 'react'
import aboutPhoto from '../assets/about-photo.png'
import { ContentAction, getSiteImageUrl, PageIntro, SiteContentSections, useSiteSections } from '../components/SiteContent'

const DEFAULT_INTRO = {
  eyebrow: 'About us',
  title: 'Meet the shop',
  body: 'Your trusted neighborhood auto repair shop. Honest work, fair prices, quality service.',
}

const DEFAULT_PROFILE = {
  title: 'Your Name',
  body: "Hi, I'm Your Name — owner of Cossack Auto Solutions. I started this shop because I believe in honest, high-quality auto repair.\n\nI treat every vehicle like my own and stand behind my work. If you'd like to schedule service, please use the button below to book an appointment.",
  button_label: 'Book an appointment',
  button_url: '/reservation',
}

export default function About() {
  const { sections, error } = useSiteSections('about')
  const intro = sections.find(section => section.section_type === 'intro')
  const profile = sections.find(section => section.section_type === 'profile') ?? DEFAULT_PROFILE
  const profileImage = getSiteImageUrl(profile.image_path) || aboutPhoto

  return (
    <section id="about">
      <div className="max-w-6xl mx-auto px-4">
        <PageIntro section={intro} fallback={DEFAULT_INTRO} />

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-16 items-start">
          <div className="md:col-span-1 flex justify-center md:justify-start">
            <img
              src={profileImage}
              alt={profile.title || 'Owner of Cossack Auto Solutions'}
              className="about-photo"
            />
          </div>

          <div className="md:col-span-2">
            <h3 className="text-charcoal">{profile.title}</h3>
            <div className="about-role">{profile.eyebrow || 'Owner / Founder'}</div>

            <div className="mt-6 about-body">
              {profile.body.split(/\n\n+/).map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>

            <div className="mt-8">
              <ContentAction label={profile.button_label} url={profile.button_url} />
            </div>
          </div>
        </div>
        <SiteContentSections sections={sections} error={error} />
      </div>
    </section>
  )
}
