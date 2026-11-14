import { useEffect, useReducer, useState } from 'react';
import { fmtDay, TODAY } from './data';
import { initial, reducer } from './store';
import { Avatar, Icon } from './ui';
import { Calendar, Drawer, FollowUps, Messages, Patients, Today, type Filter } from './views';

type View = 'today' | 'patients' | 'calendar' | 'follow' | 'messages';
const NAV: [View, string, string][] = [
  ['today', 'Today', 'home'],
  ['patients', 'Patients', 'users'],
  ['calendar', 'Calendar', 'calendar'],
  ['follow', 'Follow-ups', 'path'],
  ['messages', 'Messages', 'chat'],
];
// Deep link for demos: #patients or #patients:p4 (opens that patient).
const [hashView, hashOpen] = location.hash.slice(1).split(':');
const startView = (): View => (NAV.find(([v]) => v === hashView)?.[0] ?? 'today');

export default function App() {
  const [s, dispatch] = useReducer(reducer, undefined, initial);
  const [view, setView] = useState<View>(startView);
  const [openId, setOpenId] = useState<string | null>(hashOpen || null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const d = fmtDay(TODAY);

  useEffect(() => {
    if (!s.toast) return;
    const t = setTimeout(() => dispatch({ type: 'toast', text: '' }), 2600);
    return () => clearTimeout(t);
  }, [s.toast]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenId(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const badge: Partial<Record<View, number>> = {
    messages: s.appts.filter((a) => a.msg === 'draft').length,
    follow: s.cases.filter((c) => c.stage !== 'treated' && c.dueBy < TODAY).length,
  };
  const props = { s, dispatch, open: setOpenId, show: (f: Filter) => { setFilter(f); setView('patients'); } };
  const title = NAV.find(([v]) => v === view)![1];

  return (
    <div className="app">
      <nav className="side" aria-label="Main">
        <div className="logo">
          <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
            <rect width="30" height="30" rx="9" fill="var(--brand)" />
            <path d="M7 20a8 8 0 0 1 16 0" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
            <circle cx="15" cy="20" r="2.2" fill="#fff" />
          </svg>
          <span>Kaari</span>
        </div>
        {NAV.map(([v, label, icon]) => (
          <button key={v} className={`nav${view === v ? ' on' : ''}`} aria-current={view === v ? 'page' : undefined} onClick={() => setView(v)}>
            <Icon name={icon} size={20} />
            <span>{label}</span>
            {!!badge[v] && <em>{badge[v]}</em>}
          </button>
        ))}
        <div className="side-foot">Demo data<br />No real patients</div>
      </nav>

      <main>
        <header className="top">
          <div>
            <h1>{view === 'today' ? 'Good morning, Sanna' : title}</h1>
            <p className="muted">{d.wd === 'Mon' ? 'Monday' : d.wd} {d.day} {d.mo} · Helsinki screening unit</p>
          </div>
          <label className="search">
            <Icon name="search" size={16} />
            <input
              placeholder="Find a patient"
              value={query}
              aria-label="Find a patient"
              onChange={(e) => { setQuery(e.target.value); if (e.target.value) setView('patients'); }}
            />
          </label>
          <div className="me"><Avatar name="Sanna Niemi" /><div><b>Sanna Niemi</b><span>Screening nurse</span></div></div>
        </header>

        {view === 'today' && <Today {...props} />}
        {view === 'patients' && <Patients {...props} query={query} filter={filter} setFilter={setFilter} />}
        {view === 'calendar' && <Calendar {...props} />}
        {view === 'follow' && <FollowUps {...props} />}
        {view === 'messages' && <Messages {...props} />}
      </main>

      {openId && <Drawer s={s} dispatch={dispatch} patientId={openId} close={() => setOpenId(null)} />}
      <div className={`toast${s.toast ? ' show' : ''}`} role="status"><Icon name="check" size={16} />{s.toast}</div>
    </div>
  );
}
