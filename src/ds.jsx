// CitySend design system — atoms & molecules.
// Every component consumes CSS vars so tweaks propagate live.

// ─── BUTTON ──────────────────────────────────────────────
function CSButton({ kind = 'primary', size = 'md', children, onClick, disabled, full, icon, style, type = 'button' }) {
  const sizes = {
    sm: { h: 36, fs: 14, px: 14, gap: 6 },
    md: { h: 48, fs: 15, px: 18, gap: 8 },
    lg: { h: 56, fs: 17, px: 22, gap: 10 },
  }[size];
  const kinds = {
    primary: { bg: 'var(--cs-accent)', color: '#fff', border: 'none', shadow: '0 1px 0 rgba(0,0,0,.04), 0 6px 16px -6px rgba(201,74,27,.5)' },
    ink:     { bg: 'var(--cs-ink)', color: '#fff', border: 'none', shadow: '0 1px 0 rgba(0,0,0,.04), 0 6px 16px -6px rgba(11,18,32,.4)' },
    secondary: { bg: '#fff', color: 'var(--cs-ink)', border: '1px solid var(--cs-slate-200)', shadow: 'none' },
    ghost:   { bg: 'transparent', color: 'var(--cs-ink)', border: 'none', shadow: 'none' },
  }[kind];
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setPress(false); }}
      onMouseDown={() => setPress(true)} onMouseUp={() => setPress(false)}
      style={{
        height: sizes.h, padding: `0 ${sizes.px}px`, fontSize: sizes.fs,
        width: full ? '100%' : undefined, gap: sizes.gap,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--cs-font)', fontWeight: 500, letterSpacing: -0.2,
        borderRadius: 999, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        background: kinds.bg, color: kinds.color, border: kinds.border,
        boxShadow: kinds.shadow,
        transform: press ? 'scale(.98)' : 'scale(1)',
        filter: hover && !disabled ? 'brightness(1.08)' : 'none',
        transition: 'transform .12s, filter .12s',
        ...style,
      }}>
      {icon}
      {children}
    </button>
  );
}

// ─── INPUT ───────────────────────────────────────────────
function CSField({ label, value, onChange, placeholder, icon, suffix, type = 'text', onFocus, onBlur }) {
  const [focused, setFocused] = React.useState(false);
  return (
    <label style={{ display: 'block' }}>
      {label && <div style={{ fontSize: 12, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)',
                              letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        height: 52, padding: '0 16px',
        background: '#fff',
        border: `1.5px solid ${focused ? 'var(--cs-ink)' : 'var(--cs-slate-200)'}`,
        borderRadius: 12, transition: 'border-color .15s',
      }}>
        {icon && <div style={{ color: 'var(--cs-slate-500)', display: 'flex' }}>{icon}</div>}
        <input type={type} value={value ?? ''} onChange={(e) => onChange && onChange(e.target.value)}
               placeholder={placeholder}
               onFocus={(e) => { setFocused(true); onFocus && onFocus(e); }}
               onBlur={(e) => { setFocused(false); onBlur && onBlur(e); }}
               style={{
                 flex: 1, border: 'none', outline: 'none', background: 'transparent',
                 fontFamily: 'var(--cs-font)', fontSize: 16, color: 'var(--cs-ink)',
               }} />
        {suffix && <div style={{ color: 'var(--cs-slate-500)', fontFamily: 'var(--cs-mono)', fontSize: 13 }}>{suffix}</div>}
      </div>
    </label>
  );
}

// ─── CARD ────────────────────────────────────────────────
function CSCard({ children, style, pad = 20, onClick, hoverable }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={() => hoverable && setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: '#fff', borderRadius: 18, padding: pad,
        border: '1px solid var(--cs-slate-100)',
        boxShadow: hover ? '0 8px 24px -10px rgba(11,18,32,.18)' : '0 1px 2px rgba(11,18,32,.03)',
        transition: 'box-shadow .18s, transform .18s',
        transform: hover ? 'translateY(-1px)' : 'none',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}>{children}</div>
  );
}

// ─── TAG / PILL ──────────────────────────────────────────
function CSTag({ children, tone = 'neutral', icon }) {
  const tones = {
    neutral: { bg: 'var(--cs-slate-100)', fg: 'var(--cs-slate-700)' },
    ink:     { bg: 'var(--cs-ink)', fg: '#fff' },
    accent:  { bg: 'rgba(201,74,27,.1)', fg: 'var(--cs-accent)' },
    ok:      { bg: 'rgba(22,107,58,.1)', fg: 'var(--cs-ok)' },
    warn:    { bg: 'rgba(168,92,0,.1)', fg: 'var(--cs-warn)' },
  }[tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      height: 24, padding: '0 10px', borderRadius: 999,
      background: tones.bg, color: tones.fg,
      fontSize: 12, fontWeight: 500, letterSpacing: -0.1,
      fontFamily: 'var(--cs-font)',
    }}>
      {icon}
      {children}
    </span>
  );
}

// ─── SEGMENT ─────────────────────────────────────────────
function CSSegment({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', padding: 4, background: 'var(--cs-slate-100)', borderRadius: 12, gap: 2 }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button key={o.value} onClick={() => onChange && onChange(o.value)}
            style={{
              flex: 1, border: 'none', cursor: 'pointer',
              height: 36, padding: '0 14px',
              background: active ? '#fff' : 'transparent',
              color: active ? 'var(--cs-ink)' : 'var(--cs-slate-500)',
              fontFamily: 'var(--cs-font)', fontSize: 14, fontWeight: 500,
              borderRadius: 9, letterSpacing: -0.1,
              boxShadow: active ? '0 1px 2px rgba(11,18,32,.08)' : 'none',
              transition: 'all .15s',
            }}>{o.label}</button>
        );
      })}
    </div>
  );
}

// ─── STEP DOTS ───────────────────────────────────────────
function CSSteps({ total, current }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{
          width: i === current ? 20 : 6, height: 6, borderRadius: 3,
          background: i <= current ? 'var(--cs-ink)' : 'var(--cs-slate-200)',
          transition: 'width .3s, background .3s',
        }} />
      ))}
    </div>
  );
}

// ─── DS SHOWCASE PANEL ───────────────────────────────────
function DesignSystem() {
  const [seg, setSeg] = React.useState('send');
  const row = (label, children) => (
    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 32, alignItems: 'flex-start', padding: '24px 0',
                  borderTop: '1px solid var(--cs-slate-100)' }}>
      <div style={{ fontSize: 11, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)',
                    letterSpacing: 1.2, textTransform: 'uppercase', paddingTop: 6 }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>{children}</div>
    </div>
  );
  return (
    <div style={{ width: 1040, background: '#fff', padding: 48, fontFamily: 'var(--cs-font)', color: 'var(--cs-ink)' }}>
      <div style={{ fontSize: 12, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)',
                    letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Design system · v1</div>
      <div style={{ fontSize: 44, fontWeight: 600, letterSpacing: -1.4, lineHeight: 1.05 }}>
        A small kit of parts.<br/>
        <span style={{ color: 'var(--cs-slate-500)' }}>Enough to ship, not enough to paint yourself into a corner.</span>
      </div>

      {row('Buttons', <>
        <CSButton kind="primary">Send a package</CSButton>
        <CSButton kind="ink">Confirm · $14</CSButton>
        <CSButton kind="secondary">Save address</CSButton>
        <CSButton kind="ghost">Cancel</CSButton>
        <CSButton kind="primary" size="sm">Small</CSButton>
        <CSButton kind="primary" size="lg">Large</CSButton>
        <CSButton kind="primary" disabled>Disabled</CSButton>
      </>)}

      {row('Inputs', <>
        <div style={{ width: 280 }}>
          <CSField label="Receiver name" value="Mei Tanaka" onChange={() => {}} icon={<Icon.user />} />
        </div>
        <div style={{ width: 280 }}>
          <CSField label="Pickup address" value="134 Princess St" onChange={() => {}} icon={<Icon.pin />} suffix="WPG" />
        </div>
      </>)}

      {row('Tags', <>
        <CSTag>Default</CSTag>
        <CSTag tone="ink">In transit</CSTag>
        <CSTag tone="accent" icon={<Icon.flash size={12}/>}>Rush</CSTag>
        <CSTag tone="ok" icon={<Icon.check size={12}/>}>Delivered</CSTag>
        <CSTag tone="warn" icon={<Icon.clock size={12}/>}>Delayed</CSTag>
      </>)}

      {row('Segmented', <div style={{ width: 320 }}>
        <CSSegment options={[{ value: 'send', label: 'Send' }, { value: 'receive', label: 'Receive' }, { value: 'biz', label: 'Business' }]}
                   value={seg} onChange={setSeg} />
      </div>)}

      {row('Cards', <>
        <CSCard style={{ width: 300 }} hoverable>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <CSTag tone="ink">In transit</CSTag>
            <span style={{ fontFamily: 'var(--cs-mono)', fontSize: 12, color: 'var(--cs-slate-500)' }}>CS—2810</span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 500 }}>Princess St → Osborne Village</div>
          <div style={{ fontSize: 13, color: 'var(--cs-slate-500)', marginTop: 4 }}>ETA 9 min · Armen Y.</div>
        </CSCard>
      </>)}

      {row('Steps', <>
        <CSSteps total={5} current={0} />
        <CSSteps total={5} current={2} />
        <CSSteps total={5} current={4} />
      </>)}

      {row('Spacing', <>
        {[4, 8, 12, 16, 24, 32, 48].map((n) => (
          <div key={n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ width: n, height: n, background: 'var(--cs-accent)' }} />
            <div style={{ fontFamily: 'var(--cs-mono)', fontSize: 11, color: 'var(--cs-slate-500)' }}>{n}</div>
          </div>
        ))}
      </>)}

      {row('Radii', <>
        {[{ n: 8, l: 's' }, { n: 14, l: 'm' }, { n: 22, l: 'l' }, { n: 999, l: '∞' }].map((r) => (
          <div key={r.l} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 52, height: 52, background: 'var(--cs-slate-100)',
                          borderRadius: r.n, border: '1px solid var(--cs-slate-200)' }} />
            <div style={{ fontFamily: 'var(--cs-mono)', fontSize: 11, color: 'var(--cs-slate-500)' }}>{r.l} · {r.n}</div>
          </div>
        ))}
      </>)}

      {row('Iconography', <>
        {['pin','package','user','phone','clock','receipt','card','shield','flash','route','truck','repeat','bell','history','send','sparkle'].map((k) => (
          <div key={k} style={{ width: 44, height: 44, border: '1px solid var(--cs-slate-200)', borderRadius: 10,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cs-ink)' }}>
            {Icon[k]({})}
          </div>
        ))}
      </>)}

      <div style={{ borderTop: '1px solid var(--cs-slate-100)', marginTop: 24, paddingTop: 28 }}>
        <div style={{ fontSize: 11, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)',
                      letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 14 }}>UX principles</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {[
            { n: '01', k: 'Under 60s', v: 'First-time send completes in five taps. Addresses predict. Price is flat.' },
            { n: '02', k: 'Repeat first', v: 'The home screen leads with "Send again" before it asks you to do anything new.' },
            { n: '03', k: 'Quiet motion', v: 'No confetti. Tiny haptic on commit. Map tracks, UI doesn\'t.' },
            { n: '04', k: 'Honest errors', v: 'Failed payment or bad address is a direct question, not a modal with a sad face.' },
          ].map((p) => (
            <div key={p.n}>
              <div style={{ fontFamily: 'var(--cs-mono)', fontSize: 11, color: 'var(--cs-slate-500)' }}>{p.n}</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginTop: 4 }}>{p.k}</div>
              <div style={{ fontSize: 13, color: 'var(--cs-slate-700)', marginTop: 4, lineHeight: 1.45 }}>{p.v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CSButton, CSField, CSCard, CSTag, CSSegment, CSSteps, DesignSystem });
