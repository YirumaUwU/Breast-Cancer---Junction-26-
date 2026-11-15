import { useEffect, useRef, useState, type DragEvent } from 'react';
import { Chip, Icon } from '../ui';
import { draftByRules, unknownNumbers, type Result, type Signal } from './engine';
import { factById } from './evidence';
import { langName, validate, type MedRecord } from './record';

type Status = 'error' | 'reading' | 'selecting' | 'drafting' | 'ready' | 'approved' | 'rejected';
interface Item {
  id: number;
  file: string;
  status: Status;
  errors?: string[];
  record?: MedRecord;
  result?: Result;
  edited?: boolean;
  /** Developer view: protocol steps as the server reports them. */
  trace?: Ev[];
  /** Developer view: model output so far. */
  stream?: string;
}

interface Ev {
  ms: number;
  step: string;
  title: string;
  data?: unknown;
}

const SAMPLES = Object.entries(import.meta.glob('../../records/*.json', { eager: true, import: 'default' })).map(([path, data]) => ({
  file: path.split('/').pop()!,
  data,
}));

const STEPS: [string, string][] = [['Record in', 'upload'], ['Key information', 'search'], ['Draft', 'spark'], ['Staff approval', 'check']];
const STEP_OF: Record<Status, number> = { error: 0, reading: 0, selecting: 1, drafting: 2, ready: 3, approved: 4, rejected: 3 };
const STATUS: Record<Status, [string, string]> = {
  error: ['Not readable', 'coral'], reading: ['Reading', 'sky'], selecting: ['Selecting', 'sky'], drafting: ['Drafting', 'sky'],
  ready: ['Needs approval', 'amber'], approved: ['Approved', 'mint'], rejected: ['Rejected', 'coral'],
};
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Asks the server route for a live draft. Code picks the signals and the
 * evidence (the same rules as offline); the model only words the message.
 * Throws when no checked draft came back.
 */
async function draftByAi(rec: MedRecord, onEvent?: (e: Ev) => void): Promise<Result> {
  const res = await fetch(`/api/draft${onEvent ? '?trace=1' : ''}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(rec) });
  let j: Record<string, any> | null = null;
  if (onEvent && res.ok && res.body) {
    // Developer view: one JSON line per protocol step, read as it arrives.
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    for (;;) {
      const { done, value } = await reader.read();
      buf += dec.decode(value, { stream: !done });
      const lines = buf.split('\n');
      buf = lines.pop()!;
      for (const line of lines.filter(Boolean)) {
        const e = JSON.parse(line) as Ev;
        onEvent(e);
        if (e.step === 'RESULT') j = e.data as Record<string, any>;
        if (e.step === 'ERROR') throw new Error(e.title);
      }
      if (done) break;
    }
    if (!j) throw new Error('The stream ended early');
  } else {
    j = await res.json();
    if (!res.ok) throw new Error(j!.error ?? 'Live drafting failed');
  }
  j = j!;
  const base = draftByRules(rec);
  return {
    ...base,
    mode: 'ai',
    language: j.language,
    facts: j.facts,
    sms: j.sms,
    message: j.message,
    messageEn: j.message_en,
    warnings: base.warnings.filter((w) => !w.startsWith('No ')),
    sent: { profile: j.sentToModel, notSent: j.notSent, model: j.model, promptVersion: j.promptVersion, tokensIn: j.tokensIn, tokensOut: j.tokensOut, seconds: j.seconds },
  };
}

export function Intake({ toast, auto }: { toast: (text: string) => void; auto?: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [ai, setAi] = useState(false);
  const [over, setOver] = useState(false);
  const next = useRef(1);
  const aiRef = useRef(false);
  const [dev, setDevState] = useState(() => { try { return localStorage.getItem('kaari.dev') === '1'; } catch { return false; } });
  const devRef = useRef(dev);
  const setDev = (on: boolean) => { devRef.current = on; setDevState(on); try { localStorage.setItem('kaari.dev', on ? '1' : '0'); } catch { /* private window */ } };

  const patch = (id: number, p: Partial<Item>) => setItems((list) => list.map((i) => (i.id === id ? { ...i, ...p } : i)));

  async function add(file: string, data: unknown, fast = false) {
    const id = next.current++;
    const v = validate(data);
    setSel(id);
    if ('errors' in v) return setItems((l) => [{ id, file, status: 'error', errors: v.errors }, ...l]);
    const record = v.record;
    setItems((l) => [{ id, file, status: 'reading', record }, ...l]);
    const pause = fast ? 0 : 650;
    const onEvent = (e: Ev) =>
      setItems((l) => l.map((i) => (i.id !== id ? i : e.step === 'DELTA' ? { ...i, stream: (i.stream ?? '') + String(e.data) } : { ...i, trace: [...(i.trace ?? []), e] })));
    const live = aiRef.current ? draftByAi(record, devRef.current ? onEvent : undefined).catch((e: Error) => e) : null;
    await wait(pause);
    patch(id, { status: 'selecting' });
    await wait(pause);
    patch(id, { status: 'drafting' });
    const [got] = await Promise.all([live, wait(pause)]);
    let result = draftByRules(record);
    if (got && !(got instanceof Error)) result = got;
    else if (got) result.warnings.unshift(`Live AI did not answer (${got.message}). This draft comes from the offline rules.`);
    patch(id, { status: 'ready', result });
  }

  async function addFiles(files: FileList | null) {
    for (const f of Array.from(files ?? [])) {
      let data: unknown = null;
      try {
        data = JSON.parse(await f.text());
      } catch {
        /* reported by validate() below */
      }
      void add(f.name, data);
    }
  }

  useEffect(() => {
    fetch('/api/draft')
      .then((r) => r.json())
      .then((j) => { aiRef.current = !!j.available; setAi(!!j.available); })
      .catch(() => undefined)
      .finally(() => {
        const s = auto && SAMPLES.find((x) => x.file.includes(auto));
        if (s) void add(s.file, s.data, true);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const item = items.find((i) => i.id === sel) ?? items[0];
  const step = item ? STEP_OF[item.status] : -1;
  const drop = (e: DragEvent) => { e.preventDefault(); setOver(false); void addFiles(e.dataTransfer.files); };

  return (
    <div className="stack">
      <ol className="flow" aria-label="Drafting steps">
        {STEPS.map(([label, icon], i) => (
          <li key={label} className={i < step ? 'done' : i === step ? 'now' : ''}>
            <i><Icon name={i < step ? 'check' : icon} size={18} /></i>
            <span>{label}</span>
          </li>
        ))}
      </ol>

      <div className="cols intake">
        <div className="stack">
          <label className={`drop${over ? ' over' : ''}`} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={drop}>
            <input type="file" accept=".json,application/json" multiple onChange={(e) => { void addFiles(e.target.files); e.target.value = ''; }} />
            <span className="drop-ico"><Icon name="upload" size={22} /></span>
            <b>Drop patient records here</b>
            <span className="muted small">or click to choose files · kaari.record/v1 (JSON)</span>
          </label>
          <div className={`mode ${ai ? 'on' : ''}`}><Icon name="spark" size={14} />{ai ? 'Live AI drafting is on' : 'Offline rules · no API key set'}</div>
          <label className="devswitch">
            <input type="checkbox" role="switch" checked={dev} onChange={(e) => setDev(e.target.checked)} />
            <span className="track" aria-hidden="true" />
            <span>Developer view</span>
            <span className="muted small push">protocol trace</span>
          </label>

          <section className="panel flush">
            <div className="filters"><b>Sample records</b><span className="muted small push">synthetic</span></div>
            <ul className="queue">
              {SAMPLES.map((s) => {
                const d = s.data as MedRecord;
                return (
                  <li key={s.file}>
                    <button className="queue-row" onClick={() => void add(s.file, s.data)}>
                      <div className="task-main"><b>{d.patient.givenName} {d.patient.familyName}</b><span>{s.file}</span></div>
                      <span className="chip lang">{d.patient.motherTongue.toUpperCase()}</span>
                      <Icon name="arrow" size={16} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          {items.length > 0 && (
            <section className="panel flush">
              <div className="filters"><b>Processed</b><span className="muted small push">{items.filter((i) => i.status === 'ready').length} waiting</span></div>
              <ul className="queue">
                {items.map((i) => (
                  <li key={i.id}>
                    <button className={`queue-row${i.id === item?.id ? ' on' : ''}`} onClick={() => setSel(i.id)}>
                      <div className="task-main"><b>{i.record ? `${i.record.patient.givenName} ${i.record.patient.familyName}` : i.file}</b><span>{i.file}</span></div>
                      <Chip tone={STATUS[i.status][1]}>{STATUS[i.status][0]}</Chip>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="stack">
          {!item && <section className="panel"><p className="empty"><Icon name="upload" size={28} />Add a record to see the draft</p></section>}
          {item?.status === 'error' && (
            <section className="panel">
              <h2>{item.file} could not be read</h2>
              <ul className="errs">{item.errors!.map((e) => <li key={e} className="dotline coral">{e}</li>)}</ul>
            </section>
          )}
          {item?.record && <Work key={item.id} item={item} patch={(p) => patch(item.id, p)} toast={toast} />}
          {dev && item?.record && <Trace item={item} ai={ai} />}
        </div>
      </div>
    </div>
  );
}

function Work({ item, patch, toast }: { item: Item; patch: (p: Partial<Item>) => void; toast: (t: string) => void }) {
  const rec = item.record!;
  const r = item.result;
  const [view, setView] = useState<'own' | 'en' | 'sms'>('own');
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const step = STEP_OF[item.status];
  const who = `${rec.patient.givenName} ${rec.patient.familyName}`;

  const body = !r ? '' : view === 'own' ? r.message : view === 'en' ? r.messageEn : r.sms;
  const odd = r ? unknownNumbers(`${r.message}\n${r.messageEn}`, rec, r.facts) : [];
  const save = () => { patch({ result: { ...r!, message: text }, edited: true }); setEditing(false); };

  return (
    <>
      <section className="panel">
        <header className="panel-head">
          <h2>{who}</h2>
          <span className="muted small">{2026 - rec.patient.birthYear} · {langName(rec.patient.motherTongue)} · {rec.patient.id}</span>
          <span className="push"><Chip tone={STATUS[item.status][1]}>{STATUS[item.status][0]}</Chip></span>
        </header>
        {step < 2 ? (
          <Busy text={step === 0 ? 'Reading the record' : 'Selecting what matters for the message'} />
        ) : (
          r && (
            <div className="keys">
              <div>
                <h3><Icon name="check" size={14} />Used for the message</h3>
                {r.used.map((s) => <Row key={s.label + s.value} s={s} />)}
              </div>
              <div className="left-out">
                <h3><Icon name="x" size={14} />Left out</h3>
                {r.ignored.map((s) => <Row key={s.label + s.value} s={s} />)}
                {r.ignored.length === 0 && <p className="muted small">Nothing left out</p>}
              </div>
            </div>
          )
        )}
        {step === 2 && !r && <p className="muted small">Signals appear when the draft is ready.</p>}
      </section>

      <section className="panel">
        {step < 3 || !r ? (
          <>
            <header className="panel-head"><h2>Draft</h2></header>
            <Busy text={step === 2 ? 'Writing the message with evidence' : 'Waiting for the key information'} idle={step < 2} />
          </>
        ) : (
          <>
            <header className="panel-head">
              <div className="ai-tag"><Icon name="spark" size={14} />{r.mode === 'ai' ? 'AI draft' : 'Rule-based draft'} · {r.language}{item.edited ? ' · edited' : ''}</div>
              <div className="seg push" role="group" aria-label="Version">
                {([['own', r.language], ['en', 'English'], ['sms', 'SMS']] as const).filter(([k]) => k !== 'en' || r.language !== 'English').map(([k, label]) => (
                  <button key={k} className={`pilltab${view === k ? ' on' : ''}`} aria-pressed={view === k} onClick={() => { setView(k); setEditing(false); }}>{label}</button>
                ))}
              </div>
            </header>

            {editing ? (
              <textarea className="letter edit" dir="auto" value={text} onChange={(e) => setText(e.target.value)} aria-label="Edit the message" />
            ) : (
              <div className={`letter${view === 'sms' ? ' sms' : ''}`} dir="auto">{body}</div>
            )}
            {view !== 'sms' && <p className="muted small"><Icon name="lock" size={12} /> Opens only after she logs in. The SMS carries no health detail.</p>}

            {r.warnings.map((w) => <p key={w} className="note amber"><Icon name="alert" size={16} />{w}</p>)}
            <p className={`note ${odd.length ? 'coral' : 'mint'}`}>
              <Icon name={odd.length ? 'alert' : 'check'} size={16} />
              {odd.length ? `Check these figures, they are not in the record or the evidence: ${odd.join(', ')}` : 'Every figure matches the record or the evidence library'}
            </p>

            {r.sent && (
              <details className="sent">
                <summary><Icon name="lock" size={12} /> What the model saw · {r.sent.model} · {r.sent.tokensIn + r.sent.tokensOut} tokens · {r.sent.seconds}s</summary>
                <pre>{JSON.stringify(r.sent.profile, null, 2)}</pre>
                <p className="muted small">Not sent: {r.sent.notSent.join(', ')}. Name, date, time and place were filled in by code after the checks. Prompt {r.sent.promptVersion}.</p>
              </details>
            )}

            <h3 className="ev-head">Evidence used</h3>
            <ul className="evidence">
              {r.facts.map((id) => {
                const f = factById(id)!;
                return (
                  <li key={id}>
                    <span className="chip sky">{id}</span>
                    <div><span>{f.en.replace('{years}', 'N years')}</span><a href={f.url} target="_blank" rel="noreferrer">{f.source}</a></div>
                  </li>
                );
              })}
            </ul>

            <div className="approve">
              {item.status === 'ready' && !editing && (
                <>
                  <span className="muted small">Nothing is sent before you approve.</span>
                  <button className="btn ghost push" onClick={() => { patch({ status: 'rejected' }); toast(`Draft for ${rec.patient.givenName} rejected`); }}>Reject</button>
                  <button className="btn soft" disabled={view !== 'own'} title={view !== 'own' ? `Switch to ${r.language} to edit` : undefined} onClick={() => { setText(r.message); setEditing(true); }}>Edit</button>
                  <button className="btn" onClick={() => { patch({ status: 'approved' }); toast(`Message for ${rec.patient.givenName} approved and queued`); }}><Icon name="check" size={16} />Approve</button>
                </>
              )}
              {editing && (
                <>
                  <button className="btn ghost push" onClick={() => setEditing(false)}>Cancel</button>
                  <button className="btn" onClick={save}>Save changes</button>
                </>
              )}
              {item.status === 'approved' && <span className="dotline mint">Approved by Sanna Niemi · queued for sending</span>}
              {item.status === 'rejected' && (
                <>
                  <span className="dotline coral">Rejected · nothing will be sent</span>
                  <button className="btn ghost push" onClick={() => patch({ status: 'ready' })}>Reopen</button>
                </>
              )}
            </div>
          </>
        )}
      </section>
    </>
  );
}

const fmt = (d: unknown) => (typeof d === 'string' ? d : JSON.stringify(d, null, 2));

/** Developer view: every protocol step for this record, from the record coming in to the draft waiting for approval. */
function Trace({ item, ai }: { item: Item; ai: boolean }) {
  const box = useRef<HTMLPreElement>(null);
  const trace = item.trace ?? [];
  const asked = trace.some((e) => e.step === 'REQUEST');
  const answered = trace.some((e) => e.step === 'RESPONSE' || e.step === 'ERROR');
  useEffect(() => { if (box.current) box.current.scrollTop = box.current.scrollHeight; }, [item.stream]);

  return (
    <section className="panel trace">
      <header className="panel-head">
        <h2>Protocol trace</h2>
        <span className="muted small push">developer view · server time</span>
      </header>
      {trace.length === 0 && (
        <p className="muted small">
          {!ai ? 'Live AI is off (no API key on the server), so there is no API call to trace. This draft came from the fixed wording in the browser.' : item.status === 'ready' || item.status === 'approved' || item.status === 'rejected' ? 'This record was processed with the developer view off. Add it again to trace it.' : 'Waiting for the server…'}
        </p>
      )}
      <ol>
        {trace.map((e, i) => (
          <li key={i} className={e.step === 'ERROR' ? 'bad' : ''}>
            <details open={e.step === 'REDUCE' || e.step === 'VALIDATE' || e.step === 'ERROR'}>
              <summary>
                <time>+{(e.ms / 1000).toFixed(2)}s</time>
                <b>{e.step}</b>
                <span>{e.title}</span>
              </summary>
              {e.data !== undefined && <pre>{fmt(e.data)}</pre>}
            </details>
            {e.step === 'REQUEST' && (
              <div className="wire">
                <span className="muted small">{answered ? 'Model output as it arrived (placeholders still in place)' : 'Model is writing…'}</span>
                <pre ref={box} className={answered ? '' : 'live'}>{item.stream || ' '}</pre>
              </div>
            )}
          </li>
        ))}
      </ol>
      {asked && <p className="muted small">The API key never reaches the browser. The request body above is exactly what the server sent; name, id, municipality, birth year and appointment are not in it.</p>}
    </section>
  );
}

function Row({ s }: { s: Signal }) {
  return (
    <div className="key">
      <span className="muted small">{s.label}</span>
      <b>{s.value}</b>
      <span className="small">{s.why} {s.facts.map((f) => <span key={f} className="chip sky">{f}</span>)}</span>
    </div>
  );
}

function Busy({ text, idle = false }: { text: string; idle?: boolean }) {
  return (
    <div className={`busy${idle ? ' idle' : ''}`} role="status">
      <span>{text}</span>
      <i /><i /><i />
    </div>
  );
}
