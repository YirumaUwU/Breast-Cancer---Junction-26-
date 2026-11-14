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
