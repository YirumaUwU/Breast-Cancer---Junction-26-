/**
 * The recommended production protocol, run end to end on synthetic records:
 *
 *   trigger -> fetch -> reduce -> retrieve evidence -> draft -> validate -> store -> wait for approval
 *
 * Code does the retrieval and the checks. The language model only words the
 * message, and it never sees a name, an id, a date or a place: those are
 * placeholders that code fills in afterwards.
 *
 *   npm run pipeline                      all records due in the next 14 days
 *   npm run pipeline -- records/01-*.json chosen files
 *   npm run pipeline -- --rules           skip the model, use the fixed wording
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { PROMPT_VERSION, callModel, check, createClient, explain, prepare, type Draft } from '../server/protocol';
import { draftByRules, unknownNumbers } from '../src/intake/engine';
import { validate, type MedRecord } from '../src/intake/record';

const TODAY = '2026-11-16';
const WINDOW_DAYS = 14;
const OUT = 'outbox';

try { process.loadEnvFile('.env'); } catch { /* no .env: rule-based path */ }
const args = process.argv.slice(2);
const rulesOnly = args.includes('--rules');
const made = createClient(process.env);
const model = made.model;
const client = rulesOnly ? null : made.client;

const t0 = Date.now();
const clock = () => `${((Date.now() - t0) / 1000).toFixed(1).padStart(5)}s`;
const log = (step: string, text: string) => console.log(`[${clock()}] ${step.padEnd(9)} ${text}`);
const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

/* 1. Trigger: who has a slot in the window? */
const files = args.filter((a) => !a.startsWith('--'));
const candidates = (files.length ? files : readdirSync('records').filter((f) => f.endsWith('.json')).map((f) => join('records', f))).sort();
log('TRIGGER', `${candidates.length} record(s), window ${WINDOW_DAYS} days from ${TODAY}, drafting: ${client ? `model ${model}` : 'fixed wording (no model call)'}`);
mkdirSync(OUT, { recursive: true });

for (const file of candidates) {
  console.log(`\n──────── ${basename(file)}`);

  /* 2. Fetch. In production: FHIR queries by patient id. Here: one file. */
  const raw = readFileSync(file, 'utf8');
  const checked = validate(JSON.parse(raw));
  if ('errors' in checked) { log('FETCH', `rejected: ${checked.errors.join(' ')}`); continue; }
  const rec: MedRecord = checked.record;
  const due = days(TODAY, rec.appointment.date);
  if (due < 0 || due > WINDOW_DAYS) { log('TRIGGER', `slot in ${due} days: outside the window, skipped`); continue; }
  log('FETCH', `${rec.patient.id}: Patient, Appointment, ${rec.screening.invitations.length} screening rounds, ${rec.medications.length} MedicationDispense, ${rec.conditions.length} Condition, FamilyMemberHistory`);

  /* 3. Reduce: compute the profile, drop the rest, remove identity. 4. Retrieve evidence by condition match. */
  const prep = prepare(rec);
  const { facts } = prep;
  log('REDUCE', JSON.stringify(prep.reduced));
  log('', `not sent to the model: ${prep.dropped.join(', ')}`);
  for (const f of prep.evidence) log('EVIDENCE', `${f.id}  ${f.source}`);

  /* 5. Draft: one model call, or the fixed wording. */
  let path: 'model' | 'rules' = 'rules';
  let draft: Draft | null = null;
  let problems: string[] = [];

  if (client) {
    try {
      const out = await callModel(client, model, prep);
      log('DRAFT', `model answered: ${out.tokensIn} tokens in, ${out.tokensOut} out, ${out.seconds.toFixed(1)}s`);
      /* 6. Validate. A model draft that fails any check is replaced by the fixed wording. */
      const res = check(out.draft, rec, facts);
      problems = res.problems;
      if (problems.length) {
        log('VALIDATE', `FAILED: ${problems.join('; ')}`);
        log('', 'model draft discarded, fixed wording used instead');
      } else {
        log('VALIDATE', `passed: placeholders, figures, banned wording, length (${res.words} words, SMS ${res.filled.sms.length} characters)`);
        draft = res.filled;
        path = 'model';
      }
    } catch (err) {
      log('DRAFT', `model call failed (${explain(err)}): using the fixed wording`);
    }
  }
  if (!draft) {
    const r = draftByRules(rec);
    draft = { message: r.message, message_en: r.messageEn, sms: r.sms };
    const odd = unknownNumbers(`${draft.message}\n${draft.message_en}\n${draft.sms}`, rec, facts);
    log('DRAFT', `fixed wording in ${r.language}${r.warnings.length ? ` (${r.warnings.join(' ')})` : ''}`);
    log('VALIDATE', odd.length ? `FAILED figures: ${odd.join(', ')}` : 'passed: figures');
  }

  /* 7. Store with provenance. 8. Wait for a nurse. */
  const stored = {
    status: 'needs_approval',
    patientId: rec.patient.id,
    recordSha256: createHash('sha256').update(raw).digest('hex'),
    draftedBy: path === 'model' ? model : 'fixed wording',
    promptVersion: path === 'model' ? PROMPT_VERSION : null,
    evidence: facts,
    discardedModelDraft: problems,
    createdAt: new Date().toISOString(),
    ...draft,
  };
  const outFile = join(OUT, `${rec.patient.id}.json`);
  writeFileSync(outFile, JSON.stringify(stored, null, 2));
  log('STORE', `${outFile}  status needs_approval, record ${stored.recordSha256.slice(0, 12)}…, evidence ${facts.join(' ')}`);
  console.log(`\n--- message (${prep.reduced.language}${path === 'rules' ? ', fixed wording' : ''}) ---\n${draft.message}\n\n--- English for the reviewer ---\n${draft.message_en}\n\n--- SMS ---\n${draft.sms}`);
}
console.log(`\n[${clock()}] DONE      drafts wait in ${OUT}/ for staff approval. Nothing was sent.`);
