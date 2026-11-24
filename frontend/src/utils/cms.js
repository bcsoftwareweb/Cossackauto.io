import { supabase } from './supabase'

const IMAGE_TYPES = {
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}
const MAX_IMAGE_SIZE = 10 * 1024 * 1024

export async function uploadSiteImage(userId, file) {
  const extension = IMAGE_TYPES[file.type]
  if (!extension) throw new Error('Choose a JPG, PNG, WebP, or GIF image.')
  if (file.size > MAX_IMAGE_SIZE) throw new Error('Choose an image smaller than 10 MB.')

  const path = `${userId}/${crypto.randomUUID()}.${extension}`
  const { error } = await supabase.storage
    .from('site-media')
    .upload(path, file, { contentType: file.type, upsert: false })

  if (error) throw error
  return path
}
