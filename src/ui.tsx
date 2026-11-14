import type { ReactNode } from 'react';
import { tier, type Lang, type Patient } from './data';

const PATHS: Record<string, string> = {
  home: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  users: 'M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM21 19v-1a4 4 0 0 0-3-3.9M15.5 3.2a3.5 3.5 0 0 1 0 6.6',
  calendar: 'M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z',
  path: 'M5 6a2 2 0 1 0 0-.01M19 18a2 2 0 1 0 0-.01M7 6h7a4 4 0 0 1 0 8h-4a4 4 0 0 0 0 8h7',
  chat: 'M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-9l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z',
  phone: 'M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  send: 'M4 12l16-8-6 16-3-7z',
  clock: 'M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
  spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z',
  x: 'M6 6l12 12M18 6L6 18',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M6 11h12a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1z',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
  alert: 'M12 8v5M12 16.5v.01M10.3 3.9L2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
};

export function Icon({ name, size = 18 }: { name: keyof typeof PATHS | string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}

const HUES = [262, 12, 168, 210, 38, 330, 142, 290];
export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const parts = name.split(' ');
  const hue = HUES[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % HUES.length];
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.38, background: `hsl(${hue} 70% 92%)`, color: `hsl(${hue} 55% 32%)` }} aria-hidden="true">
      {parts[0][0]}
      {parts[parts.length - 1][0]}
    </span>
  );
}

const CODE: Record<Lang, string> = { Finnish: 'FI', Swedish: 'SV', English: 'EN', Russian: 'RU', Estonian: 'ET', Arabic: 'AR' };
export const LangChip = ({ lang }: { lang: Lang }) => (
  <span className="chip lang" title={lang}>
    {CODE[lang]}
  </span>
);

export function Risk({ p, label = false }: { p: Patient; label?: boolean }) {
  const t = tier(p.risk);
  return (
    <span className={`risk ${t}`} title={`${p.risk}% chance of missing`}>
      <i />
      {label ? (t === 'high' ? 'Likely to miss' : t === 'mid' ? 'Might miss' : 'Likely to come') : `${p.risk}%`}
    </span>
  );
}

export const Chip = ({ children, tone = '' }: { children: ReactNode; tone?: string }) => <span className={`chip ${tone}`}>{children}</span>;

export function Phone({ text, sender = 'Screening unit', rtl = false, status }: { text: string; sender?: string; rtl?: boolean; status?: string }) {
  return (
    <div className="phone" role="img" aria-label="Message preview">
      <div className="phone-top">
        <span className="phone-dot" />
        {sender}
      </div>
      <div className="phone-body">
        <div className="bubble" dir={rtl ? 'rtl' : 'ltr'}>{text}</div>
        {status && <div className="bubble-meta">{status}</div>}
      </div>
    </div>
  );
}

export function Ring({ value, goal, size = 132 }: { value: number; goal: number; size?: number }) {
  const r = size / 2 - 10;
  const c = 2 * Math.PI * r;
  const a = (goal / 100) * 2 * Math.PI - Math.PI / 2;
  const cx = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${value} percent attended, goal ${goal} percent`}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--line)" strokeWidth="10" />
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--brand)" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(value / 100) * c} ${c}`} transform={`rotate(-90 ${cx} ${cx})`} />
      <circle cx={cx + r * Math.cos(a)} cy={cx + r * Math.sin(a)} r="5" fill="var(--panel)" stroke="var(--ink)" strokeWidth="2" />
      <text x={cx} y={cx + 2} textAnchor="middle" className="ring-num">{value}%</text>
      <text x={cx} y={cx + 20} textAnchor="middle" className="ring-sub">goal {goal}%</text>
    </svg>
  );
}
