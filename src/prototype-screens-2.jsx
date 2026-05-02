// CitySend prototype screens part 2 — pricing, payment, tracking, history, notifications

// ═══════════════════════════════════════════════════════════
// 3. PRICING / CONFIRMATION
// ═══════════════════════════════════════════════════════════
function PricingScreen({ go, draft }) {
  return (
    <Screen bg="#f5f6f8">
      <div style={{ padding: '56px 20px 0', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={() => go('new-3')} style={iconBtnSt()}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--cs-ink)" strokeWidth="2" strokeLinecap="round"><path d="M9 2L4 7l5 5"/></svg>
        </button>
        <div style={{ flex: 1, fontSize: 17, fontWeight: 600, letterSpacing: -0.3 }}>Review</div>
      </div>

      <div style={{ padding: '24px 20px 16px' }}>
        <div style={{ fontFamily: 'var(--cs-mono)', fontSize: 11, color: 'var(--cs-slate-500)',
                      letterSpacing: 1.4, textTransform: 'uppercase' }}>Price</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6 }}>
          <div style={{ fontSize: 56, fontWeight: 600, letterSpacing: -2.5, color: 'var(--cs-ink)', lineHeight: 1 }}>$14.00</div>
          <div style={{ fontFamily: 'var(--cs-mono)', fontSize: 13, color: 'var(--cs-slate-500)' }}>CAD · flat</div>
        </div>
        <div style={{ fontSize: 14, color: 'var(--cs-slate-500)', marginTop: 10, lineHeight: 1.5 }}>
          Same-day anywhere in Winnipeg. Tax and driver tip are shown before you pay.
        </div>
      </div>

      <div style={{ padding: '0 20px' }}>
        {/* Route summary card */}
        <div style={{ background: '#fff', borderRadius: 18, border: '1px solid var(--cs-slate-100)', padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <Icon.clock size={16} color="var(--cs-slate-500)" />
            <div style={{ fontSize: 14, color: 'var(--cs-slate-700)' }}>Pickup in <b style={{ color: 'var(--cs-ink)' }}>~12 min</b> · Delivered by <b style={{ color: 'var(--cs-ink)' }}>1:18 PM</b></div>
          </div>

          <div style={{ display: 'flex', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 5, border: '2.5px solid var(--cs-ink)' }}/>
              <div style={{ width: 2, flex: 1, background: 'var(--cs-slate-200)', marginTop: 2, marginBottom: 2, minHeight: 28 }}/>
              <div style={{ width: 10, height: 10, background: 'var(--cs-accent)', borderRadius: 2 }}/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontFamily: 'var(--cs-mono)', fontSize: 10, color: 'var(--cs-slate-500)', letterSpacing: 1, textTransform: 'uppercase' }}>Pickup</div>
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--cs-ink)', marginTop: 2 }}>{draft.pickup.address || '134 Princess St'}</div>
                <div style={{ fontSize: 13, color: 'var(--cs-slate-500)' }}>{draft.pickup.name || 'Sasha Novak'} · {draft.pickup.phone || '204 555 0199'}</div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--cs-mono)', fontSize: 10, color: 'var(--cs-slate-500)', letterSpacing: 1, textTransform: 'uppercase' }}>Drop-off</div>
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--cs-ink)', marginTop: 2 }}>{draft.dropoff.address || '88 Osborne St'}</div>
                <div style={{ fontSize: 13, color: 'var(--cs-slate-500)' }}>{draft.dropoff.name || 'Mei Tanaka'} · {draft.dropoff.phone || '204 555 0148'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Parcel + adjustments */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--cs-slate-100)', padding: 14 }}>
            <div style={{ fontFamily: 'var(--cs-mono)', fontSize: 10, color: 'var(--cs-slate-500)', letterSpacing: 1, textTransform: 'uppercase' }}>Parcel</div>
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--cs-ink)', marginTop: 4 }}>
              {draft.parcel.size === 's' ? 'Small' : draft.parcel.size === 'l' ? 'Large' : 'Medium'}
              {draft.parcel.fragile && ' · Fragile'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--cs-slate-500)', marginTop: 2 }}>{draft.parcel.desc || 'Documents'}</div>
          </div>
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--cs-slate-100)', padding: 14 }}>
            <div style={{ fontFamily: 'var(--cs-mono)', fontSize: 10, color: 'var(--cs-slate-500)', letterSpacing: 1, textTransform: 'uppercase' }}>Distance</div>
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--cs-ink)', marginTop: 4 }}>3.2 km</div>
            <div style={{ fontSize: 13, color: 'var(--cs-slate-500)', marginTop: 2 }}>Exchange → Osborne</div>
          </div>
        </div>

        {/* Line items */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--cs-slate-100)', padding: 16, marginTop: 10 }}>
          {[
            ['Flat same-day', '$14.00'],
            ['GST (5%)', '$0.70'],
            ['PST (7%)', '$0.98'],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14, color: 'var(--cs-slate-700)' }}>
              <div>{k}</div><div style={{ fontFamily: 'var(--cs-mono)' }}>{v}</div>
            </div>
          ))}
          <div style={{ borderTop: '1px solid var(--cs-slate-100)', marginTop: 10, paddingTop: 12,
                        display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 600 }}>
            <div>Total</div><div style={{ fontFamily: 'var(--cs-mono)' }}>$15.68</div>
          </div>
        </div>
      </div>

      <div style={{ height: 16 }}/>
      <div style={{ padding: '16px 20px 36px', borderTop: '1px solid var(--cs-slate-100)', background: '#fff' }}>
        <CSButton kind="ink" size="lg" full onClick={() => go('pay')}
          icon={<Icon.lock color="#fff" size={16} />}>Continue to payment</CSButton>
      </div>
    </Screen>
  );
}

// ═══════════════════════════════════════════════════════════
// 4. PAYMENT
// ═══════════════════════════════════════════════════════════
function PaymentScreen({ go, state, setState }) {
  const [method, setMethod] = React.useState('apple');
  const [tip, setTip] = React.useState(2);
  const [processing, setProcessing] = React.useState(false);
  const [guest, setGuest] = React.useState(false);

  const subtotal = 15.68;
  const total = subtotal + tip;

  const pay = () => {
    setProcessing(true);
    setTimeout(() => go('tracking'), 1400);
  };

  return (
    <Screen bg="#f5f6f8">
      <div style={{ padding: '56px 20px 0', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={() => go('pricing')} style={iconBtnSt()}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--cs-ink)" strokeWidth="2" strokeLinecap="round"><path d="M9 2L4 7l5 5"/></svg>
        </button>
        <div style={{ flex: 1, fontSize: 17, fontWeight: 600, letterSpacing: -0.3 }}>Payment</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--cs-slate-500)', fontFamily: 'var(--cs-mono)' }}>
          <Icon.lock size={12} /> SECURE
        </div>
      </div>

      <div style={{ padding: '24px 20px 16px' }}>
        <div style={{ fontFamily: 'var(--cs-mono)', fontSize: 11, color: 'var(--cs-slate-500)',
                      letterSpacing: 1.4, textTransform: 'uppercase' }}>Amount due</div>
        <div style={{ fontSize: 48, fontWeight: 600, letterSpacing: -2, color: 'var(--cs-ink)', marginTop: 4 }}>
          ${total.toFixed(2)}
        </div>
      </div>

      <div style={{ padding: '0 20px 16px' }}>
        <div style={{ fontSize: 12, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)',
                      letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>Pay with</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { v: 'apple', l: 'Apple Pay', sub: 'Face ID', ic: <span style={{ fontSize: 18, fontFamily: '-apple-system', fontWeight: 600 }}>􀣺</span> },
            { v: 'card', l: '•••• 4242', sub: 'Visa · default', ic: <Icon.card size={18} /> },
            { v: 'new', l: 'Add card', sub: 'Credit or debit', ic: <Icon.plus size={18} /> },
          ].map((m) => {
            const active = method === m.v;
            return (
              <button key={m.v} onClick={() => setMethod(m.v)} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                background: '#fff', border: `1.5px solid ${active ? 'var(--cs-ink)' : 'var(--cs-slate-200)'}`,
                borderRadius: 14, cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--cs-font)',
              }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--cs-slate-100)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{m.ic}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--cs-ink)' }}>{m.l}</div>
                  <div style={{ fontSize: 13, color: 'var(--cs-slate-500)' }}>{m.sub}</div>
                </div>
                <div style={{ width: 20, height: 20, borderRadius: 10,
                              border: `2px solid ${active ? 'var(--cs-ink)' : 'var(--cs-slate-300)'}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {active && <div style={{ width: 10, height: 10, borderRadius: 5, background: 'var(--cs-ink)' }}/>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tip */}
      <div style={{ padding: '0 20px 16px' }}>
        <div style={{ fontSize: 12, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)',
                      letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>Tip for Armen</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[0, 2, 3, 5].map((t) => (
            <button key={t} onClick={() => setTip(t)} style={{
              flex: 1, padding: '12px 0', cursor: 'pointer',
              background: tip === t ? 'var(--cs-ink)' : '#fff',
              color: tip === t ? '#fff' : 'var(--cs-ink)',
              border: `1.5px solid ${tip === t ? 'var(--cs-ink)' : 'var(--cs-slate-200)'}`,
              borderRadius: 12, fontFamily: 'var(--cs-font)', fontSize: 14, fontWeight: 500,
            }}>{t === 0 ? 'None' : `$${t}`}</button>
          ))}
        </div>
      </div>

      {/* Guest toggle */}
      <div style={{ padding: '0 20px 20px' }}>
        <button onClick={() => setGuest(!guest)} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
          fontFamily: 'var(--cs-font)',
        }}>
          <div style={{
            width: 18, height: 18, borderRadius: 5,
            border: `1.5px solid ${guest ? 'var(--cs-ink)' : 'var(--cs-slate-300)'}`,
            background: guest ? 'var(--cs-ink)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {guest && <Icon.check size={12} color="#fff" stroke={2.5} />}
          </div>
          <div style={{ fontSize: 14, color: 'var(--cs-slate-700)' }}>Continue as guest — no account needed</div>
        </button>
      </div>

      <div style={{ flex: 1 }}/>

      <div style={{ padding: '16px 20px 36px', borderTop: '1px solid var(--cs-slate-100)', background: '#fff' }}>
        <CSButton kind="ink" size="lg" full onClick={pay} disabled={processing}
          icon={processing ? <Spinner /> : <Icon.lock color="#fff" size={16} />}>
          {processing ? 'Processing…' : `Pay $${total.toFixed(2)}`}
        </CSButton>
        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--cs-slate-500)', marginTop: 10, fontFamily: 'var(--cs-mono)' }}>
          PROTECTED BY CITYSEND SHIELD · $500 COVERAGE
        </div>
      </div>
    </Screen>
  );
}

function Spinner() {
  return (
    <div style={{
      width: 16, height: 16, border: '2px solid rgba(255,255,255,.3)',
      borderTopColor: '#fff', borderRadius: 8, animation: 'cs-spin 0.7s linear infinite',
    }}/>
  );
}

// ═══════════════════════════════════════════════════════════
// 5. LIVE TRACKING (map)
// ═══════════════════════════════════════════════════════════
function TrackingScreen({ go, state, mapStyle = 'light' }) {
  const [phase, setPhase] = React.useState(0);
  // Phase 0: driver en route to pickup · 1: picked up · 2: near drop-off
  React.useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 3200);
    const t2 = setTimeout(() => setPhase(2), 6400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const phases = [
    { k: 'Matched', v: 'Armen is on the way to pickup', eta: '9 min' },
    { k: 'Picked up', v: 'On route to Osborne', eta: '14 min' },
    { k: 'Arriving', v: '2 blocks from drop-off', eta: '2 min' },
  ];
  const cur = phases[phase];

  return (
    <Screen bg={mapStyle === 'dark' ? '#1a2233' : '#e8ebef'} scroll={false}>
      {/* Map */}
      <MapSurface phase={phase} style={mapStyle} />

      {/* Top overlay */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '56px 16px 0',
                    display: 'flex', gap: 10, zIndex: 5 }}>
        <button onClick={() => go('home')} style={glassBtnSt()}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--cs-ink)" strokeWidth="2" strokeLinecap="round"><path d="M9 2L4 7l5 5"/></svg>
        </button>
        <div style={{ flex: 1 }}/>
        <button style={glassBtnSt()}><Icon.menu size={18}/></button>
      </div>

      {/* ETA pill floating above sheet */}
      <div style={{ position: 'absolute', top: 120, left: '50%', transform: 'translateX(-50%)', zIndex: 5 }}>
        <div style={{
          background: 'var(--cs-ink)', color: '#fff', padding: '10px 18px', borderRadius: 999,
          fontFamily: 'var(--cs-mono)', fontSize: 13, fontWeight: 500, letterSpacing: 0.5,
          boxShadow: '0 10px 30px -10px rgba(11,18,32,.6)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--cs-accent)',
                        animation: 'cs-pulse 1.4s ease-in-out infinite' }}/>
          ETA {cur.eta}
        </div>
      </div>

      {/* Bottom sheet */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: '#fff', borderRadius: '22px 22px 0 0',
        boxShadow: '0 -20px 50px -20px rgba(11,18,32,.2)',
        paddingBottom: 36, zIndex: 10,
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--cs-slate-200)' }}/>
        </div>

        {/* Progress rail */}
        <div style={{ padding: '16px 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            {phases.map((p, i) => (
              <React.Fragment key={i}>
                <div style={{
                  width: 10, height: 10, borderRadius: 5,
                  background: i <= phase ? 'var(--cs-ink)' : 'var(--cs-slate-200)',
                  border: i === phase ? '2px solid var(--cs-ink)' : 'none',
                  transform: i === phase ? 'scale(1.4)' : 'scale(1)',
                  transition: 'all .3s',
                }}/>
                {i < phases.length - 1 && (
                  <div style={{ flex: 1, height: 2, background: i < phase ? 'var(--cs-ink)' : 'var(--cs-slate-200)',
                                transition: 'background .3s' }}/>
                )}
              </React.Fragment>
            ))}
          </div>
          <div style={{ fontFamily: 'var(--cs-mono)', fontSize: 11, color: 'var(--cs-slate-500)',
                        letterSpacing: 1.2, textTransform: 'uppercase' }}>{cur.k}</div>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.6, color: 'var(--cs-ink)', marginTop: 4 }}>{cur.v}</div>
        </div>

        {/* Driver card */}
        <div style={{ padding: '18px 20px 0' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: 14,
            background: 'var(--cs-paper)', borderRadius: 16,
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: 26,
              background: 'linear-gradient(135deg, #2b3548, #5b657a)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 600, color: '#fff', fontFamily: 'var(--cs-font)',
            }}>AY</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--cs-ink)', letterSpacing: -0.2 }}>Armen Y.</div>
              <div style={{ fontSize: 13, color: 'var(--cs-slate-500)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon.star size={12} color="var(--cs-accent)" fill="currentColor" /> 4.96 · Toyota Corolla · MFJ 4K2
              </div>
            </div>
            <button style={circleBtnSt('var(--cs-slate-100)')}><Icon.phone size={16}/></button>
            <button style={circleBtnSt('var(--cs-ink)', '#fff')}><Icon.send size={16} color="#fff" /></button>
          </div>
        </div>

        {/* Route mini */}
        <div style={{ padding: '14px 20px 0', display: 'flex', gap: 12, fontSize: 13, color: 'var(--cs-slate-700)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: phase >= 1 ? 'var(--cs-slate-300)' : 'var(--cs-ink)' }}/>
            <div style={{ width: 1, flex: 1, background: 'var(--cs-slate-200)', margin: '2px 0' }}/>
            <div style={{ width: 8, height: 8, background: 'var(--cs-accent)', borderRadius: 1 }}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ paddingBottom: 8, textDecoration: phase >= 1 ? 'line-through' : 'none', opacity: phase >= 1 ? 0.5 : 1 }}>134 Princess St</div>
            <div>88 Osborne St · Apt 3</div>
          </div>
          <div style={{ fontFamily: 'var(--cs-mono)', fontSize: 12, color: 'var(--cs-slate-500)', alignSelf: 'flex-end' }}>CS—2810</div>
        </div>
      </div>

      <style>{`
        @keyframes cs-spin { to { transform: rotate(360deg); } }
        @keyframes cs-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </Screen>
  );
}

function glassBtnSt() {
  return {
    width: 40, height: 40, borderRadius: 20, border: 'none', cursor: 'pointer',
    background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)',
    boxShadow: '0 4px 12px rgba(11,18,32,.12)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };
}
function circleBtnSt(bg, fg = 'var(--cs-ink)') {
  return {
    width: 44, height: 44, borderRadius: 22, border: 'none', cursor: 'pointer',
    background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center',
  };
}

// Stylised map — no external tiles, SVG streets for a clean look
function MapSurface({ phase, style }) {
  const dark = style === 'dark';
  const bg = dark ? '#1a2233' : '#eef1f5';
  const land = dark ? '#222c40' : '#f7f8fb';
  const road = dark ? '#2f3a52' : '#ffffff';
  const roadStroke = dark ? '#3a4664' : '#dde2ea';
  const water = dark ? '#1e2a42' : '#dde5ef';
  const ink = dark ? '#fff' : 'var(--cs-ink)';

  // driver position along route (0..1) per phase
  const p = phase === 0 ? 0.25 : phase === 1 ? 0.55 : 0.88;

  return (
    <div style={{ position: 'absolute', inset: 0, background: bg, overflow: 'hidden' }}>
      <svg width="100%" height="100%" viewBox="0 0 402 540" preserveAspectRatio="xMidYMid slice" style={{ display: 'block' }}>
        <rect width="402" height="540" fill={land}/>
        {/* River (Red River curve) */}
        <path d="M-20 120 C 80 180, 140 160, 180 220 S 260 340, 220 440 S 120 560, -20 580 Z" fill={water}/>
        <path d="M480 80 C 420 140, 380 180, 340 180 S 280 200, 260 260 S 300 360, 360 380 S 500 400, 520 340 Z" fill={water}/>
        {/* Grid streets */}
        <g stroke={roadStroke} strokeWidth="1">
          {Array.from({ length: 11 }).map((_, i) => (
            <line key={'v'+i} x1={i*40 - 20} y1="0" x2={i*40 + 60} y2="540" />
          ))}
          {Array.from({ length: 11 }).map((_, i) => (
            <line key={'h'+i} x1="0" y1={i*55} x2="402" y2={i*55 + 20} />
          ))}
        </g>
        {/* Major avenues */}
        <g stroke={roadStroke} strokeWidth="6" fill="none" opacity="0.9">
          <path d="M-20 200 L420 280"/>
          <path d="M-20 380 L420 430"/>
          <path d="M100 -20 L180 560"/>
          <path d="M280 -20 L340 560"/>
        </g>
        {/* Route polyline */}
        <path d="M80 120 Q 140 180, 180 220 T 260 310 Q 290 360, 310 420"
              fill="none" stroke={ink} strokeWidth="4" strokeLinecap="round" strokeDasharray="0"
              opacity="0.95"/>
        <path d="M80 120 Q 140 180, 180 220 T 260 310 Q 290 360, 310 420"
              fill="none" stroke="var(--cs-accent)" strokeWidth="2" strokeLinecap="round"
              strokeDasharray="6 6"/>
        {/* Pickup marker */}
        <g transform="translate(80, 120)">
          <circle r="14" fill="#fff" stroke={ink} strokeWidth="2"/>
          <circle r="5" fill={ink}/>
        </g>
        {/* Drop-off marker */}
        <g transform="translate(310, 420)">
          <path d="M0 -20 C -9 -20, -16 -13, -16 -5 C -16 5, 0 20, 0 20 S 16 5, 16 -5 C 16 -13, 9 -20, 0 -20 Z"
                fill="var(--cs-accent)"/>
          <circle cy="-6" r="4" fill="#fff"/>
        </g>
        {/* Driver dot — animated along path */}
        <DriverDot p={p} dark={dark} />
      </svg>
    </div>
  );
}

function DriverDot({ p, dark }) {
  // Precomputed waypoints along the route for the given p
  const pts = [
    { t: 0.00, x: 80, y: 120 },
    { t: 0.25, x: 140, y: 180 },
    { t: 0.50, x: 200, y: 240 },
    { t: 0.75, x: 260, y: 340 },
    { t: 1.00, x: 310, y: 420 },
  ];
  // Lerp between nearest
  let a = pts[0], b = pts[pts.length - 1];
  for (let i = 0; i < pts.length - 1; i++) {
    if (p >= pts[i].t && p <= pts[i+1].t) { a = pts[i]; b = pts[i+1]; break; }
  }
  const f = (p - a.t) / (b.t - a.t || 1);
  const x = a.x + (b.x - a.x) * f;
  const y = a.y + (b.y - a.y) * f;
  return (
    <g style={{ transition: 'transform 1.2s ease' }} transform={`translate(${x}, ${y})`}>
      <circle r="18" fill={dark ? 'rgba(201,74,27,.2)' : 'rgba(201,74,27,.15)'}>
        <animate attributeName="r" from="14" to="22" dur="1.6s" repeatCount="indefinite"/>
        <animate attributeName="opacity" from="0.6" to="0" dur="1.6s" repeatCount="indefinite"/>
      </circle>
      <circle r="10" fill="#fff" stroke="var(--cs-ink)" strokeWidth="2"/>
      <circle r="5" fill="var(--cs-accent)"/>
    </g>
  );
}

// ═══════════════════════════════════════════════════════════
// 6. ORDER HISTORY
// ═══════════════════════════════════════════════════════════
function HistoryScreen({ go, state }) {
  const items = state.pastDeliveries;
  return (
    <Screen bg="#f5f6f8">
      <div style={{ padding: '56px 20px 0', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={() => go('home')} style={iconBtnSt()}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--cs-ink)" strokeWidth="2" strokeLinecap="round"><path d="M9 2L4 7l5 5"/></svg>
        </button>
        <div style={{ flex: 1, fontSize: 17, fontWeight: 600, letterSpacing: -0.3 }}>History</div>
        <button style={iconBtnSt()}><Icon.search size={18}/></button>
      </div>

      <div style={{ padding: '24px 20px 14px' }}>
        <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: -1, color: 'var(--cs-ink)' }}>All deliveries</div>
        <div style={{ fontSize: 14, color: 'var(--cs-slate-500)', marginTop: 4 }}>23 sent · $322 spent this year</div>
      </div>

      <div style={{ padding: '0 20px 16px' }}>
        <CSSegment options={[{ value: 'all', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'done', label: 'Delivered' }]}
                   value="all" onChange={() => {}} />
      </div>

      <div style={{ padding: '0 20px 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((d, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--cs-slate-100)', padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <CSTag tone={d.status === 'delivered' ? 'ok' : d.status === 'in-transit' ? 'ink' : 'neutral'}
                icon={d.status === 'delivered' ? <Icon.check size={11}/> : d.status === 'in-transit' ? <Icon.truck size={12}/> : null}>
                {d.status === 'delivered' ? 'Delivered' : d.status === 'in-transit' ? 'In transit' : 'Canceled'}
              </CSTag>
              <span style={{ fontFamily: 'var(--cs-mono)', fontSize: 12, color: 'var(--cs-slate-500)' }}>CS—{d.id}</span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--cs-ink)', letterSpacing: -0.2 }}>{d.to.name}</div>
            <div style={{ fontSize: 13, color: 'var(--cs-slate-500)', marginTop: 2 }}>{d.to.address}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14,
                          paddingTop: 12, borderTop: '1px solid var(--cs-slate-100)' }}>
              <div style={{ fontSize: 12, color: 'var(--cs-slate-500)', fontFamily: 'var(--cs-mono)' }}>{d.date} · ${d.price}</div>
              <button onClick={() => go('new-1', { prefill: d })} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                background: 'var(--cs-slate-100)', border: 'none', padding: '6px 12px', borderRadius: 999,
                color: 'var(--cs-ink)', fontFamily: 'var(--cs-font)', fontSize: 13, fontWeight: 500,
              }}>
                <Icon.repeat size={13}/> Send again
              </button>
            </div>
          </div>
        ))}
      </div>
    </Screen>
  );
}

// ═══════════════════════════════════════════════════════════
// 7. NOTIFICATIONS
// ═══════════════════════════════════════════════════════════
function NotificationsScreen({ go }) {
  const groups = [
    { day: 'Today', items: [
      { k: 'Delivered', t: '1:22 PM', title: 'Mei Tanaka received your package', sub: 'CS—2810 · 88 Osborne St · signed by M. Tanaka', tone: 'ok' },
      { k: 'In transit', t: '1:08 PM', title: 'Armen picked up your package', sub: 'CS—2810 · 3.2 km to drop-off · ETA 14 min', tone: 'ink' },
      { k: 'Matched', t: '12:58 PM', title: 'Armen Y. is your courier today', sub: 'Toyota Corolla · Arriving in 9 min', tone: 'neutral' },
    ]},
    { day: 'Yesterday', items: [
      { k: 'Delivered', t: '4:41 PM', title: 'J. Morissette received your package', sub: 'CS—2788 · Well-received. Thanks for tipping Kai.', tone: 'ok' },
      { k: 'Receipt', t: '4:41 PM', title: 'Receipt for $16.68', sub: 'Visa •••• 4242 · View PDF', tone: 'neutral' },
    ]},
    { day: 'This week', items: [
      { k: 'News', t: 'Tue', title: 'Now delivering in St. Vital', sub: 'CitySend has expanded south — same flat $14.', tone: 'accent' },
    ]},
  ];
  return (
    <Screen bg="#f5f6f8">
      <div style={{ padding: '56px 20px 0', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={() => go('home')} style={iconBtnSt()}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--cs-ink)" strokeWidth="2" strokeLinecap="round"><path d="M9 2L4 7l5 5"/></svg>
        </button>
        <div style={{ flex: 1, fontSize: 17, fontWeight: 600, letterSpacing: -0.3 }}>Notifications</div>
        <button style={iconBtnSt()}><Icon.check size={18}/></button>
      </div>

      <div style={{ padding: '24px 20px 14px' }}>
        <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: -1, color: 'var(--cs-ink)' }}>What's happening</div>
      </div>

      {groups.map((g) => (
        <div key={g.day} style={{ padding: '0 20px 16px' }}>
          <div style={{ fontSize: 11, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)',
                        letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 10 }}>{g.day}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {g.items.map((n, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--cs-slate-100)',
                                    padding: 14, display: 'flex', gap: 12 }}>
                <div style={{ paddingTop: 2 }}>
                  <CSTag tone={n.tone} icon={n.k === 'Delivered' ? <Icon.check size={11}/> : n.k === 'In transit' ? <Icon.truck size={12}/> : n.k === 'Matched' ? <Icon.user size={11}/> : n.k === 'Receipt' ? <Icon.receipt size={11}/> : <Icon.sparkle size={11}/>}>
                    {n.k}
                  </CSTag>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--cs-ink)', letterSpacing: -0.2 }}>{n.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--cs-slate-500)', marginTop: 3, lineHeight: 1.4 }}>{n.sub}</div>
                </div>
                <div style={{ fontFamily: 'var(--cs-mono)', fontSize: 11, color: 'var(--cs-slate-500)' }}>{n.t}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </Screen>
  );
}

Object.assign(window, { PricingScreen, PaymentScreen, TrackingScreen, HistoryScreen, NotificationsScreen });
