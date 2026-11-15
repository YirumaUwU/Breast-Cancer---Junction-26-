import type { Lang } from '../data';
import { S } from '../messages';
import { FACTS } from './evidence';
import { langName, type MedRecord } from './record';
import { F, yearsText } from './text';

const THIS_YEAR = 2026;
const LINK = 'kaari.example/a';
const CODE: Record<string, Lang> = { fi: 'Finnish', sv: 'Swedish', en: 'English', ru: 'Russian', et: 'Estonian', ar: 'Arabic' };

export interface Signal {
  label: string;
  value: string;
  why: string;
  /** Evidence ids this signal brings into the message. */
  facts: string[];
}

export interface Result {
  mode: 'ai' | 'rules';
  /** Language the message is written in. */
  language: string;
  used: Signal[];
  ignored: Signal[];
  facts: string[];
  sms: string;
  message: string;
  messageEn: string;
  warnings: string[];
  /** Live drafts only: exactly what left the building. */
  sent?: { profile: Record<string, unknown>; notSent: string[]; model: string; promptVersion: string; tokensIn: number; tokensOut: number; seconds: number };
}

type Segment = 'first' | 'regular' | 'missed' | 'never';

/** The facts about her that decide the wording. */
export function profile(rec: MedRecord) {
  const inv = [...rec.screening.invitations].sort((a, b) => a.year - b.year);
  const went = inv.filter((i) => i.attended);
  const last = inv[inv.length - 1];
  const lastScreen = went.length ? went[went.length - 1].year : null;
  const segment: Segment = !inv.length ? 'first' : !went.length ? 'never' : !last.attended ? 'missed' : 'regular';
  const recalled = went.length > 0 && went[went.length - 1].result === 'recalled-no-cancer';

  const months = (ym: string) => Number(ym.slice(0, 4)) * 12 + Number(ym.slice(5, 7));
  const hormone = rec.medications
    .filter((m) => /^G03[CF]/i.test(m.atc) && m.route.toLowerCase() !== 'vaginal')
    .map((m) => ({ med: m, kind: /^G03F/i.test(m.atc) ? ('combined' as const) : ('oestrogen' as const), years: Math.round((months(m.lastPurchase) - months(m.firstPurchase)) / 12) }))
    .sort((a, b) => b.years - a.years)[0];

  return { age: THIS_YEAR - rec.patient.birthYear, inv, went, last, lastScreen, segment, recalled, hormone, family: rec.familyHistory.breastCancerFirstDegree };
}

const dateText = (iso: string) => `${Number(iso.slice(8, 10))}.${Number(iso.slice(5, 7))}.`;

function fill(t: string, rec: MedRecord, lang: Lang, year: number | null, years: number): string {
  return t
    .replace('{name}', rec.patient.givenName)
    .replace('{year}', String(year ?? ''))
    .replace('{years}', yearsText(lang, years))
    .replace('{date}', dateText(rec.appointment.date))
    .replace('{time}', rec.appointment.time)
    .replace('{place}', rec.appointment.site)
    .replace('{link}', LINK);
}

const MED_GROUP: [RegExp, string][] = [
  [/^C10/i, 'Cholesterol medicine'], [/^C/i, 'Heart or blood pressure medicine'], [/^A10/i, 'Diabetes medicine'],
  [/^H03/i, 'Thyroid medicine'], [/^N06/i, 'Mood medicine'], [/^G03/i, 'Hormone medicine'],
];

/** Evidence retrieval: matches each entry's condition against her profile. At most three. */
export function chooseFacts(p: ReturnType<typeof profile>) {
  const hormoneOk = p.hormone && p.hormone.years >= 2 ? p.hormone : undefined;
  const hormoneFact = hormoneOk ? (hormoneOk.kind === 'combined' ? 'E4' : 'E5') : null;
  const context = p.recalled ? 'E8' : p.segment === 'first' ? 'E1' : p.segment === 'never' && !p.family ? 'E7' : 'E3';
  const facts = [hormoneFact, p.family > 0 ? 'E6' : null, 'E2', context].filter((x): x is string => !!x).slice(0, 3);
  return { hormoneOk, hormoneFact, facts };
}

/** Rule-based path: picks the relevant signals and writes the draft from fixed wording. */
export function draftByRules(rec: MedRecord): Result {
  const p = profile(rec);
  const warnings: string[] = [];
  const name = langName(rec.patient.motherTongue);
  const lang = CODE[rec.patient.motherTongue.toLowerCase()] ?? 'Finnish';
  if (!CODE[rec.patient.motherTongue.toLowerCase()]) warnings.push(`No ${name} wording in the offline rules, so this draft is in Finnish. Use live AI or a translator.`);
  if (p.age < 50 || p.age > 69) warnings.push(`Age ${p.age} is outside the screening ages 50–69.`);

  const { hormoneOk, hormoneFact, facts } = chooseFacts(p);
  const has = (id: string) => (facts.includes(id) ? [id] : []);

  const history = {
    first: ['No earlier invitation', 'Welcome wording'],
    never: [`${p.inv.length} invitations, none attended`, 'Low-threshold wording'],
    missed: [`Last mammogram ${p.lastScreen}, missed ${p.last?.year}`, 'A new time is offered'],
    regular: [`Last mammogram ${p.lastScreen}`, 'Routine wording'],
  }[p.segment];

  const used: Signal[] = [
    { label: 'Mother tongue', value: name, why: 'Language of the message', facts: [] },
    { label: 'Age', value: String(p.age), why: 'Screening is offered at 50–69', facts: has('E2') },
    { label: 'Screening history', value: history[0], why: history[1], facts: [...has('E1'), ...has('E3')] },
  ];
  if (p.recalled) used.push({ label: 'Earlier recall', value: `Asked back in ${p.lastScreen}, no cancer found`, why: 'Reassure her about call-backs', facts: has('E8') });
  if (hormoneOk) used.push({ label: 'Hormone therapy', value: `${hormoneOk.med.name}, ${hormoneOk.years} years, ${hormoneOk.med.purchases} purchases`, why: 'Makes regular screening more useful for her', facts: has(hormoneFact!) });
  if (p.family > 0) used.push({ label: 'Family history', value: `${p.family} close relative${p.family > 1 ? 's' : ''} with breast cancer`, why: 'Makes regular screening more useful for her', facts: has('E6') });
  if (p.segment === 'never' && !p.family) used.push({ label: 'Family history', value: 'No close relative with breast cancer', why: 'A common reason to skip screening', facts: has('E7') });
  used.push({ label: 'Appointment', value: `${dateText(rec.appointment.date)} ${rec.appointment.time}, ${rec.appointment.site}`, why: 'The time reserved for her', facts: [] });
  used.push({ label: 'Contact', value: rec.patient.mobile ? 'Mobile phone' : 'No mobile phone', why: rec.patient.mobile ? 'SMS with a link to the message' : 'Send as a letter', facts: [] });

  const ignored: Signal[] = [];
  for (const m of rec.medications) {
    if (hormoneOk?.med === m) continue;
    const isHormone = /^G03[CF]/i.test(m.atc);
    const why = isHormone && m.route.toLowerCase() === 'vaginal' ? 'Local oestrogen: no excess risk found in the evidence' : isHormone ? 'Under two years of use' : 'No established link to breast cancer';
    ignored.push({ label: MED_GROUP.find(([re]) => re.test(m.atc))?.[1] ?? 'Medicine', value: `${m.name} (${m.atc})`, why, facts: [] });
  }
  for (const c of rec.conditions) ignored.push({ label: 'Diagnosis', value: `${c.name} (${c.icd10})`, why: 'Not relevant to a screening invitation', facts: [] });
  ignored.push({ label: 'Municipality', value: rec.patient.municipality, why: 'Not needed for the message', facts: [] });

  const write = (l: Lang) =>
    [S[l].hi, S[l][p.segment], ...(p.recalled ? [F[l].recalled] : []), ...facts.map((id) => F[l][id]), S[l].slot, S[l].symptom]
      .map((t) => fill(t, rec, l, p.lastScreen, hormoneOk?.years ?? 0))
      .join('\n\n');

  return { mode: 'rules', language: lang, used, ignored, facts, sms: fill(F[lang].sms, rec, lang, p.lastScreen, 0), message: write(lang), messageEn: write('English'), warnings };
}

/**
 * Guard against invented statistics: every number in the draft must come
 * from the record or from the evidence entries the draft cites. Returns the
 * numbers that do not.
 */
export function unknownNumbers(text: string, rec: MedRecord, facts: string[]): string[] {
  const tokens = (s: string) =>
    (s
      .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
      .replace(/(\d)[,  ](\d{3})(?!\d)/g, '$1$2')
      .match(/\d+(?:[.,]\d+)?/g) ?? []
    ).map((t) => t.replace(',', '.').replace(/^0+(?=\d)/, ''));
  const p = profile(rec);
  const a = rec.appointment;
  const allowed = new Set<string>([
    ...FACTS.filter((f) => facts.includes(f.id)).flatMap((f) => tokens(f.en)),
    ...tokens(`${a.date} ${a.time} ${dateText(a.date)} ${a.site}`),
    `${Number(a.date.slice(8, 10))}.${Number(a.date.slice(5, 7))}`,
    ...rec.screening.invitations.map((i) => String(i.year)),
    String(p.age), String(rec.patient.birthYear), String(p.hormone?.years ?? ''), String(p.family), String(p.inv.length),
    '15', '50', '69', '2',
  ]);
  return [...new Set(tokens(text).filter((t) => !allowed.has(t)))];
}
