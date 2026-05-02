import React, { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  onDone: () => void
  duration?: number
}

export function Toast({ message, onDone, duration = 2000 }: ToastProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => { setVisible(false); onDone() }, duration)
    return () => clearTimeout(t)
  }, [duration, onDone])

  if (!visible) return null
  return <div className="d-toast">{message}</div>
}
