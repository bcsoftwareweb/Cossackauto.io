import { useEffect, useState } from 'react'
import { DEFAULT_SITE_SETTINGS, SITE_HEADER_UPDATED_EVENT } from '../config/siteSettings'
import { supabase } from '../utils/supabase'

export default function useSiteSettings() {
  const [settings, setSettings] = useState({ ...DEFAULT_SITE_SETTINGS })

  useEffect(() => {
    let active = true

    async function loadSettings() {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('site_name, logo_path, header_background_color, header_text_color, header_accent_color')
          .eq('id', 1)
          .maybeSingle()
        if (error) throw error
        if (active && data) setSettings({ ...DEFAULT_SITE_SETTINGS, ...data })
      } catch (error) {
        if (active) console.error('Loading site settings failed:', error)
      }
    }

    loadSettings()
    window.addEventListener(SITE_HEADER_UPDATED_EVENT, loadSettings)
    return () => {
      active = false
      window.removeEventListener(SITE_HEADER_UPDATED_EVENT, loadSettings)
    }
  }, [])

  return settings
}
