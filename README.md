# Kaari

UI prototype of a screening outreach and follow-up console for care staff. Separate from Kutsu (parent folder).

```
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/index.html, one file, opens by double-click
```

Screens: Today, Patients (click a row for the patient drawer), Calendar, Follow-ups, Messages.
Deep links for demos: `#calendar`, `#follow`, `#messages`, `#patients:p4` (opens a patient).

Everything runs on invented demo data from a fixed seed (`src/data.ts`); state resets on reload.
Message texts in `src/messages.ts` are fixed drafts in six languages and need native-speaker review.
No live AI call yet: the "AI draft" label marks where the model would write the text.

## Gap chart and record-based messages

- **Who is being missed** (Today screen): attendance by mother tongue (83% against 61%) and by education (86% against 64%) with the 80% goal line. These four figures are public: Cancer Society of Finland, preliminary 2024 results. The "N more of your M must attend" line is computed from the invented patient list.
- **Messages** now follow each patient's records. The SMS carries name, time, place and at most the year of her last screening. The **After login** version adds what her records say (last mammogram, missed slot, years of hormone therapy) and tells her to contact her health station if she notices a change, rather than wait for screening.
- Record details marked with a lock never go into an SMS. Messages state facts only: no risk score, no "the AI analysed your purchases", no fear wording.
- The hormone therapy sentence needs clinical sign-off, and every language needs a native-speaker check, before real use.

## New profile: from a record to an approved message

Screen **New profile** (`#intake`, or `#intake:01` to load a sample straight away).

Default protocol for every new record:

1. **Record in.** Staff drop one or more `kaari.record/v1` JSON files (format: `records/FORMAT.md`; six synthetic samples in `records/`). A file that does not fit the format is rejected with the reasons listed.
2. **Key information.** The drafting step picks what matters for a screening invitation (mother tongue, age, screening history, systemic hormone therapy, close family history, an earlier recall, the reserved time) and lists what it left out and why (blood pressure, cholesterol, diabetes, thyroid and mood medicines, other diagnoses).
3. **Draft.** A personal message in her mother tongue with at most three evidence statements, an English version for the reviewer, and a short SMS that carries no health detail. Every statistic comes from the evidence library in `src/intake/evidence.ts`, which names its source. A figure check flags any number that is in neither the record nor the cited evidence.
4. **Staff approval.** Approve, edit or reject. Nothing is sent before approval.

### Live AI or offline rules

- **Offline rules (default, also in `dist/index.html`):** fixed wording in Finnish, Swedish, English, Russian, Estonian and Arabic. Another mother tongue falls back to Finnish with a warning.
- **Live AI:** copy `.env.example` to `.env`, set `ANTHROPIC_API_KEY` (and `ANTHROPIC_WORKSPACE_ID` if the key is not tied to one workspace), run `npm run dev`. The browser posts the record to `/api/draft`. The route (`server/draft.ts`) follows the same protocol as the pipeline below (`server/protocol.ts`): code reduces the record to a nameless profile and matches the evidence, the model words the message in any language around placeholders, code fills in name, date, time and place and checks the result. The draft panel shows "What the model saw". If the call or a check fails, the offline draft is shown with a note. Send only synthetic records while this is a demo.

### Developer view

The **Developer view** switch under the drop zone on New profile adds a "Protocol trace" panel for technical viewers. With live AI on, the browser calls `POST /api/draft?trace=1` and the server streams one JSON line per step: `INPUT` (size, SHA-256), `REDUCE` (the profile sent, and what was held back), `EVIDENCE`, `REQUEST` (the exact Messages API body: model, system prompt, output schema, user content; the key is never shown), the model output as it is written, `RESPONSE` (request id, stop reason, token usage), `FILL` (placeholders), `VALIDATE` (each check) and `QUEUE`. The switch is a display setting, not access control: the trace endpoint answers anyone who can reach the server.

### Live AI on Vercel

`npm run build` also bundles the route into `api/draft.js`, which Vercel serves as a function at `/api/draft`. Commit `api/draft.js`, then in the Vercel project add the environment variables `ANTHROPIC_API_KEY` and, if needed, `ANTHROPIC_WORKSPACE_ID`, and redeploy. The endpoint is public: it only accepts valid records and returns invitation drafts, but every call costs API credit, so remove the key from Vercel after the demo. Not yet tested on Vercel itself; the bundled function was tested locally.

All evidence entries and all non-English wording need clinical and native-speaker sign-off before real use.

## Pipeline run (the production protocol, on synthetic records)

```
npm run pipeline                       # every record in records/ with a slot in the next 14 days
npm run pipeline -- records/01-*.json  # chosen files
npm run pipeline -- --rules            # no model call, fixed wording
```

`scripts/pipeline.ts` prints each stage with a timestamp: trigger, fetch, reduce, evidence, draft, validate, store. Code does the retrieval and the checks. The model receives only a reduced profile with no name, id, date or place (those are placeholders filled in afterwards) plus the evidence statements that apply. A model draft that fails a check is discarded and the fixed wording is used. Drafts land in `outbox/` with status `needs_approval` and their provenance (record hash, evidence ids, model, prompt version). Nothing is sent.
