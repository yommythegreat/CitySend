/**
 * photoStore — Upload delivery photos to Supabase Storage.
 *
 * Bucket: `delivery-photos`  (must be created in Supabase dashboard)
 * Path:   `{orderId}/{timestamp}_{label}.jpg`
 *
 * Returns the public URL on success, or null if storage is unavailable.
 * Falls back silently so the rest of the flow is never blocked by a photo failure.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase'

const BUCKET = 'delivery-photos'

/**
 * Upload a photo File to Supabase Storage.
 *
 * @param file     The File object from <input type="file">
 * @param orderId  Used as the storage folder
 * @param label    e.g. 'pickup' | 'dropoff'  — appended to filename
 * @returns        Public URL string, or null on failure
 */
export async function uploadDeliveryPhoto(
  file: File,
  orderId: string,
  label: 'pickup' | 'dropoff',
): Promise<string | null> {
  if (!isSupabaseConfigured) return null

  try {
    const ext       = file.type === 'image/png' ? 'png' : 'jpg'
    const timestamp = Date.now()
    const path      = `${orderId}/${timestamp}_${label}.${ext}`

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: true })

    if (error) {
      console.warn('[photoStore] upload error:', error.message)
      return null
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    return data?.publicUrl ?? null
  } catch (err) {
    console.warn('[photoStore] unexpected error:', err)
    return null
  }
}

/**
 * Resize + compress a File to JPEG before uploading.
 * Keeps images under ~800 KB and speeds up uploads on slow mobile connections.
 *
 * @param file     Original file from camera / file picker
 * @param maxPx    Max width or height in pixels (default 1280)
 * @param quality  JPEG quality 0–1 (default 0.82)
 * @returns        Compressed File (or original if canvas API unavailable)
 */
export async function compressPhoto(
  file: File,
  maxPx   = 1280,
  quality = 0.82,
): Promise<File> {
  return new Promise(resolve => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      const { width, height } = img
      const scale  = Math.min(1, maxPx / Math.max(width, height))
      const w      = Math.round(width  * scale)
      const h      = Math.round(height * scale)

      const canvas = document.createElement('canvas')
      canvas.width  = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve(file); return }

      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob(blob => {
        if (!blob) { resolve(file); return }
        resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }))
      }, 'image/jpeg', quality)
    }

    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}
