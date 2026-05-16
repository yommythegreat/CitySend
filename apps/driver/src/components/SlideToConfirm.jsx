import { useRef, useState } from 'react';
import { Icon } from './Icons.jsx';

export function SlideToConfirm({ label, onConfirm, color = 'var(--cs-ink)', icon }) {
  const [drag, setDrag] = useState(0);
  const [done, setDone] = useState(false);
  const trackRef = useRef(null);
  const activePointer = useRef(null);

  function updateFromClientX(clientX) {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const next = Math.max(0, Math.min(1, (clientX - rect.left - 28) / (rect.width - 56)));
    setDrag(next);
  }

  function handlePointerDown(event) {
    if (done) return;
    activePointer.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    updateFromClientX(event.clientX);
  }

  function handlePointerMove(event) {
    if (activePointer.current !== event.pointerId || done) return;
    updateFromClientX(event.clientX);
  }

  function handlePointerUp(event) {
    if (activePointer.current !== event.pointerId || done) return;
    activePointer.current = null;
    if (drag > 0.9) {
      setDrag(1);
      setDone(true);
      window.setTimeout(() => onConfirm?.(), 220);
      return;
    }
    setDrag(0);
  }

  return (
    <div ref={trackRef} style={{
      position: 'relative',
      width: '100%',
      height: 56,
      borderRadius: 32,
      overflow: 'hidden',
      background: color,
      boxShadow: '0 10px 24px -10px rgba(11,18,32,.4)',
      touchAction: 'none',
      userSelect: 'none',
    }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        width: `calc(56px + ${drag * 100}%)`,
        background: 'rgba(255,255,255,.12)',
      }} />
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        color: 'white',
        fontSize: 15,
        fontWeight: 700,
        opacity: 1 - drag * 0.85,
        pointerEvents: 'none',
      }}>
        {label}
      </div>
      <button
        aria-label={label}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          position: 'absolute',
          top: 4,
          left: `calc(${drag * 100}% - ${drag * 56}px + 4px)`,
          width: 48,
          height: 48,
          border: 0,
          borderRadius: 24,
          background: 'white',
          color,
          display: 'grid',
          placeItems: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,.18)',
          cursor: 'grab',
        }}
      >
        {done ? <Icon.check color={color} stroke={2.5} /> : icon ?? <Icon.arrow color={color} />}
      </button>
    </div>
  );
}
