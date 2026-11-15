/**
 * The drafting protocol, shared by the app's server route and `npm run pipeline`:
 *
 *   reduce -> retrieve evidence -> draft (one model call) -> validate
 *
 * Code does the retrieval and the checks. The language model only words the
 * message, and it never sees a name, an id, a date or a place: those are
 * placeholders that code fills in afterwards.
 */
import Anthropic from '@anthropic-ai/sdk';
import { chooseFacts, profile, unknownNumbers } from '../src/intake/engine';
import { FACTS } from '../src/intake/evidence';
import { langName, type MedRecord } from '../src/intake/record';

export const PROMPT_VERSION = 'draft-2026-11-a';
export const DEFAULT_MODEL = 'claude-opus-5-5';
const LINK = 'kaari.example/a';

const SYSTEM = `You word breast screening invitations for a public screening unit in Finland. A nurse reviews every draft before it is sent.

You receive a reduced profile of one woman and the evidence statements that apply to her. You do not know who she is.

Write three texts:
- "message": in the language named in the profile. Order: greeting with {name}; what her screening history shows; the evidence statements, personal ones first; her reserved time written exactly as "{date}", "{time}", "{place}" and that she can change it at {link}; last, that if she notices a lump or another change in her breast she should contact her health station and not wait for screening. Under 190 words.
- "message_en": a faithful English translation of "message".
- "sms": in her language, under 300 characters: {name}, {date}, {time}, {place}, that a personal message is waiting, and {link}. No health detail beyond the words "breast screening".

Rules:
- Keep the placeholders {name}, {date}, {time}, {place} and {link} exactly as written. Never invent a name, date or place.
- Use every evidence statement given, and no other statistic. You may translate a statement but must not change, round or combine its numbers.
- Do not mention any medicine or diagnosis that is not in the profile.
- Tone: warm, factual, one adult to another, short plain sentences. No fear, guilt or pressure. Do not say or imply she has cancer or probably will. Do not promise that screening prevents cancer or death. No risk scores. Do not mention AI or how her data was analysed.
- Western digits (0-9).`;

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['message', 'message_en', 'sms'],
  properties: { message: { type: 'string' }, message_en: { type: 'string' }, sms: { type: 'string' } },
};

const BANNED = [/\bAI\b/i, /algorithm/i, /risk score/i, /you (probably |likely )?have cancer/i, /prevents? (breast )?cancer/i, /will save your life/i, /before it is too late/i, /ramipril|atorvastatin|metformin|levothyroxine|escitalopram|amlodipine/i];
const PLACEHOLDERS = ['{name}', '{date}', '{time}', '{place}', '{link}'];

export interface Draft {
  message: string;
  message_en: string;
  sms: string;
}

/** A key that is not tied to one workspace needs the workspace id on every request. */
export function createClient(env: Record<string, string | undefined>) {
  const apiKey = env.ANTHROPIC_API_KEY?.trim();
  const workspace = env.ANTHROPIC_WORKSPACE_ID?.trim();
  const model = env.KAARI_MODEL?.trim() || DEFAULT_MODEL;
  const client = apiKey ? new Anthropic({ apiKey, defaultHeaders: workspace ? { 'anthropic-workspace-id': workspace } : undefined }) : null;
  return { client, model };
}

/** Reduce the record to a nameless profile and match the evidence to it. */
export function prepare(rec: MedRecord) {
  const p = profile(rec);
  const { hormoneOk, facts } = chooseFacts(p);
  const reduced = {
    language: langName(rec.patient.motherTongue),
    age: p.age,
    screening: p.segment === 'first' ? 'first invitation' : p.segment === 'never' ? `invited ${p.inv.length} times, never attended` : p.segment === 'missed' ? `last mammogram ${p.lastScreen}, missed the latest appointment, a new time is reserved` : `last mammogram ${p.lastScreen}, attends regularly`,
    recalled_last_time_no_cancer: p.recalled,
    hormone_therapy: hormoneOk ? { kind: hormoneOk.kind === 'combined' ? 'combined (oestrogen plus progestagen)' : 'oestrogen-only', years: hormoneOk.years } : null,
    close_relatives_with_breast_cancer: p.family,
    has_mobile_phone: rec.patient.mobile,
  };
  const dropped = [...rec.medications.filter((m) => m !== hormoneOk?.med).map((m) => m.name), ...rec.conditions.map((c) => c.name), 'name', 'id', 'municipality', 'birth year', 'appointment'];
  const evidence = facts.map((id) => {
    const f = FACTS.find((x) => x.id === id)!;
    return { id, statement: f.en.replace('{years}', `${hormoneOk?.years ?? 0} years`), source: f.source };
  });
  return { reduced, dropped, facts, evidence };
}

/** The exact body of the one request to the Messages API. */
export function requestBody(model: string, prep: ReturnType<typeof prepare>) {
  return {
    model,
    max_tokens: 8000,
    system: SYSTEM,
    output_config: { format: { type: 'json_schema' as const, schema: SCHEMA } },
    messages: [{ role: 'user' as const, content: JSON.stringify({ profile: prep.reduced, evidence: prep.evidence.map(({ id, statement }) => ({ id, statement })) }) }],
  };
}

/** One model call. Returns the draft with its placeholders still in place. `onText` receives the output as it is written. */
export async function callModel(client: Anthropic, model: string, prep: ReturnType<typeof prepare>, onText?: (delta: string) => void) {
  const started = Date.now();
  const stream = client.messages.stream(requestBody(model, prep));
  if (onText) stream.on('text', onText);
  const final = await stream.finalMessage();
  if (final.stop_reason === 'refusal') throw new Error('the model declined');
  const raw = final.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
  const draft = JSON.parse(raw) as Draft;
  return { draft, raw, stopReason: final.stop_reason, requestId: stream.request_id ?? null, messageId: final.id, tokensIn: final.usage.input_tokens, tokensOut: final.usage.output_tokens, seconds: (Date.now() - started) / 1000 };
}

/** Fill the placeholders from the record, then check the result. An empty `problems` means it may go to a nurse. */
export function check(draft: Draft, rec: MedRecord, facts: string[]) {
  const checks: { name: string; ok: boolean; detail: string }[] = [];
  const missing = Object.entries(draft).flatMap(([k, text]) => PLACEHOLDERS.filter((ph) => !String(text).includes(ph)).map((ph) => `${k}: placeholder ${ph} is missing`));
  checks.push({ name: 'placeholders', ok: !missing.length, detail: missing.length ? missing.join('; ') : `${PLACEHOLDERS.join(' ')} present in all three texts` });

  const a = rec.appointment;
  const values: Record<string, string> = { '{name}': rec.patient.givenName, '{date}': `${Number(a.date.slice(8, 10))}.${Number(a.date.slice(5, 7))}.`, '{time}': a.time, '{place}': a.site, '{link}': LINK };
  const fillIn = (s: string) => PLACEHOLDERS.reduce((t, ph) => t.replaceAll(ph, values[ph]), String(s));
  const filled: Draft = { message: fillIn(draft.message), message_en: fillIn(draft.message_en), sms: fillIn(draft.sms) };

  const odd = unknownNumbers(`${filled.message}\n${filled.message_en}\n${filled.sms}`, rec, facts);
  checks.push({ name: 'figures', ok: !odd.length, detail: odd.length ? `figures not in the record or the evidence: ${odd.join(', ')}` : 'every number is in the record or the cited evidence' });
  const banned = BANNED.filter((re) => re.test(filled.message_en) || re.test(filled.sms)).map(String);
  checks.push({ name: 'banned wording', ok: !banned.length, detail: banned.length ? `banned wording: ${banned.join(' ')}` : `${BANNED.length} patterns, none matched` });
  const words = filled.message_en.split(/\s+/).length;
  checks.push({ name: 'length', ok: words <= 210 && filled.sms.length <= 300, detail: `message ${words} words (limit 210), SMS ${filled.sms.length} characters (limit 300)` });

  return { filled, values, checks, problems: checks.filter((c) => !c.ok).map((c) => c.detail), words };
}

/** A short reason safe to show to staff. */
export function explain(err: unknown): string {
  if (err instanceof Anthropic.RateLimitError) return 'rate limited';
  if (err instanceof Anthropic.AuthenticationError) return 'the API key was rejected';
  if (err instanceof Anthropic.APIError) return /workspace/i.test(err.message) ? 'the API key needs ANTHROPIC_WORKSPACE_ID' : `upstream error ${err.status ?? ''}`.trim();
  return err instanceof Error ? err.message : 'no usable draft came back';
}
