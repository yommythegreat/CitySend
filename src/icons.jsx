// CitySend icon set — 20×20, 1.6 stroke, rounded ends
// Consistent visual weight. Never use emoji. Never auto-generate.

const CSIcon = ({ d, size = 20, stroke = 1.6, fill = 'none', color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill={fill === 'none' ? 'none' : color}
       stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);

const Icon = {
  arrow: (p) => <CSIcon {...p} d={<><path d="M4 10h12"/><path d="M11 5l5 5-5 5"/></>} />,
  arrowUp: (p) => <CSIcon {...p} d={<><path d="M10 16V4"/><path d="M5 9l5-5 5 5"/></>} />,
  chevron: (p) => <CSIcon {...p} d={<path d="M7 4l6 6-6 6"/>} />,
  chevronDown: (p) => <CSIcon {...p} d={<path d="M4 7l6 6 6-6"/>} />,
  check: (p) => <CSIcon {...p} d={<path d="M4 10.5l4 4 8-9"/>} />,
  x: (p) => <CSIcon {...p} d={<><path d="M5 5l10 10"/><path d="M15 5L5 15"/></>} />,
  plus: (p) => <CSIcon {...p} d={<><path d="M10 4v12"/><path d="M4 10h12"/></>} />,
  pin: (p) => <CSIcon {...p} d={<><path d="M10 17s-5-5-5-9a5 5 0 0110 0c0 4-5 9-5 9z"/><circle cx="10" cy="8" r="1.8"/></>} />,
  package: (p) => <CSIcon {...p} d={<><path d="M10 3L3 6.5v7L10 17l7-3.5v-7L10 3z"/><path d="M3 6.5L10 10l7-3.5"/><path d="M10 10v7"/></>} />,
  user: (p) => <CSIcon {...p} d={<><circle cx="10" cy="7" r="3"/><path d="M4 17c0-3 3-5 6-5s6 2 6 5"/></>} />,
  phone: (p) => <CSIcon {...p} d={<path d="M5 3h3l2 5-2 1a8 8 0 004 4l1-2 5 2v3a2 2 0 01-2 2A13 13 0 013 5a2 2 0 012-2z"/>} />,
  home: (p) => <CSIcon {...p} d={<><path d="M3 9l7-6 7 6v8a1 1 0 01-1 1H4a1 1 0 01-1-1V9z"/><path d="M8 17v-5h4v5"/></>} />,
  clock: (p) => <CSIcon {...p} d={<><circle cx="10" cy="10" r="7"/><path d="M10 6v4l3 2"/></>} />,
  receipt: (p) => <CSIcon {...p} d={<><path d="M5 3h10v14l-2.5-2-2.5 2-2.5-2L5 17V3z"/><path d="M8 7h4M8 10h4"/></>} />,
  card: (p) => <CSIcon {...p} d={<><rect x="3" y="5" width="14" height="10" rx="2"/><path d="M3 9h14"/></>} />,
  lock: (p) => <CSIcon {...p} d={<><rect x="4" y="9" width="12" height="8" rx="1.5"/><path d="M7 9V6a3 3 0 016 0v3"/></>} />,
  bell: (p) => <CSIcon {...p} d={<><path d="M6 8a4 4 0 018 0c0 5 2 6 2 6H4s2-1 2-6z"/><path d="M8.5 17a1.5 1.5 0 003 0"/></>} />,
  history: (p) => <CSIcon {...p} d={<><path d="M3 10a7 7 0 107-7 7 7 0 00-5 2L3 3v4h4"/><path d="M10 6v4l3 2"/></>} />,
  send: (p) => <CSIcon {...p} d={<><path d="M17 3L3 9l6 2 2 6 6-14z"/><path d="M9 11l4-4"/></>} />,
  flash: (p) => <CSIcon {...p} d={<path d="M11 2L3 12h5l-1 6 8-10h-5l1-6z"/>} />,
  shield: (p) => <CSIcon {...p} d={<><path d="M10 3l6 2v5c0 4-3 6-6 7-3-1-6-3-6-7V5l6-2z"/><path d="M7.5 10l2 2 3.5-4"/></>} />,
  route: (p) => <CSIcon {...p} d={<><circle cx="5" cy="5" r="2"/><circle cx="15" cy="15" r="2"/><path d="M5 7v3a3 3 0 003 3h4a3 3 0 013 3"/></>} />,
  map: (p) => <CSIcon {...p} d={<><path d="M3 5l5-2 4 2 5-2v12l-5 2-4-2-5 2V5z"/><path d="M8 3v14M12 5v14"/></>} />,
  truck: (p) => <CSIcon {...p} d={<><path d="M2 6h10v8H2z"/><path d="M12 9h4l2 3v2h-6"/><circle cx="6" cy="15" r="1.5"/><circle cx="14" cy="15" r="1.5"/></>} />,
  repeat: (p) => <CSIcon {...p} d={<><path d="M4 7h10l-3-3M16 13H6l3 3"/></>} />,
  star: (p) => <CSIcon {...p} d={<path d="M10 3l2.3 4.7 5.2.7-3.8 3.7.9 5.2L10 14.8l-4.7 2.5.9-5.2L2.4 8.4l5.2-.7L10 3z"/>} />,
  search: (p) => <CSIcon {...p} d={<><circle cx="9" cy="9" r="5"/><path d="M13 13l4 4"/></>} />,
  sparkle: (p) => <CSIcon {...p} d={<><path d="M10 3v4M10 13v4M3 10h4M13 10h4"/><path d="M6 6l2 2M12 12l2 2M14 6l-2 2M8 12l-2 2"/></>} />,
  menu: (p) => <CSIcon {...p} d={<><path d="M4 6h12M4 10h12M4 14h12"/></>} />,
  wallet: (p) => <CSIcon {...p} d={<><rect x="3" y="5" width="14" height="11" rx="2"/><path d="M14 11h2"/></>} />,
};

Object.assign(window, { Icon, CSIcon });
