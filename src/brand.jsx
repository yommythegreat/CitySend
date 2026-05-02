// CitySend brand identity — logos, palette, typography showcase.
// All logos are vector-only, no imagery. Monochrome first; accent is terracotta.

// ─── LOGO A — wordmark with kerned arrow (primary) ───
const LogoWordmark = ({ color = 'var(--cs-ink)', accent = 'var(--cs-accent)', scale = 1 }) => (
  <svg viewBox="0 0 240 60" width={240 * scale} height={60 * scale} style={{ display: 'block' }}>
    <text x="0" y="42" fontFamily="Geist, system-ui" fontWeight="700" fontSize="38" fill={color} letterSpacing="-1.4">city</text>
    <text x="89" y="42" fontFamily="Geist, system-ui" fontWeight="700" fontSize="38" fill={color} letterSpacing="-1.4">send</text>
    <g transform="translate(77.5, 30)">
      <path d="M0 0 L9 0 M6 -3 L9 0 L6 3" stroke={accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </g>
  </svg>
);

// ─── LOGO B — monogram pin ───
const LogoPin = ({ color = 'var(--cs-ink)', fg = '#fff', scale = 1 }) => (
  <svg viewBox="0 0 60 60" width={60 * scale} height={60 * scale} style={{ display: 'block' }}>
    <path d="M30 4c-10 0-18 7.5-18 17 0 13 18 35 18 35s18-22 18-35c0-9.5-8-17-18-17z" fill={color}/>
    <g transform="translate(19, 16)" stroke={fg} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M2 8 L20 8"/>
      <path d="M14 3 L20 8 L14 13"/>
    </g>
  </svg>
);

// ─── LOGO C — parcel glyph ───
const LogoParcel = ({ color = 'var(--cs-ink)', accent = 'var(--cs-accent)', scale = 1 }) => (
  <svg viewBox="0 0 60 60" width={60 * scale} height={60 * scale} style={{ display: 'block' }}>
    <path d="M30 8 L50 18 L50 42 L30 52 L10 42 L10 18 Z" fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round"/>
    <path d="M10 18 L30 28 L50 18" fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round"/>
    <path d="M30 28 L30 52" fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round"/>
    <circle cx="30" cy="18" r="3" fill={accent}/>
  </svg>
);

// ─── LOGO D — stamped/editorial lockup ───
const LogoStamp = ({ color = 'var(--cs-ink)', scale = 1 }) => (
  <svg viewBox="0 0 260 60" width={260 * scale} height={60 * scale} style={{ display: 'block' }}>
    <rect x="1" y="1" width="258" height="58" fill="none" stroke={color} strokeWidth="1.5" strokeDasharray="3 3"/>
    <text x="130" y="28" textAnchor="middle" fontFamily="Geist Mono, monospace" fontWeight="500" fontSize="10" fill={color} letterSpacing="2">SAME-DAY · WINNIPEG</text>
    <text x="130" y="50" textAnchor="middle" fontFamily="Geist, system-ui" fontWeight="700" fontSize="22" fill={color} letterSpacing="-0.8">CITYSEND</text>
  </svg>
);

// ─── BRAND PANEL — big showcase card ───
function BrandIdentity() {
  const swatch = (name, val, ink = '#fff', sub) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ height: 68, background: val, borderRadius: 10, border: '1px solid rgba(0,0,0,0.06)',
                    display: 'flex', alignItems: 'flex-end', padding: 10, color: ink, fontFamily: 'var(--cs-mono)',
                    fontSize: 11 }}>{val}</div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--cs-ink)' }}>{name}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--cs-slate-500)', fontFamily: 'var(--cs-mono)' }}>{sub}</div>}
      </div>
    </div>
  );

  const section = (title, children) => (
    <div style={{ borderTop: '1px solid var(--cs-slate-100)', paddingTop: 28, marginTop: 28 }}>
      <div style={{ fontSize: 11, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)',
                    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 20 }}>{title}</div>
      {children}
    </div>
  );

  return (
    <div style={{ width: 1040, background: '#fff', padding: 48, fontFamily: 'var(--cs-font)', color: 'var(--cs-ink)' }}>
      {/* Hero */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 40 }}>
        <div>
          <div style={{ fontSize: 12, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)',
                        letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>Brand identity · v1</div>
          <LogoWordmark scale={1.6} />
          <div style={{ fontSize: 22, color: 'var(--cs-slate-700)', marginTop: 20, maxWidth: 520, lineHeight: 1.35, letterSpacing: -0.3 }}>
            Same-day delivery for Winnipeg. Built to feel fast, effortless, and boringly reliable.
          </div>
        </div>
        <div style={{ textAlign: 'right', fontFamily: 'var(--cs-mono)', fontSize: 11, color: 'var(--cs-slate-500)',
                      lineHeight: 1.8 }}>
          <div>citysend.ca</div>
          <div>WPG · MB · CA</div>
          <div>2026—</div>
        </div>
      </div>

      {section('Logo system — four directions', (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, background: 'var(--cs-slate-100)',
                      border: '1px solid var(--cs-slate-100)' }}>
          {[
            { t: 'A · Wordmark', sub: 'primary · kerned arrow between syllables · carries the "send" beat',
              node: <LogoWordmark scale={1.1} />, bg: '#fff' },
            { t: 'B · Pin monogram', sub: 'map pin + arrow · used at app-icon size and favicon',
              node: <LogoPin scale={1.2} />, bg: '#fff' },
            { t: 'C · Parcel glyph', sub: 'isometric parcel with accent node · courier/tracking contexts',
              node: <LogoParcel scale={1.2} />, bg: '#fff' },
            { t: 'D · Stamped lockup', sub: 'postal-stamp treatment · packaging & receipts',
              node: <LogoStamp scale={0.95} />, bg: 'var(--cs-paper)' },
          ].map((o) => (
            <div key={o.t} style={{ background: o.bg, padding: '36px 32px', display: 'flex', flexDirection: 'column', gap: 24, minHeight: 200 }}>
              <div style={{ fontSize: 11, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)',
                            letterSpacing: 1.2, textTransform: 'uppercase' }}>{o.t}</div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>{o.node}</div>
              <div style={{ fontSize: 13, color: 'var(--cs-slate-700)', lineHeight: 1.5, maxWidth: 380 }}>{o.sub}</div>
            </div>
          ))}
        </div>
      ))}

      {section('Wordmark on surfaces', (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, background: 'var(--cs-slate-100)' }}>
          <div style={{ background: 'var(--cs-paper)', padding: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 140 }}>
            <LogoWordmark scale={1} />
          </div>
          <div style={{ background: 'var(--cs-ink)', padding: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 140 }}>
            <LogoWordmark scale={1} color="#fff" accent="var(--cs-accent-2)" />
          </div>
          <div style={{ background: 'var(--cs-accent)', padding: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 140 }}>
            <LogoWordmark scale={1} color="#fff" accent="#fff" />
          </div>
        </div>
      ))}

      {section('Palette — cool slate + terracotta signal', (
        <>
          <div style={{ fontSize: 11, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)', marginBottom: 14 }}>Core</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 28 }}>
            {swatch('Ink', '#0b1220', '#fff', 'slate-900')}
            {swatch('Slate 700', '#2b3548', '#fff')}
            {swatch('Slate 400', '#8590a6', '#fff')}
            {swatch('Slate 100', '#eceef2', '#0b1220')}
            {swatch('Paper', '#fafbfc', '#0b1220')}
            {swatch('White', '#ffffff', '#0b1220')}
          </div>
          <div style={{ fontSize: 11, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)', marginBottom: 14 }}>Signal</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
            {swatch('Terracotta', '#c94a1b', '#fff', 'accent · primary')}
            {swatch('Ember', '#e76a3a', '#fff', 'accent · hover')}
            {swatch('Moss', '#166b3a', '#fff', 'success')}
            {swatch('Amber', '#a85c00', '#fff', 'warning')}
            {swatch('Brick', '#b3261e', '#fff', 'error')}
            {swatch('Ink-on-Ink', '#1a2233', '#fff', 'surface-dark')}
          </div>
        </>
      ))}

      {section('Typography — Geist + Geist Mono', (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 56 }}>
          <div>
            <div style={{ fontSize: 72, fontWeight: 700, letterSpacing: -2.5, lineHeight: 0.95, color: 'var(--cs-ink)' }}>
              Send anything<br/>across the city.
            </div>
            <div style={{ fontSize: 20, fontWeight: 400, lineHeight: 1.45, color: 'var(--cs-slate-700)', marginTop: 24, maxWidth: 540 }}>
              Documents, keys, cakes, laptops — if it fits in a car, CitySend moves it today. Flat $14 across Winnipeg until the edge of town.
            </div>
            <div style={{ fontFamily: 'var(--cs-mono)', fontSize: 13, color: 'var(--cs-slate-500)', marginTop: 32, letterSpacing: 0.3 }}>
              CS—2810 · ETA 22 min · driver matched · $14.00 CAD
            </div>
          </div>
          <div style={{ borderLeft: '1px solid var(--cs-slate-100)', paddingLeft: 32, fontSize: 13, lineHeight: 2, color: 'var(--cs-slate-700)' }}>
            <div><span style={{ fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)' }}>Display</span> — Geist 700 / -2.5</div>
            <div><span style={{ fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)' }}>H1</span> — Geist 600 / -0.8</div>
            <div><span style={{ fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)' }}>H2</span> — Geist 600 / -0.4</div>
            <div><span style={{ fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)' }}>Body</span> — Geist 400 / 0</div>
            <div><span style={{ fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)' }}>Caption</span> — Geist 500 / 0.2</div>
            <div><span style={{ fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)' }}>Data</span> — Geist Mono 500</div>
          </div>
        </div>
      ))}

      {section('Voice — direct, uncluttered, a little dry', (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {[
            { k: 'Tagline', v: '"Across town, before lunch."' },
            { k: 'CTA', v: '"Send a package"   not "Get started now!"' },
            { k: 'Empty state', v: '"Nothing on the move yet."' },
            { k: 'Error', v: '"That address didn\'t resolve. Try again, or drop a pin."' },
            { k: 'Success', v: '"Booked. Armen is on the way — 9 min out."' },
            { k: 'Receipt footer', v: '"Thanks. See you next time."' },
          ].map((o) => (
            <div key={o.k} style={{ padding: 18, background: 'var(--cs-paper)', borderRadius: 10 }}>
              <div style={{ fontSize: 11, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)',
                            letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>{o.k}</div>
              <div style={{ fontSize: 15, color: 'var(--cs-ink)', lineHeight: 1.45 }}>{o.v}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { BrandIdentity, LogoWordmark, LogoPin, LogoParcel, LogoStamp });
