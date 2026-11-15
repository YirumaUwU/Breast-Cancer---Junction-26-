import { createHash } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { validate } from '../src/intake/record';
import { PROMPT_VERSION, callModel, check, createClient, explain, prepare, requestBody } from './protocol';

/**
 * Server route for live drafting. Mounted by vite.config.ts on `npm run dev`
 * and `npm run preview`, and by api/draft.js on Vercel. The API key stays
 * here; the browser never sees it.
 *
 *   GET  /api/draft -> { available: boolean }
 *   POST /api/draft -> the checked draft as JSON (body: one kaari.record/v1)
 *   POST /api/draft?trace=1 -> developer view: the same run as a stream of
 *        JSON lines, one per protocol step, with the model output as it is written
 *
 * The browser sends only a record. This route reduces it to a nameless
 * profile, adds the prompt and the matching evidence, and checks what comes
 * back, so it cannot be used as a general-purpose proxy. See protocol.ts.
 */

async function readJson(req: IncomingMessage): Promise<unknown> {
  // Vercel parses the body before the handler runs.
  const parsed = (req as IncomingMessage & { body?: unknown }).body;
  if (parsed !== undefined) return typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 30_000) throw new Error('too large');
  }
  return JSON.parse(raw);
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

export function createDraftHandler(env: Record<string, string | undefined>) {
  const { client, model } = createClient(env);

  return async function handle(req: IncomingMessage, res: ServerResponse, next?: () => void) {
    const path = (req.url ?? '').split('?')[0].replace(/\/$/, '');
    if (path !== '/api/draft' && path !== '/api/draft/status') return next ? next() : send(res, 404, { error: 'Not found' });
    if (req.method === 'GET') return send(res, 200, { available: !!client });
    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
    if (!client) return send(res, 503, { error: 'ANTHROPIC_API_KEY is not set' });

    let checked: ReturnType<typeof validate>;
    try {
      checked = validate(await readJson(req));
    } catch {
      return send(res, 400, { error: 'Bad request' });
    }
    if ('errors' in checked) return send(res, 400, { error: checked.errors.join(' ') });

    const record = checked.record;
    const trace = /[?&]trace=1/.test(req.url ?? '');
    const t0 = Date.now();
    // Developer view: one JSON line per step, flushed as it happens.
    const emit = (step: string, title: string, data?: unknown) => {
      if (trace) res.write(`${JSON.stringify({ ms: Date.now() - t0, step, title, data })}\n`);
    };
    if (trace) res.writeHead(200, { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store, no-transform', 'x-accel-buffering': 'no' });
    const done = (status: number, body: Record<string, unknown>) => {
      if (!trace) return send(res, status, body);
      res.end(`${JSON.stringify({ ms: Date.now() - t0, step: status === 200 ? 'RESULT' : 'ERROR', title: status === 200 ? 'Draft handed to the approval queue' : String(body.error), data: body })}\n`);
    };

    try {
      const raw = JSON.stringify(record);
      emit('INPUT', `Record ${record.patient.id} received and matches kaari.record/v1`, {
        bytes: raw.length,
        sha256: createHash('sha256').update(raw).digest('hex'),
        resources: { screeningRounds: record.screening.invitations.length, medications: record.medications.length, conditions: record.conditions.length },
      });

      const prep = prepare(record);
      emit('REDUCE', 'Code reduced the record to a profile without identity', { sentToModel: prep.reduced, notSent: prep.dropped });
      emit('EVIDENCE', `Code matched ${prep.evidence.length} evidence statements to the profile`, prep.evidence);

      emit('REQUEST', `POST https://api.anthropic.com/v1/messages (${model})`, {
        headers: { 'x-api-key': 'sk-ant-… (kept on the server)', 'anthropic-version': '2023-06-01', 'content-type': 'application/json', ...(env.ANTHROPIC_WORKSPACE_ID ? { 'anthropic-workspace-id': '(set, kept on the server)' } : {}) },
        body: { ...requestBody(model, prep), stream: true },
      });
      const out = await callModel(client, model, prep, trace ? (delta) => emit('DELTA', '', delta) : undefined);
      emit('RESPONSE', `Model answered in ${out.seconds.toFixed(1)}s: ${out.tokensIn} tokens in, ${out.tokensOut} out`, {
        requestId: out.requestId, messageId: out.messageId, stopReason: out.stopReason, usage: { input_tokens: out.tokensIn, output_tokens: out.tokensOut }, output: out.draft,
      });

      const { filled, values, checks, problems } = check(out.draft, record, prep.facts);
      emit('FILL', 'Code filled the placeholders from the record', values);
      emit('VALIDATE', problems.length ? `${problems.length} check(s) failed: draft discarded` : `All ${checks.length} checks passed`, checks);
      if (problems.length) return done(422, { error: `The model draft failed the checks (${problems.join('; ')})` });
      emit('QUEUE', 'Waiting for staff approval with its provenance. Nothing is sent.', { status: 'needs_approval', patientId: record.patient.id, draftedBy: model, promptVersion: PROMPT_VERSION, evidence: prep.facts });
      return done(200, {
        ...filled,
        language: prep.reduced.language,
        facts: prep.facts,
        sentToModel: prep.reduced,
        notSent: prep.dropped,
        model,
        promptVersion: PROMPT_VERSION,
        tokensIn: out.tokensIn,
        tokensOut: out.tokensOut,
        seconds: Math.round(out.seconds * 10) / 10,
      });
    } catch (err) {
      return done(502, { error: explain(err) });
    }
  };
}
