export function MapSurface({ phase = 0, dark = false }) {
  const bg = dark ? '#1a2233' : '#eef1f5';
  const land = dark ? '#222c40' : '#f7f8fb';
  const road = dark ? '#3a4664' : '#dde2ea';
  const water = dark ? '#1e2a42' : '#dde5ef';
  const ink = dark ? '#fff' : 'var(--cs-ink)';
  const p = phase === 0 ? 0.25 : phase === 1 ? 0.55 : 0.88;
  const x = 80 + (310 - 80) * p;
  const y = 120 + (420 - 120) * p;

  return (
    <div style={{ position: 'absolute', inset: 0, background: bg, overflow: 'hidden' }}>
      <svg width="100%" height="100%" viewBox="0 0 402 540" preserveAspectRatio="xMidYMid slice">
        <rect width="402" height="540" fill={land} />
        <path d="M-20 120 C80 180 140 160 180 220 S260 340 220 440 S120 560 -20 580Z" fill={water} />
        <path d="M480 80 C420 140 380 180 340 180 S280 200 260 260 S300 360 360 380 S500 400 520 340Z" fill={water} />
        <g stroke={road} strokeWidth="1">
          {Array.from({ length: 11 }).map((_, i) => <line key={`v${i}`} x1={i * 40 - 20} y1="0" x2={i * 40 + 60} y2="540" />)}
          {Array.from({ length: 11 }).map((_, i) => <line key={`h${i}`} x1="0" y1={i * 55} x2="402" y2={i * 55 + 20} />)}
        </g>
        <g stroke={road} strokeWidth="6" fill="none" opacity="0.9">
          <path d="M-20 200 L420 280" />
          <path d="M-20 380 L420 430" />
          <path d="M100 -20 L180 560" />
          <path d="M280 -20 L340 560" />
        </g>
        <path d="M80 120 Q140 180 180 220 T260 310 Q290 360 310 420" fill="none" stroke={ink} strokeWidth="4" strokeLinecap="round" />
        <path d="M80 120 Q140 180 180 220 T260 310 Q290 360 310 420" fill="none" stroke="var(--cs-accent)" strokeWidth="2" strokeLinecap="round" strokeDasharray="6 6" />
        <g transform="translate(80, 120)">
          <circle r="14" fill="#fff" stroke={ink} strokeWidth="2" />
          <circle r="5" fill={ink} />
        </g>
        <g transform="translate(310, 420)">
          <path d="M0 -20 C-9 -20 -16 -13 -16 -5 C-16 5 0 20 0 20 S16 5 16 -5 C16 -13 9 -20 0 -20Z" fill="var(--cs-accent)" />
          <circle cy="-6" r="4" fill="#fff" />
        </g>
        <g transform={`translate(${x}, ${y})`}>
          <circle r="18" fill="rgba(201,74,27,.18)" />
          <circle r="10" fill="#fff" stroke="var(--cs-ink)" strokeWidth="2" />
          <circle r="5" fill="var(--cs-accent)" />
        </g>
      </svg>
    </div>
  );
}
