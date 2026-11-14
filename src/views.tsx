import { useState, type Dispatch } from 'react';
import { fmtDay, fmtShort, GAPS, GOAL, isDomestic, tier, TODAY, WEEK, type Appt, type Case, type Lang, type Patient, type Stage } from './data';
import { basis, compose, composeSecure, KIND_LABEL } from './messages';
import { daysLeft, type Action, type State } from './store';
import { Avatar, Chip, Icon, LangChip, Phone, Ring, Risk } from './ui';

export interface ViewProps {
  s: State;
  dispatch: Dispatch<Action>;
  open: (patientId: string) => void;
  /** Jump to the patient list with a filter on. */
  show: (f: Filter) => void;
}

const byId = (s: State, id: string) => s.patients.find((p) => p.id === id)!;
const MSG_TONE = { draft: 'amber', scheduled: 'sky', sent: 'mint' } as const;
const MSG_TEXT = { draft: 'Needs approval', scheduled: 'Scheduled', sent: 'Sent' } as const;

/* ------------------------------ Today ------------------------------ */

export function Today({ s, dispatch, open, show }: ViewProps) {
  const today = s.appts.filter((a) => a.date === TODAY && a.status !== 'rebooked');
  const drafts = s.appts.filter((a) => a.msg === 'draft');
  const queued = s.appts.filter((a) => a.msg !== 'sent' && a.status === 'booked');
  const risky = s.appts.filter((a) => a.status === 'booked' && a.date >= TODAY && byId(s, a.patientId).risk >= 50);
  const due = s.cases.filter((c) => c.stage !== 'treated' && daysLeft(c.dueBy) <= 7);

  const tasks = [
    ...s.appts.filter((a) => a.status === 'missed').map((a) => ({ key: 'r' + a.id, p: byId(s, a.patientId), tone: 'coral', text: `Missed ${fmtShort(a.date)}`, btn: 'Rebook', icon: 'calendar', act: () => dispatch({ type: 'rebook', apptId: a.id }) })),
    ...due.filter((c) => !c.nudged).map((c) => {
      const d = daysLeft(c.dueBy);
      return { key: 'n' + c.patientId, p: byId(s, c.patientId), tone: d < 0 ? 'coral' : 'amber', text: d < 0 ? `Follow-up ${-d} day${d === -1 ? '' : 's'} late` : d === 0 ? 'Follow-up due today' : `Follow-up due in ${d} day${d === 1 ? '' : 's'}`, btn: 'Nudge', icon: 'send', act: () => dispatch({ type: 'nudge', patientId: c.patientId }) };
    }),
    ...risky.filter((a) => !byId(s, a.patientId).called).slice(0, 5).map((a) => ({ key: 'c' + a.id, p: byId(s, a.patientId), tone: 'amber', text: `Likely to miss ${fmtShort(a.date)} ${a.time}`, btn: 'Log call', icon: 'phone', act: () => dispatch({ type: 'call', patientId: a.patientId }) })),
  ];
  const total = tasks.length + s.doneToday + (drafts.length ? 1 : 0);
  const langs = Object.entries(s.patients.reduce<Record<string, number>>((m, p) => ({ ...m, [p.lang]: (m[p.lang] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1]);

  return (
    <>
      <div className="stats">
        <Stat icon="calendar" tone="brand" n={today.length} label="Appointments today" />
        <Stat icon="chat" tone="sky" n={queued.length} label="Messages queued" />
        <Stat icon="alert" tone="amber" n={risky.length} label="Likely to miss" />
        <Stat icon="path" tone="coral" n={due.length} label="Follow-ups due" />
      </div>

      <Gap s={s} show={show} />

      <div className="cols">
        <section className="panel">
          <header className="panel-head">
            <h2>Needs you today</h2>
            <span className="progress" aria-label={`${s.doneToday} of ${total} done`}>
              <i style={{ width: `${total ? (s.doneToday / total) * 100 : 100}%` }} />
            </span>
            <span className="muted">{s.doneToday}/{total}</span>
          </header>
          <ul className="tasks">
            {drafts.length > 0 && (
              <li className="task ai">
                <span className="task-ico"><Icon name="spark" /></span>
                <div className="task-main">
                  <b>{drafts.length} messages drafted by AI</b>
                  <span>Ready in {new Set(drafts.map((a) => byId(s, a.patientId).lang)).size} languages</span>
                </div>
                <button className="btn" onClick={() => dispatch({ type: 'approveAll' })}><Icon name="check" size={16} />Approve all</button>
              </li>
            )}
            {tasks.map((t) => (
              <li className="task" key={t.key}>
                <button className="plain" onClick={() => open(t.p.id)} aria-label={`Open ${t.p.name}`}><Avatar name={t.p.name} /></button>
                <div className="task-main">
                  <b>{t.p.name} <LangChip lang={t.p.lang} /></b>
                  <span className={`dotline ${t.tone}`}>{t.text}</span>
                </div>
                <button className="btn soft" onClick={t.act}><Icon name={t.icon} size={16} />{t.btn}</button>
              </li>
            ))}
            {tasks.length === 0 && drafts.length === 0 && <li className="empty"><Icon name="check" size={28} />All done for today</li>}
          </ul>
        </section>

        <div className="stack">
          <section className="panel center">
            <h2>Attendance this month</h2>
            <Ring value={76} goal={80} />
            <p className="muted">4 points to the national goal</p>
          </section>
          <section className="panel">
            <h2>Patients by language</h2>
            <div className="bars">
              {langs.map(([l, n]) => (
                <div className="bar" key={l}>
                  <span>{l}</span>
                  <div className="track"><i style={{ width: `${(n / langs[0][1]) * 100}%` }} /></div>
                  <b>{n}</b>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

/* ------------------------------ The gap ------------------------------ */

const GAP_ROWS: { key: 'lang' | 'edu'; filter: Filter; inGroup: (p: Patient) => boolean; fix: string[] }[] = [
  { key: 'lang', filter: 'lang', inGroup: (p) => !isDomestic(p.lang), fix: ['Invite in mother tongue', 'Interpreter on request'] },
  { key: 'edu', filter: 'edu', inGroup: (p) => p.edu === 'Basic', fix: ['Plain-language invite', 'Phone call', 'Second fixed time'] },
];

function Gap({ s, show }: { s: State; show: (f: Filter) => void }) {
  return (
    <section className="panel">
      <header className="panel-head">
        <h2>Who is being missed</h2>
        <span className="muted small push">{GAPS.source}</span>
      </header>
      <div className="gaps">
        {GAP_ROWS.map(({ key, filter, inGroup, fix }) => {
          const g = GAPS[key];
          const n = s.patients.filter(inGroup).length;
          const need = Math.ceil((n * (GOAL - g.lo[1])) / 100);
          return (
            <div className="gap" key={key}>
              <div className="gap-head">
                <b>{g.title}</b>
                <Chip tone="coral">{g.hi[1] - g.lo[1]} points apart</Chip>
              </div>
              <div className="gbars" role="img" aria-label={`${g.hi[0]} ${g.hi[1]} percent, ${g.lo[0]} ${g.lo[1]} percent, goal ${GOAL} percent`}>
                <span className="goal" style={{ left: `${GOAL}%` }}><em>goal {GOAL}%</em></span>
                {[g.hi, g.lo].map(([label, pct], i) => (
                  <div className="gbar" key={label}>
                    <div className="gtrack"><i className={i ? 'coral' : 'mint'} style={{ width: `${pct}%` }} /></div>
                    <span>{label}</span>
                    <b className={i ? 'coral' : ''}>{pct}%</b>
                  </div>
                ))}
              </div>
              <div className="gap-do">
                <div>
                  <b>{need} more of your {n} must attend</b>
                  <span>to lift this group from {g.lo[1]}% to {GOAL}%</span>
                </div>
                <button className="btn soft" onClick={() => show(filter)}>Show them<Icon name="arrow" size={16} /></button>
              </div>
              <div className="chips left">{fix.map((f) => <Chip key={f}>{f}</Chip>)}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Stat({ icon, tone, n, label }: { icon: string; tone: string; n: number; label: string }) {
  return (
    <div className="stat">
      <span className={`stat-ico ${tone}`}><Icon name={icon} size={20} /></span>
      <div><b>{n}</b><span>{label}</span></div>
    </div>
  );
}

/* ------------------------------ Patients ------------------------------ */

export type Filter = 'all' | 'risk' | 'missed' | 'follow' | 'lang' | 'edu';
const FILTERS: [Filter, string][] = [['all', 'All'], ['risk', 'Likely to miss'], ['missed', 'Missed'], ['follow', 'In follow-up'], ['lang', 'Other mother tongue'], ['edu', 'Basic education']];

export function nextAppt(s: State, pid: string): Appt | undefined {
  const mine = s.appts.filter((a) => a.patientId === pid && a.status !== 'rebooked');
  return mine.find((a) => a.status === 'booked' && a.date >= TODAY) ?? mine[mine.length - 1];
}

export function Patients({ s, open, query, filter, setFilter }: ViewProps & { query: string; filter: Filter; setFilter: (f: Filter) => void }) {
  const match = (p: Patient) => {
    if (query && !p.name.toLowerCase().includes(query.toLowerCase())) return false;
    if (filter === 'risk') return p.risk >= 50;
    if (filter === 'missed') return s.appts.some((a) => a.patientId === p.id && a.status === 'missed');
    if (filter === 'follow') return s.cases.some((c) => c.patientId === p.id && c.stage !== 'treated');
    if (filter === 'lang') return !isDomestic(p.lang);
    if (filter === 'edu') return p.edu === 'Basic';
    return true;
  };
  const list = s.patients.filter(match);
  return (
    <section className="panel flush">
      <div className="filters" role="group" aria-label="Filter patients">
        {FILTERS.map(([f, label]) => (
          <button key={f} className={`pilltab${filter === f ? ' on' : ''}`} aria-pressed={filter === f} onClick={() => setFilter(f)}>{label}</button>
        ))}
        <span className="muted push">{list.length} patients</span>
      </div>
      <div className="table-wrap">
        <table className="grid">
          <thead><tr><th>Patient</th><th>Language</th><th>Next appointment</th><th>Message</th><th>Attendance</th></tr></thead>
          <tbody>
            {list.map((p) => {
              const a = nextAppt(s, p.id);
              return (
                <tr key={p.id} tabIndex={0} onClick={() => open(p.id)} onKeyDown={(e) => e.key === 'Enter' && open(p.id)}>
                  <td><div className="who"><Avatar name={p.name} /><div><b>{p.name}</b><span>{p.age} · {p.area}</span></div></div></td>
                  <td><LangChip lang={p.lang} /> <span className="muted">{p.lang}</span></td>
                  <td>{a ? <ApptCell a={a} /> : <span className="muted">None</span>}</td>
                  <td>{a ? <Chip tone={MSG_TONE[a.msg]}>{MSG_TEXT[a.msg]}</Chip> : '–'}</td>
                  <td><Risk p={p} label /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {list.length === 0 && <p className="empty">No patients match</p>}
      </div>
    </section>
  );
}

function ApptCell({ a }: { a: Appt }) {
  if (a.status === 'missed') return <span className="dotline coral">Missed {fmtShort(a.date)}</span>;
  if (a.status === 'attended') return <span className="dotline mint">Attended {fmtShort(a.date)}</span>;
  return (
    <span className={`dotline ${a.kind === 'followup' ? 'sky' : 'brand'}`}>
      {fmtShort(a.date)} · {a.time}
    </span>
  );
}

/* ------------------------------ Calendar ------------------------------ */

export function Calendar({ s, open }: ViewProps) {
  return (
    <section className="panel flush">
      <div className="filters">
        <span className="legend"><i className="brand" />Screening</span>
        <span className="legend"><i className="sky" />Follow-up</span>
        <span className="legend"><i className="amber" />Likely to miss</span>
        <span className="muted push">Week 47</span>
      </div>
      <div className="week">
        {WEEK.map((d) => {
          const f = fmtDay(d);
          const items = s.appts.filter((a) => a.date === d && a.status !== 'rebooked');
          return (
            <div className={`day${d === TODAY ? ' today' : ''}`} key={d}>
              <header><span>{f.wd}</span><b>{f.day}</b></header>
              {items.map((a) => {
                const p = byId(s, a.patientId);
                const risky = a.status === 'booked' && tier(p.risk) === 'high';
                return (
                  <button key={a.id} className={`slot ${a.kind} ${a.status}${risky ? ' risky' : ''}`} onClick={() => open(p.id)}>
                    <span className="slot-time">{a.time}</span>
                    <b>{p.name}</b>
                    <span className="slot-meta">{a.status === 'attended' ? 'Attended' : a.status === 'missed' ? 'Missed' : a.kind === 'followup' ? 'Follow-up' : a.site}</span>
                  </button>
                );
              })}
              {items.length === 0 && <p className="muted small">No appointments</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------ Follow-ups ------------------------------ */

const STAGES: [Stage, string, string][] = [
  ['tests', 'Further tests', 'Recalled after screening'],
  ['referred', 'Referred', 'Waiting for a treatment date'],
  ['booked', 'Treatment booked', 'Date confirmed'],
  ['treated', 'Treatment started', 'Pathway complete'],
];

export function FollowUps({ s, dispatch, open }: ViewProps) {
  return (
    <div className="board">
      {STAGES.map(([stage, title, sub]) => {
        const cards = s.cases.filter((c) => c.stage === stage).sort((a, b) => daysLeft(a.dueBy) - daysLeft(b.dueBy));
        return (
          <section className="lane" key={stage}>
            <header><h2>{title}</h2><span className="count">{cards.length}</span></header>
            <p className="muted small">{sub}</p>
            {cards.map((c) => <CaseCard key={c.patientId} c={c} p={byId(s, c.patientId)} dispatch={dispatch} open={open} />)}
            {cards.length === 0 && <p className="lane-empty">Nobody here</p>}
          </section>
        );
      })}
    </div>
  );
}

function CaseCard({ c, p, dispatch, open }: { c: Case; p: Patient; dispatch: Dispatch<Action>; open: (id: string) => void }) {
  const left = daysLeft(c.dueBy);
  const span = Math.max(1, daysLeft(c.dueBy) - daysLeft(c.since));
  const used = Math.min(100, Math.max(4, ((span - left) / span) * 100));
  const tone = left < 0 ? 'coral' : left <= 7 ? 'amber' : 'mint';
  const done = c.stage === 'treated';
  return (
    <article className={`case ${done ? 'done' : tone}`}>
      <button className="plain who" onClick={() => open(p.id)}>
        <Avatar name={p.name} size={32} />
        <div><b>{p.name}</b><span>{p.age} · {p.lang}</span></div>
      </button>
      {done ? (
        <span className="dotline mint">Started on time</span>
      ) : (
        <>
          <div className="meter"><i className={tone} style={{ width: `${used}%` }} /></div>
          <div className="case-foot">
            <span className={`dotline ${tone}`}>{left < 0 ? `${-left} day${left === -1 ? '' : 's'} late` : left === 0 ? 'Due today' : `${left} day${left === 1 ? '' : 's'} left`}</span>
            <span className="case-actions">
              <button className="btn tiny soft" disabled={c.nudged} onClick={() => dispatch({ type: 'nudge', patientId: p.id })}>{c.nudged ? 'Nudged' : 'Nudge'}</button>
              <button className="btn tiny ghost" aria-label="Move to next step" onClick={() => dispatch({ type: 'advance', patientId: p.id })}><Icon name="arrow" size={14} /></button>
            </span>
          </div>
        </>
      )}
    </article>
  );
}

/* ------------------------------ Messages ------------------------------ */

export function Messages({ s, dispatch }: ViewProps) {
  const queue = s.appts.filter((a) => a.status === 'booked' && a.date >= TODAY).sort((a, b) => (a.msg === 'draft' ? 0 : 1) - (b.msg === 'draft' ? 0 : 1) || a.date.localeCompare(b.date));
  const [sel, setSel] = useState(queue[0]?.id);
  const a = queue.find((x) => x.id === sel) ?? queue[0];
  const drafts = queue.filter((x) => x.msg === 'draft').length;
  if (!a) return <p className="empty">No messages</p>;
  const p = byId(s, a.patientId);
  return (
    <div className="cols wide-left">
      <section className="panel flush">
        <div className="filters">
          <b>{drafts} need approval</b>
          <button className="btn push" disabled={!drafts} onClick={() => dispatch({ type: 'approveAll' })}><Icon name="check" size={16} />Approve all</button>
        </div>
        <ul className="queue">
          {queue.map((x) => {
            const q = byId(s, x.patientId);
            return (
              <li key={x.id}>
                <button className={`queue-row${x.id === a.id ? ' on' : ''}`} onClick={() => setSel(x.id)}>
                  <Avatar name={q.name} size={32} />
                  <div className="task-main"><b>{q.name}</b><span>{KIND_LABEL[x.msgKind]} · {fmtShort(x.date)} {x.time}</span></div>
                  <LangChip lang={q.lang} />
                  <Chip tone={MSG_TONE[x.msg]}>{MSG_TEXT[x.msg]}</Chip>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
      <MessageCard p={p} a={a} dispatch={dispatch} />
    </div>
  );
}

export function MessageCard({ p, a, dispatch, compact = false }: { p: Patient; a: Appt; dispatch: Dispatch<Action>; compact?: boolean }) {
  const [english, setEnglish] = useState(false);
  const [secure, setSecure] = useState(false);
  const lang: Lang = english ? 'English' : p.lang;
  const canSecure = a.msgKind !== 'follow';
  const useSecure = secure && canSecure;
  const signals = basis(p, a);
  return (
    <section className={`panel center msgcard${compact ? ' compact' : ''}`}>
      <div className="ai-tag"><Icon name="spark" size={14} />AI draft · {p.lang}</div>
      {canSecure && (
        <div className="seg" role="group" aria-label="Channel">
          <button className={`pilltab${useSecure ? '' : ' on'}`} aria-pressed={!useSecure} onClick={() => setSecure(false)}>SMS</button>
          <button className={`pilltab${useSecure ? ' on' : ''}`} aria-pressed={useSecure} onClick={() => setSecure(true)}><Icon name="lock" size={14} />After login</button>
        </div>
      )}
      <Phone text={useSecure ? composeSecure(p, a, lang) : compose(p, a, lang)} sender={useSecure ? 'Secure inbox' : 'Screening unit'} rtl={lang === 'Arabic'} status={MSG_TEXT[a.msg]} />
      <div className="basis">
        <span className="muted small">Based on her records</span>
        <div className="chips">
          {signals.map((b) => <span key={b.text} className={`chip${b.secure ? ' amber' : ''}`} title={b.from}>{b.secure && <Icon name="lock" size={12} />}{b.text}</span>)}
        </div>
        {signals.some((b) => b.secure) && <span className="muted small"><Icon name="lock" size={12} /> never in an SMS, only after login</span>}
      </div>
      <div className="row">
        {p.lang !== 'English' && <button className="btn ghost" onClick={() => setEnglish(!english)}>{english ? `Show ${p.lang}` : 'Show English'}</button>}
        {a.msg === 'draft' && <button className="btn soft" onClick={() => dispatch({ type: 'approve', apptId: a.id })}>Approve</button>}
        <button className="btn" disabled={a.msg === 'sent'} onClick={() => dispatch({ type: 'send', apptId: a.id })}><Icon name="send" size={16} />{a.msg === 'sent' ? 'Sent' : 'Send now'}</button>
      </div>
    </section>
  );
}

/* ------------------------------ Patient drawer ------------------------------ */

const STEPS = ['Invited', 'Reminded', 'Screened', 'Follow-up', 'Treatment'];

function stepOf(s: State, p: Patient, a?: Appt): number {
  const c = s.cases.find((x) => x.patientId === p.id);
  if (c) return c.stage === 'tests' ? 3 : c.stage === 'treated' ? 5 : 4;
  if (a?.status === 'attended') return 3;
  if (a?.msg === 'sent') return 2;
  return 1;
}

export function Drawer({ s, dispatch, patientId, close }: { s: State; dispatch: Dispatch<Action>; patientId: string; close: () => void }) {
  const p = byId(s, patientId);
  const a = nextAppt(s, p.id);
  const c = s.cases.find((x) => x.patientId === p.id);
  const step = stepOf(s, p, a);
  return (
    <div className="scrim" onClick={close}>
      <aside className="drawer" role="dialog" aria-label={p.name} onClick={(e) => e.stopPropagation()}>
        <header className="drawer-head">
          <Avatar name={p.name} size={52} />
          <div><h2>{p.name}</h2><span className="muted">{p.age} · {p.area} · {p.lang} · {p.edu} education</span></div>
          <button className="btn ghost icon push" onClick={close} aria-label="Close"><Icon name="x" /></button>
        </header>

        <ol className="steps" aria-label="Care pathway">
          {STEPS.map((label, i) => (
            <li key={label} className={i < step ? 'done' : i === step ? 'now' : ''}><i>{i < step ? <Icon name="check" size={12} /> : i + 1}</i><span>{label}</span></li>
          ))}
        </ol>

        <div className="facts">
          <div><b>{p.attended}/{p.invited}</b><span>rounds attended</span></div>
          <div><Risk p={p} /><span>chance of missing</span></div>
          <div><b>{p.bestTime}</b><span>reads messages</span></div>
        </div>
        {p.reasons.length > 0 && <div className="chips left">{p.reasons.map((r) => <Chip key={r} tone="amber">{r}</Chip>)}</div>}

        {a && (
          <div className="next">
            <div className="next-date"><span>{fmtDay(a.date).wd}</span><b>{fmtDay(a.date).day}</b><span>{fmtDay(a.date).mo}</span></div>
            <div className="task-main">
              <b>{a.kind === 'followup' ? 'Follow-up' : 'Screening'} · {a.time}</b>
              <span>{a.site} · {a.status === 'booked' ? 'Booked' : a.status === 'missed' ? 'Missed' : 'Attended'}</span>
            </div>
          </div>
        )}
        {a && (
          <div className="row left">
            {a.status === 'booked' && <button className="btn soft" onClick={() => dispatch({ type: 'mark', apptId: a.id, status: 'attended' })}><Icon name="check" size={16} />Attended</button>}
            {a.status === 'booked' && <button className="btn ghost" onClick={() => dispatch({ type: 'mark', apptId: a.id, status: 'missed' })}>Missed</button>}
            {a.status === 'missed' && <button className="btn" onClick={() => dispatch({ type: 'rebook', apptId: a.id })}><Icon name="calendar" size={16} />Rebook</button>}
            <button className="btn ghost" disabled={p.called} onClick={() => dispatch({ type: 'call', patientId: p.id })}><Icon name="phone" size={16} />{p.called ? 'Call logged' : 'Log call'}</button>
          </div>
        )}
        {c && c.stage !== 'treated' && (
          <p className={`dotline ${daysLeft(c.dueBy) < 0 ? 'coral' : daysLeft(c.dueBy) <= 7 ? 'amber' : 'mint'}`}>
            Next step due {fmtShort(c.dueBy)}
          </p>
        )}
        {a && a.status === 'booked' && <MessageCard p={p} a={a} dispatch={dispatch} compact />}
      </aside>
    </div>
  );
}
