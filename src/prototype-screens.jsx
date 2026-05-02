// CitySend prototype screens — ALL screens extracted into separate components
// so prototype.jsx stays readable. Each screen takes (state, setState) style props.

// ─── SHARED: screen scaffold ───
function Screen({ children, bg = '#f5f6f8', scroll = true, style }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, background: bg,
      overflow: scroll ? 'auto' : 'hidden',
      display: 'flex', flexDirection: 'column',
      ...style,
    }}>{children}</div>
  );
}

// Top bar (in-flow, not iOS NavBar — we want tighter control for fintech feel)
function TopBar({ title, onBack, right, subtitle, solid }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', padding: '56px 20px 14px',
      gap: 14, background: solid ? '#fff' : 'transparent',
      borderBottom: solid ? '1px solid var(--cs-slate-100)' : 'none',
    }}>
      {onBack && (
        <button onClick={onBack} style={{
          width: 40, height: 40, borderRadius: 20, border: 'none', cursor: 'pointer',
          background: 'var(--cs-slate-100)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--cs-ink)" strokeWidth="2" strokeLinecap="round"><path d="M9 2L4 7l5 5"/></svg>
        </button>
      )}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: -0.3, color: 'var(--cs-ink)' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: 'var(--cs-slate-500)', fontFamily: 'var(--cs-mono)' }}>{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 1. HOME / LANDING  (merged with pickup entry)
// ═══════════════════════════════════════════════════════════
function HomeScreen({ go, state }) {
  const saved = state.savedAddresses;
  return (
    <Screen bg="var(--cs-paper)">
      {/* status-bar safe area + brand */}
      <div style={{ padding: '56px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <LogoWordmark scale={0.55} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => go('notifications')} style={iconBtnSt()}>
            <Icon.bell size={18} />
            <span style={{ position: 'absolute', top: 8, right: 8, width: 7, height: 7, background: 'var(--cs-accent)', borderRadius: '50%' }}/>
          </button>
          <button onClick={() => go('profile')} style={iconBtnSt()}><Icon.user size={18} /></button>
        </div>
      </div>

      {/* Hero */}
      <div style={{ padding: '28px 20px 16px' }}>
        <div style={{ fontFamily: 'var(--cs-mono)', fontSize: 11, color: 'var(--cs-slate-500)',
                      letterSpacing: 1.4, textTransform: 'uppercase' }}>Good afternoon, Sasha</div>
        <div style={{ fontSize: 34, fontWeight: 600, letterSpacing: -1.2, lineHeight: 1.05, marginTop: 10, color: 'var(--cs-ink)' }}>
          Across town,<br/>before lunch.
        </div>
        <div style={{ fontSize: 15, color: 'var(--cs-slate-500)', marginTop: 12, lineHeight: 1.45 }}>
          Flat $14 same-day in Winnipeg. Tap below to send anything that fits in a car.
        </div>
      </div>

      {/* Primary CTA */}
      <div style={{ padding: '8px 20px 20px' }}>
        <button onClick={() => go('new-1')} style={{
          width: '100%', padding: 20, border: 'none', cursor: 'pointer',
          background: 'var(--cs-ink)', color: '#fff', borderRadius: 20,
          display: 'flex', alignItems: 'center', gap: 14,
          boxShadow: '0 10px 30px -10px rgba(11,18,32,.5)', textAlign: 'left',
        }}>
          <div style={{ width: 44, height: 44, borderRadius: 22, background: 'var(--cs-accent)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon.send size={20} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: -0.3 }}>Send a package</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.6)', marginTop: 2 }}>Avg. pickup in 12 min</div>
          </div>
          <Icon.arrow color="#fff" />
        </button>
      </div>

      {/* Send again — repeat-user optimization */}
      {state.pastDeliveries.length > 0 && (
        <div style={{ padding: '8px 20px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)',
                          letterSpacing: 1, textTransform: 'uppercase' }}>Send again</div>
            <div style={{ fontSize: 13, color: 'var(--cs-accent)', fontWeight: 500 }}>View all</div>
          </div>
          <div style={{ display: 'flex', gap: 12, overflow: 'auto', margin: '0 -20px', padding: '0 20px' }}>
            {state.pastDeliveries.slice(0, 3).map((d, i) => (
              <button key={i} onClick={() => go('new-1', { prefill: d })} style={{
                width: 220, flexShrink: 0, textAlign: 'left', cursor: 'pointer',
                background: '#fff', border: '1px solid var(--cs-slate-100)', borderRadius: 16,
                padding: 16,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <Icon.repeat size={14} color="var(--cs-accent)" />
                  <span style={{ fontFamily: 'var(--cs-mono)', fontSize: 11, color: 'var(--cs-slate-500)',
                                 letterSpacing: 0.8, textTransform: 'uppercase' }}>{d.when}</span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--cs-ink)', letterSpacing: -0.2 }}>{d.to.name}</div>
                <div style={{ fontSize: 13, color: 'var(--cs-slate-500)', marginTop: 4 }}>{d.to.address.split(',')[0]}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Saved addresses */}
      <div style={{ padding: '8px 20px 20px' }}>
        <div style={{ fontSize: 13, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)',
                      letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Saved places</div>
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--cs-slate-100)', overflow: 'hidden' }}>
          {saved.map((a, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
              borderTop: i === 0 ? 'none' : '1px solid var(--cs-slate-100)',
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--cs-slate-100)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {a.icon === 'home' ? <Icon.home size={16}/> : a.icon === 'package' ? <Icon.package size={16}/> : <Icon.pin size={16}/>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--cs-ink)' }}>{a.label}</div>
                <div style={{ fontSize: 13, color: 'var(--cs-slate-500)' }}>{a.address}</div>
              </div>
              <Icon.chevron size={14} color="var(--cs-slate-400)" />
            </div>
          ))}
          <button style={{
            width: '100%', padding: '14px 16px', border: 'none', background: 'transparent',
            display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
            borderTop: '1px solid var(--cs-slate-100)', fontFamily: 'var(--cs-font)',
          }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--cs-slate-100)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon.plus size={16} />
            </div>
            <div style={{ fontSize: 15, color: 'var(--cs-slate-500)' }}>Add a place</div>
          </button>
        </div>
      </div>

      {/* Trust strip */}
      <div style={{ padding: '0 20px 40px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {[
          { k: 'Avg pickup', v: '12 min' },
          { k: 'On-time', v: '98.4%' },
          { k: 'Flat rate', v: '$14' },
        ].map((s) => (
          <div key={s.k} style={{ padding: 14, background: '#fff', borderRadius: 14, border: '1px solid var(--cs-slate-100)' }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)',
                          letterSpacing: 0.8, textTransform: 'uppercase' }}>{s.k}</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--cs-ink)', marginTop: 4, letterSpacing: -0.5 }}>{s.v}</div>
          </div>
        ))}
      </div>
    </Screen>
  );
}

function iconBtnSt() {
  return {
    width: 40, height: 40, borderRadius: 20, border: 'none', cursor: 'pointer',
    background: 'var(--cs-slate-100)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative', color: 'var(--cs-ink)',
  };
}

// ═══════════════════════════════════════════════════════════
// 2. NEW REQUEST — multi-step wizard in one surface
//    Steps: pickup addr → receiver → parcel → (price → pay → track live)
// ═══════════════════════════════════════════════════════════
function NewRequestScreen({ step, go, state, setDraft, draft }) {
  const stepIdx = { 'new-1': 0, 'new-2': 1, 'new-3': 2 }[step];
  const isLast = stepIdx === 2;

  const next = () => {
    if (stepIdx < 2) go(`new-${stepIdx + 2}`);
    else go('pricing');
  };
  const back = () => {
    if (stepIdx === 0) go('home');
    else go(`new-${stepIdx}`);
  };

  return (
    <Screen bg="#f5f6f8">
      <div style={{ padding: '56px 20px 10px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={back} style={iconBtnSt()}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--cs-ink)" strokeWidth="2" strokeLinecap="round"><path d="M9 2L4 7l5 5"/></svg>
        </button>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <CSSteps total={3} current={stepIdx} />
        </div>
        <div style={{ width: 40, fontFamily: 'var(--cs-mono)', fontSize: 12, color: 'var(--cs-slate-500)', textAlign: 'right' }}>
          {stepIdx + 1}/3
        </div>
      </div>

      <div style={{ padding: '20px 20px 14px' }}>
        <div style={{ fontFamily: 'var(--cs-mono)', fontSize: 11, color: 'var(--cs-slate-500)',
                      letterSpacing: 1.4, textTransform: 'uppercase' }}>
          {['Pickup', 'Drop-off', 'Parcel'][stepIdx]}
        </div>
        <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.8, marginTop: 6, color: 'var(--cs-ink)' }}>
          {[
            'Where should we grab it?',
            'Who\'s receiving it?',
            'Tell us what it is.',
          ][stepIdx]}
        </div>
      </div>

      <div style={{ flex: 1, padding: '0 20px' }}>
        {stepIdx === 0 && <PickupStep state={state} draft={draft} setDraft={setDraft} />}
        {stepIdx === 1 && <DropoffStep state={state} draft={draft} setDraft={setDraft} />}
        {stepIdx === 2 && <ParcelStep draft={draft} setDraft={setDraft} />}
      </div>

      <div style={{ padding: '16px 20px 36px', borderTop: '1px solid var(--cs-slate-100)', background: '#fff' }}>
        <CSButton kind="ink" size="lg" full onClick={next}
          icon={<Icon.arrow color="#fff" />}>
          {isLast ? 'Review & price' : 'Continue'}
        </CSButton>
      </div>
    </Screen>
  );
}

function PickupStep({ state, draft, setDraft }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <CSField label="Pickup address" value={draft.pickup.address} icon={<Icon.pin />}
               onChange={(v) => setDraft({ ...draft, pickup: { ...draft.pickup, address: v } })} />
      <CSField label="Unit / buzzer (optional)" value={draft.pickup.unit} placeholder="Apt 4B"
               onChange={(v) => setDraft({ ...draft, pickup: { ...draft.pickup, unit: v } })} />
      <CSField label="Contact name" value={draft.pickup.name} icon={<Icon.user />}
               onChange={(v) => setDraft({ ...draft, pickup: { ...draft.pickup, name: v } })} />
      <CSField label="Phone" value={draft.pickup.phone} icon={<Icon.phone />} type="tel"
               onChange={(v) => setDraft({ ...draft, pickup: { ...draft.pickup, phone: v } })} />

      <div style={{ fontSize: 12, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)',
                    letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 10 }}>Saved places</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {state.savedAddresses.map((a, i) => (
          <button key={i} onClick={() => setDraft({ ...draft, pickup: { ...draft.pickup, address: a.address, unit: '' } })}
            style={chipStyle(draft.pickup.address === a.address)}>
            {a.icon === 'home' ? <Icon.home size={14}/> : <Icon.pin size={14}/>} {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function DropoffStep({ state, draft, setDraft }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <CSField label="Receiver name" value={draft.dropoff.name} icon={<Icon.user />}
               onChange={(v) => setDraft({ ...draft, dropoff: { ...draft.dropoff, name: v } })} />
      <CSField label="Phone" value={draft.dropoff.phone} icon={<Icon.phone />} type="tel"
               onChange={(v) => setDraft({ ...draft, dropoff: { ...draft.dropoff, phone: v } })} />
      <CSField label="Drop-off address" value={draft.dropoff.address} icon={<Icon.pin />}
               onChange={(v) => setDraft({ ...draft, dropoff: { ...draft.dropoff, address: v } })} />
      <CSField label="Note for the courier" value={draft.dropoff.note} placeholder="Leave at the front desk"
               onChange={(v) => setDraft({ ...draft, dropoff: { ...draft.dropoff, note: v } })} />
    </div>
  );
}

function ParcelStep({ draft, setDraft }) {
  const sizes = [
    { v: 's', l: 'Small', d: 'Envelope, keys, documents' },
    { v: 'm', l: 'Medium', d: 'Shoebox — up to 10 lb' },
    { v: 'l', l: 'Large', d: 'Backpack-ish — up to 30 lb' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <div style={{ fontSize: 12, fontFamily: 'var(--cs-mono)', color: 'var(--cs-slate-500)',
                      letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>Parcel size</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sizes.map((s) => {
            const active = draft.parcel.size === s.v;
            return (
              <button key={s.v} onClick={() => setDraft({ ...draft, parcel: { ...draft.parcel, size: s.v } })}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: 16,
                  background: '#fff', border: `1.5px solid ${active ? 'var(--cs-ink)' : 'var(--cs-slate-200)'}`,
                  borderRadius: 14, cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--cs-font)',
                }}>
                <div style={{ width: 20, height: 20, borderRadius: 10,
                              border: `2px solid ${active ? 'var(--cs-ink)' : 'var(--cs-slate-300)'}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {active && <div style={{ width: 10, height: 10, borderRadius: 5, background: 'var(--cs-ink)' }}/>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--cs-ink)' }}>{s.l}</div>
                  <div style={{ fontSize: 13, color: 'var(--cs-slate-500)', marginTop: 2 }}>{s.d}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <CSField label="What's inside?" value={draft.parcel.desc} placeholder="Birthday cake"
               onChange={(v) => setDraft({ ...draft, parcel: { ...draft.parcel, desc: v } })} />

      <button onClick={() => setDraft({ ...draft, parcel: { ...draft.parcel, fragile: !draft.parcel.fragile } })}
        style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: 14,
          background: '#fff', border: '1px solid var(--cs-slate-200)', borderRadius: 12,
          cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--cs-font)',
        }}>
        <div style={{
          width: 44, height: 26, borderRadius: 13, padding: 2,
          background: draft.parcel.fragile ? 'var(--cs-ink)' : 'var(--cs-slate-200)',
          transition: 'background .18s', display: 'flex',
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: 11, background: '#fff',
            transform: draft.parcel.fragile ? 'translateX(18px)' : 'translateX(0)',
            transition: 'transform .18s',
          }}/>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--cs-ink)' }}>Fragile</div>
          <div style={{ fontSize: 12, color: 'var(--cs-slate-500)' }}>Handled with extra care</div>
        </div>
      </button>
    </div>
  );
}

function chipStyle(active) {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 14px', border: `1px solid ${active ? 'var(--cs-ink)' : 'var(--cs-slate-200)'}`,
    background: active ? 'var(--cs-ink)' : '#fff', color: active ? '#fff' : 'var(--cs-ink)',
    borderRadius: 999, fontSize: 13, fontWeight: 500, cursor: 'pointer',
    fontFamily: 'var(--cs-font)',
  };
}

Object.assign(window, { Screen, TopBar, HomeScreen, NewRequestScreen, iconBtnSt, chipStyle });
