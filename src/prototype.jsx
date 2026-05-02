// CitySend prototype — state + router + device frame wrapper

const INITIAL_DRAFT = {
  pickup: { address: '134 Princess St, Exchange District', unit: '', name: 'Sasha Novak', phone: '204 555 0199' },
  dropoff: { address: '88 Osborne St, Osborne Village', name: 'Mei Tanaka', phone: '204 555 0148', note: 'Leave at the front desk' },
  parcel: { size: 'm', desc: 'Birthday cake — chocolate', fragile: true },
};

const INITIAL_STATE = {
  savedAddresses: [
    { label: 'Home', address: '134 Princess St, Winnipeg MB', icon: 'home' },
    { label: 'Studio', address: '245 McDermot Ave #301', icon: 'package' },
    { label: 'Mom\'s', address: '1220 Grosvenor Ave', icon: 'pin' },
  ],
  pastDeliveries: [
    { id: '2788', to: { name: 'J. Morissette', address: '412 Academy Rd, River Heights' }, date: 'Apr 22', price: '15.68', status: 'delivered', when: 'Yesterday' },
    { id: '2745', to: { name: 'The Forks Market', address: '1 Forks Market Rd' },           date: 'Apr 19', price: '15.68', status: 'delivered', when: 'Fri' },
    { id: '2712', to: { name: 'Prairie Ink Books', address: '1120 Grant Ave, Grant Park' }, date: 'Apr 15', price: '15.68', status: 'delivered', when: 'Apr 15' },
    { id: '2698', to: { name: 'Bodegoes (Polo Park)', address: '1485 Portage Ave' },         date: 'Apr 12', price: '15.68', status: 'canceled', when: 'Apr 12' },
  ],
};

function Prototype({ accent = '#c94a1b', mapStyle = 'light', initialScreen = 'home' }) {
  const [screen, setScreen] = React.useState(initialScreen);
  const [state, setState] = React.useState(INITIAL_STATE);
  const [draft, setDraft] = React.useState(INITIAL_DRAFT);
  const [transition, setTransition] = React.useState({ from: null, dir: 1 });
  const prev = React.useRef(initialScreen);

  const go = React.useCallback((next, opts = {}) => {
    if (opts.prefill) {
      setDraft({ ...INITIAL_DRAFT, dropoff: { ...INITIAL_DRAFT.dropoff, ...opts.prefill.to, note: '' } });
    }
    if (next === 'home' && screen === 'tracking') {
      // reset draft when coming home from tracking
      setTimeout(() => setDraft(INITIAL_DRAFT), 300);
    }
    setTransition({ from: prev.current, dir: orderIndex(next) > orderIndex(prev.current) ? 1 : -1 });
    prev.current = next;
    setScreen(next);
  }, [screen]);

  const screenNode = (s) => {
    switch (s) {
      case 'home':          return <HomeScreen go={go} state={state} />;
      case 'new-1':
      case 'new-2':
      case 'new-3':         return <NewRequestScreen step={s} go={go} state={state} draft={draft} setDraft={setDraft} />;
      case 'pricing':       return <PricingScreen go={go} draft={draft} />;
      case 'pay':           return <PaymentScreen go={go} state={state} setState={setState} />;
      case 'tracking':      return <TrackingScreen go={go} state={state} mapStyle={mapStyle} />;
      case 'history':       return <HistoryScreen go={go} state={state} />;
      case 'notifications': return <NotificationsScreen go={go} />;
      case 'profile':       return <HistoryScreen go={go} state={state} />;
      default:              return <HomeScreen go={go} state={state} />;
    }
  };

  return (
    <div style={{ '--cs-accent': accent, position: 'relative', width: '100%', height: '100%' }}>
      {screenNode(screen)}

      {/* Tab bar — floating */}
      {['home', 'history', 'notifications'].includes(screen) && (
        <TabBar screen={screen} go={go} />
      )}
    </div>
  );
}

function orderIndex(s) {
  return { home: 0, 'new-1': 1, 'new-2': 2, 'new-3': 3, pricing: 4, pay: 5, tracking: 6, history: 0, notifications: 0 }[s] ?? 0;
}

function TabBar({ screen, go }) {
  const tabs = [
    { k: 'home', l: 'Home', i: Icon.home },
    { k: 'history', l: 'History', i: Icon.history },
    { k: 'notifications', l: 'Alerts', i: Icon.bell },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
      background: 'var(--cs-ink)', borderRadius: 28, padding: 6,
      display: 'flex', gap: 4, zIndex: 50,
      boxShadow: '0 20px 40px -10px rgba(11,18,32,.35)',
    }}>
      {tabs.map((t) => {
        const active = screen === t.k;
        return (
          <button key={t.k} onClick={() => go(t.k)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: active ? '12px 18px' : '12px 14px',
            border: 'none', cursor: 'pointer', borderRadius: 22,
            background: active ? 'var(--cs-accent)' : 'transparent',
            color: active ? '#fff' : 'rgba(255,255,255,.55)',
            fontFamily: 'var(--cs-font)', fontSize: 13, fontWeight: 500,
            transition: 'all .18s',
          }}>
            {t.i({ size: 17 })}
            {active && <span>{t.l}</span>}
          </button>
        );
      })}
    </div>
  );
}

Object.assign(window, { Prototype });
