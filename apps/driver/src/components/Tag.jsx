import { Icon } from './Icons.jsx';

const tones = {
  neutral: ['var(--cs-slate-100)', 'var(--cs-slate-700)'],
  ink: ['var(--cs-ink)', '#fff'],
  accent: ['rgba(201, 74, 27, .1)', 'var(--cs-accent)'],
  ok: ['rgba(22, 107, 58, .1)', 'var(--cs-ok)'],
  warn: ['rgba(168, 92, 0, .1)', 'var(--cs-warn)'],
};

export function Tag({ children, tone = 'neutral', icon }) {
  const [background, color] = tones[tone] ?? tones.neutral;

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      height: 24,
      padding: '0 10px',
      borderRadius: 999,
      background,
      color,
      fontSize: 12,
      fontWeight: 650,
    }}>
      {icon}
      {children}
    </span>
  );
}

export function StatusTag({ status }) {
  if (status === 'online') return <Tag tone="ok" icon={<Icon.flash size={12} />}>Online</Tag>;
  return <Tag>Offline</Tag>;
}
