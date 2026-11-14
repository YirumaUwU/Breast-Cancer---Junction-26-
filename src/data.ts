/** DEMO DATA. Every person here is invented from a fixed seed. */

export type Lang = 'Finnish' | 'Swedish' | 'English' | 'Russian' | 'Estonian' | 'Arabic';
export type ApptKind = 'screening' | 'followup';
export type ApptStatus = 'booked' | 'attended' | 'missed' | 'rebooked';
export type MsgStatus = 'draft' | 'scheduled' | 'sent';
export type MsgKind = 'remind' | 'rebook' | 'follow';
export type Stage = 'tests' | 'referred' | 'booked' | 'treated';
export type Edu = 'Basic' | 'Secondary' | 'Higher';

/**
 * Attendance by group, Finland, preliminary 2024 results (Cancer Society of
 * Finland press release). These four figures are public and real; everything
 * about individual patients below is invented.
 */
export const GOAL = 80;
export const GAPS = {
  source: 'Finland 2024, preliminary · Cancer Society of Finland',
  lang: { title: 'Mother tongue', hi: ['Finnish, Swedish or Sámi', 83], lo: ['Other mother tongue', 61] },
  edu: { title: 'Education', hi: ['Higher education', 86], lo: ['Basic education only', 64] },
} as const;
export const isDomestic = (l: Lang) => l === 'Finnish' || l === 'Swedish';

export interface Patient {
  id: string;
  name: string;
  first: string;
  age: number;
  lang: Lang;
  area: string;
  invited: number;
  attended: number;
  mobile: boolean;
  edu: Edu;
  /** Year of the last screening mammogram on record, if any. */
  lastScreen: number | null;
  /** Years of hormone therapy seen in prescription records (0 = none). */
  hrtYears: number;
  /** 0–100, chance she misses her next appointment. */
  risk: number;
  reasons: string[];
  /** When she tends to read messages (demo signal). */
  bestTime: 'Morning' | 'Evening';
  called: boolean;
}

export interface Appt {
  id: string;
  patientId: string;
  kind: ApptKind;
  date: string;
  time: string;
  site: string;
  status: ApptStatus;
  msg: MsgStatus;
  msgKind: MsgKind;
}

export interface Case {
  patientId: string;
  stage: Stage;
  /** Day the current stage started. */
  since: string;
  /** Recommended latest date for the next step. */
  dueBy: string;
  nudged: boolean;
}

export const TODAY = '2026-11-16'; // Monday
const DAY = 86_400_000;
const toDay = (iso: string) => Math.round(Date.parse(iso + 'T00:00:00Z') / DAY);
export const addDays = (iso: string, n: number) => new Date((toDay(iso) + n) * DAY).toISOString().slice(0, 10);
export const daysBetween = (a: string, b: string) => toDay(b) - toDay(a);
export const WEEK = Array.from({ length: 6 }, (_, i) => addDays(TODAY, i));
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const fmtDay = (iso: string) => {
  const d = new Date(iso + 'T00:00:00Z');
  return { wd: WD[d.getUTCDay()], day: d.getUTCDate(), mo: MO[d.getUTCMonth()] };
};
export const fmtShort = (iso: string) => {
  const f = fmtDay(iso);
  return iso === TODAY ? 'Today' : iso === addDays(TODAY, 1) ? 'Tomorrow' : `${f.wd} ${f.day} ${f.mo}`;
};

const PEOPLE: [string, Lang][] = [
  ['Aino Virtanen', 'Finnish'], ['Natalia Ivanova', 'Russian'], ['Helena Korhonen', 'Finnish'], ['Fatima Al-Hassan', 'Arabic'],
  ['Tuula Mäkinen', 'Finnish'], ['Birgitta Lindqvist', 'Swedish'], ['Ritva Nieminen', 'Finnish'], ['Tiina Tamm', 'Estonian'],
  ['Pirjo Laine', 'Finnish'], ['Olga Petrova', 'Russian'], ['Marja Heikkinen', 'Finnish'], ['Susan Clarke', 'English'],
  ['Sirpa Koskinen', 'Finnish'], ['Layla Haddad', 'Arabic'], ['Leena Järvinen', 'Finnish'], ['Kadri Saar', 'Estonian'],
  ['Anne Lehtonen', 'Finnish'], ['Irina Smirnova', 'Russian'], ['Päivi Saarinen', 'Finnish'], ['Gunilla Nyberg', 'Swedish'],
  ['Kaija Salminen', 'Finnish'], ['Mariam Khalil', 'Arabic'], ['Eeva Tuominen', 'Finnish'], ['Tatiana Kuznetsova', 'Russian'],
  ['Riitta Laitinen', 'Finnish'], ['Maarika Kask', 'Estonian'], ['Seija Heinonen', 'Finnish'], ['Mary O’Brien', 'English'],
  ['Arja Lindholm', 'Finnish'], ['Elena Volkova', 'Russian'], ['Hannele Rantanen', 'Finnish'], ['Margareta Ekström', 'Swedish'],
  ['Raija Karjalainen', 'Finnish'], ['Amal Mansour', 'Arabic'], ['Terttu Jokinen', 'Finnish'], ['Liis Mägi', 'Estonian'],
  ['Outi Hämäläinen', 'Finnish'], ['Svetlana Orlova', 'Russian'], ['Merja Peltonen', 'Finnish'], ['Ulla Savolainen', 'Finnish'],
  ['Kirsti Ahonen', 'Finnish'], ['Nadia Rahman', 'English'],
];

const AREAS: [string, string, number][] = [
  ['Kallio', 'Kamppi unit', 3], ['Töölö', 'Kamppi unit', 2], ['Vuosaari', 'Itäkeskus unit', 6], ['Kontula', 'Itäkeskus unit', 3],
  ['Malmi', 'Malmi unit', 1], ['Lauttasaari', 'Kamppi unit', 5], ['Östersundom', 'Itäkeskus unit', 12],
];
const TIMES = ['08:40', '09:20', '10:20', '11:00', '12:10', '13:30', '14:30', '15:40', '17:30'];

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Db {
  patients: Patient[];
  appts: Appt[];
  cases: Case[];
}

export function seedDb(): Db {
  const r = rng(11);
  const r2 = rng(23); // separate stream so the older demo data stays the same
  const patients: Patient[] = [];
  const appts: Appt[] = [];
  const cases: Case[] = [];
  const siteOf: Record<string, string> = {};

  PEOPLE.forEach(([name, lang], i) => {
    const [area, site, km] = AREAS[Math.floor(r() * AREAS.length)];
    const age = 50 + 2 * Math.floor(r() * 10);
    const invited = (age - 50) / 2;
    const domestic = lang === 'Finnish' || lang === 'Swedish';
    const habit = (domestic ? 0.85 : 0.6) + (r() - 0.5) * 0.4;
    let attended = 0;
    let missedLast = false;
    for (let k = 0; k < invited; k++) {
      const went = r() < habit;
      if (went) attended++;
      missedLast = !went;
    }
    const mobile = r() < 0.92;
    const reasons: string[] = [];
    let z = -1.75;
    if (invited === 0) { reasons.push('First invite'); z += 0.3; }
    if (missedLast) { reasons.push('Missed last time'); z += 1.3; }
    if (invited >= 2 && attended === 0) { reasons.push('Never attended'); z += 0.9; }
    if (!domestic) { reasons.push('Other mother tongue'); z += 1.14; }
    if (km > 8) { reasons.push('Far from unit'); z += 0.4; }
    if (!mobile) { reasons.push('No mobile'); z += 0.5; }
    const e = r2() + (domestic ? 0 : -0.12);
    const edu: Edu = e < 0.27 ? 'Basic' : e < 0.65 ? 'Secondary' : 'Higher';
    const hrtYears = r2() < 0.3 ? 5 + Math.floor(r2() * 4) : 0;
    const lastScreen = attended > 0 ? (missedLast ? 2022 : 2024) : null;
    const id = `p${i + 1}`;
    siteOf[id] = site;
    patients.push({
      id, name, first: name.split(' ')[0], age, lang, area, invited, attended, mobile, edu, lastScreen, hrtYears,
      risk: Math.round(100 / (1 + Math.exp(-z))), reasons, bestTime: r() < 0.5 ? 'Morning' : 'Evening', called: false,
    });
  });

  let n = 0;
  const appt = (patientId: string, kind: ApptKind, date: string, status: ApptStatus, msg: MsgStatus, msgKind: MsgKind): Appt => ({
    id: `a${++n}`, patientId, kind, date, time: TIMES[Math.floor(r() * TIMES.length)], site: siteOf[patientId], status, msg, msgKind,
  });

  // 26 screening appointments this week
  patients.slice(0, 26).forEach((p, i) => {
    const date = WEEK[i % 6];
    const soon = daysBetween(TODAY, date) <= 1;
    appts.push(appt(p.id, 'screening', date, 'booked', soon ? 'sent' : i % 3 === 0 ? 'draft' : 'scheduled', 'remind'));
  });
  // 5 missed last week, waiting for a new slot
  patients.slice(26, 31).forEach((p, i) => {
    p.reasons = ['Missed last time', ...p.reasons.filter((x) => x !== 'Missed last time')];
    p.risk = Math.max(p.risk, 55);
    appts.push(appt(p.id, 'screening', addDays(TODAY, -3 - i), 'missed', 'sent', 'remind'));
  });
  // 11 women in follow-up after screening
  const plan: [Stage, number, number][] = [
    ['tests', 3, 5], ['tests', 9, 1], ['tests', 12, -2], ['tests', 2, 8],
    ['referred', 12, 30], ['referred', 30, 12], ['referred', 38, 4], ['referred', 45, -3],
    ['booked', 20, 9], ['booked', 33, 6], ['treated', 0, 0],
  ];
  patients.slice(31).forEach((p, i) => {
    const [stage, ago, left] = plan[i];
    cases.push({ patientId: p.id, stage, since: addDays(TODAY, -ago), dueBy: addDays(TODAY, left), nudged: false });
    if (stage === 'tests' && left > 0) appts.push(appt(p.id, 'followup', addDays(TODAY, Math.min(left, 5)), 'booked', i % 2 ? 'draft' : 'scheduled', 'follow'));
    if (stage === 'booked') appts.push(appt(p.id, 'followup', addDays(TODAY, Math.min(left, 5)), 'booked', 'scheduled', 'follow'));
  });

  appts.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  return { patients, appts, cases };
}

export const tier = (risk: number) => (risk >= 50 ? 'high' : risk >= 30 ? 'mid' : 'low');
