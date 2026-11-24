import React from 'react'
import Hero from '../components/Hero'
import { SiteContentSections, useSiteSections } from '../components/SiteContent'

export default function Home() {
  const { sections, error } = useSiteSections('home')
  const hero = sections.find(section => section.section_type === 'hero')

  return (
    <>
      <Hero content={hero} error={error} />
      <SiteContentSections sections={sections} />
    </>
  )
}
