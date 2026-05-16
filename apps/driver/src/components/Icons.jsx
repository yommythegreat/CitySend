function BaseIcon({ children, size = 20, stroke = 1.8, fill = 'none', color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill={fill} stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export const Icon = {
  arrow: (props) => <BaseIcon {...props}><path d="M4 10h12" /><path d="M11 5l5 5-5 5" /></BaseIcon>,
  check: (props) => <BaseIcon {...props}><path d="M4 10.5l4 4 8-9" /></BaseIcon>,
  phone: (props) => <BaseIcon {...props}><path d="M5 3h3l2 5-2 1a8 8 0 0 0 4 4l1-2 5 2v3a2 2 0 0 1-2 2A13 13 0 0 1 3 5a2 2 0 0 1 2-2z" /></BaseIcon>,
  send: (props) => <BaseIcon {...props}><path d="M17 3 3 9l6 2 2 6 6-14z" /><path d="m9 11 4-4" /></BaseIcon>,
  flash: (props) => <BaseIcon {...props}><path d="M11 2 3 12h5l-1 6 8-10h-5l1-6z" /></BaseIcon>,
  shield: (props) => <BaseIcon {...props}><path d="m10 3 6 2v5c0 4-3 6-6 7-3-1-6-3-6-7V5l6-2z" /><path d="m7.5 10 2 2L13 8" /></BaseIcon>,
  package: (props) => <BaseIcon {...props}><path d="m10 3 7 3.5v7L10 17l-7-3.5v-7L10 3z" /><path d="m3 6.5 7 3.5 7-3.5" /><path d="M10 10v7" /></BaseIcon>,
  pin: (props) => <BaseIcon {...props}><path d="M10 17s-5-5-5-9a5 5 0 0 1 10 0c0 4-5 9-5 9z" /><circle cx="10" cy="8" r="1.8" /></BaseIcon>,
  wallet: (props) => <BaseIcon {...props}><rect x="3" y="5" width="14" height="11" rx="2" /><path d="M14 11h2" /></BaseIcon>,
  clock: (props) => <BaseIcon {...props}><circle cx="10" cy="10" r="7" /><path d="M10 6v4l3 2" /></BaseIcon>,
  star: (props) => <BaseIcon {...props}><path d="m10 3 2.3 4.7 5.2.7-3.8 3.7.9 5.2L10 14.8l-4.7 2.5.9-5.2-3.8-3.7 5.2-.7L10 3z" /></BaseIcon>,
  chevron: (props) => <BaseIcon {...props}><path d="m7 4 6 6-6 6" /></BaseIcon>,
};
