/** Standard record format `kaari.record/v1`. See records/FORMAT.md. */
export interface MedRecord {
  format: 'kaari.record/v1';
  synthetic: boolean;
  patient: { id: string; givenName: string; familyName: string; birthYear: number; motherTongue: string; municipality: string; mobile: boolean };
  screening: { invitations: { year: number; attended: boolean; result?: 'normal' | 'recalled-no-cancer' }[] };
  medications: { atc: string; name: string; route: string; firstPurchase: string; lastPurchase: string; purchases: number }[];
  conditions: { icd10: string; name: string; since: number }[];
  familyHistory: { breastCancerFirstDegree: number };
  appointment: { date: string; time: string; site: string };
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown) => typeof v === 'string' && v.length > 0 && v.length < 200;
const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v);

/** Checks a parsed file against the format. Returns plain-language problems. */
export function validate(data: unknown): { record: MedRecord } | { errors: string[] } {
  const e: string[] = [];
  if (!isObj(data)) return { errors: ['The file is not a JSON object.'] };
  if (data.format !== 'kaari.record/v1') return { errors: ['Not a Kaari record: "format" must be "kaari.record/v1".'] };

  const p = data.patient;
  if (!isObj(p)) e.push('Missing "patient".');
  else {
    for (const k of ['id', 'givenName', 'familyName', 'motherTongue', 'municipality']) if (!str(p[k])) e.push(`patient.${k} is missing.`);
    if (!num(p.birthYear) || (p.birthYear as number) < 1900 || (p.birthYear as number) > 2026) e.push('patient.birthYear is not a valid year.');
    if (typeof p.mobile !== 'boolean') e.push('patient.mobile must be true or false.');
  }

  const inv = isObj(data.screening) ? data.screening.invitations : undefined;
  if (!Array.isArray(inv)) e.push('Missing "screening.invitations" (use an empty list for a first invitation).');
  else if (!inv.every((i) => isObj(i) && num(i.year) && typeof i.attended === 'boolean')) e.push('Each invitation needs "year" and "attended".');

  if (!Array.isArray(data.medications)) e.push('Missing "medications" (use an empty list if none).');
  else if (!data.medications.every((m) => isObj(m) && str(m.atc) && str(m.name) && str(m.route) && /^\d{4}-\d{2}$/.test(String(m.firstPurchase)) && /^\d{4}-\d{2}$/.test(String(m.lastPurchase)) && num(m.purchases)))
    e.push('Each medicine needs "atc", "name", "route", "firstPurchase" and "lastPurchase" (YYYY-MM) and "purchases".');

  if (!Array.isArray(data.conditions)) e.push('Missing "conditions" (use an empty list if none).');
  else if (!data.conditions.every((c) => isObj(c) && str(c.icd10) && str(c.name) && num(c.since))) e.push('Each condition needs "icd10", "name" and "since".');

  if (!isObj(data.familyHistory) || !num(data.familyHistory.breastCancerFirstDegree)) e.push('Missing "familyHistory.breastCancerFirstDegree".');

  const a = data.appointment;
  if (!isObj(a) || !/^\d{4}-\d{2}-\d{2}$/.test(String(a.date)) || !/^\d{2}:\d{2}$/.test(String(a.time)) || !str(a.site)) e.push('"appointment" needs "date" (YYYY-MM-DD), "time" (HH:MM) and "site".');

  return e.length ? { errors: e } : { record: data as unknown as MedRecord };
}

export const LANG_NAMES: Record<string, string> = {
  fi: 'Finnish', sv: 'Swedish', en: 'English', ru: 'Russian', et: 'Estonian', ar: 'Arabic', so: 'Somali', ku: 'Kurdish', fa: 'Persian', zh: 'Chinese', vi: 'Vietnamese', th: 'Thai', tr: 'Turkish', es: 'Spanish', uk: 'Ukrainian',
};
export const langName = (code: string) => LANG_NAMES[code.toLowerCase()] ?? code.toUpperCase();
