export function StatusBar({ online, earnings, jobs }) {
  return (
    <header className="status-bar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          background: online ? '#3fb96b' : 'var(--cs-slate-500)',
          boxShadow: online ? '0 0 0 4px rgba(63, 185, 107, .2)' : 'none',
        }} />
        <span style={{
          color: online ? '#3fb96b' : 'rgba(255,255,255,.5)',
          fontFamily: 'var(--cs-mono)',
          fontSize: 11,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          fontWeight: 700,
        }}>
          {online ? 'Online' : 'Offline'}
        </span>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ textAlign: 'right' }}>
        <div style={{ color: 'rgba(255,255,255,.5)' }} className="mono-label">Today</div>
        <div style={{ fontFamily: 'var(--cs-mono)', fontSize: 14, fontWeight: 700 }}>
          ${earnings.toFixed(2)} - {jobs} jobs
        </div>
      </div>
    </header>
  );
}
