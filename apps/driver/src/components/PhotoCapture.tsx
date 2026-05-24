import React, { useRef, useState } from 'react'
import { compressPhoto, uploadDeliveryPhoto } from '@shared/utils/photoStore'

interface Props {
  orderId:    string
  label:      'pickup' | 'dropoff'
  /** Called with the local preview URL (always) + public Storage URL (when upload succeeds) */
  onCapture:  (previewUrl: string, storageUrl: string | null) => void
  onClear:    () => void
  captured:   boolean
  previewUrl: string | null
  uploading:  boolean
  /** When true, suppresses the gallery fallback on desktop and marks the field as required */
  required?:  boolean
}

/**
 * PhotoCapture — camera input + upload for delivery proof photos.
 *
 * On mobile: triggers the rear-facing camera (capture="environment").
 * On desktop: opens a file picker.
 * Compresses before upload; shows local preview immediately while upload runs.
 */
export function PhotoCapture({ orderId, label, onCapture, onClear, captured, previewUrl, uploading, required = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file)
    onCapture(localUrl, null)   // optimistic: no storage URL yet

    // Compress then upload in background
    try {
      const compressed  = await compressPhoto(file)
      const storageUrl  = await uploadDeliveryPhoto(compressed, orderId, label)
      onCapture(localUrl, storageUrl)
    } catch {
      // Upload failed — local preview still works, note records local
    }

    // Reset input so the same file can be re-selected after a retake
    e.target.value = ''
  }

  if (captured && previewUrl) {
    return (
      <div
        onClick={onClear}
        style={{
          width: '100%', aspectRatio: '4/3', borderRadius: 16,
          overflow: 'hidden', position: 'relative', cursor: 'pointer',
          border: '2px solid #22c55e',
        }}
      >
        <img
          src={previewUrl}
          alt="Delivery photo"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
        {/* Upload indicator */}
        {uploading && (
          <div style={{
            position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,.6)', color: '#fff', borderRadius: 99,
            padding: '4px 12px', fontSize: 11, fontFamily: 'monospace', letterSpacing: 0.5,
          }}>Uploading…</div>
        )}
        {/* Retake overlay */}
        <div style={{
          position: 'absolute', top: 10, right: 10,
          background: 'rgba(0,0,0,.5)', color: '#fff',
          borderRadius: 99, padding: '4px 12px', fontSize: 11, fontWeight: 600,
        }}>Tap to retake</div>
        {/* Check badge */}
        {!uploading && (
          <div style={{
            position: 'absolute', top: 10, left: 10,
            background: '#22c55e', color: '#fff',
            borderRadius: 99, padding: '4px 10px', fontSize: 11, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {label === 'pickup' ? 'Photo captured' : 'Delivered to door'}
          </div>
        )}
        {/* Hidden input for retake */}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={handleChange}
        />
      </div>
    )
  }

  return (
    <button
      onClick={() => inputRef.current?.click()}
      style={{
        width: '100%', aspectRatio: '4/3',
        border: '1.5px dashed #d1d5db',
        borderRadius: 16, cursor: 'pointer',
        background: '#f9fafb',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 10,
      }}
    >
      {/* Camera icon */}
      <div style={{
        width: 52, height: 52, borderRadius: 26,
        background: '#f3f4f6',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
      </div>
      <div style={{ fontSize: 14, color: '#6b7280', fontWeight: 500 }}>
        {label === 'pickup' ? 'Tap to photograph the parcel' : 'Tap to photograph the door'}
      </div>
      <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#c94a1b', letterSpacing: 0.5, fontWeight: 600 }}>
        {required ? 'REQUIRED' : 'RECOMMENDED'}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleChange}
      />
    </button>
  )
}
