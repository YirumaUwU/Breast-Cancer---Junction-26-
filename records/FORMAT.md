# Kaari record format: `kaari.record/v1`

One JSON file per patient. Every file in this folder is **synthetic**: the people, purchases and results are invented.

| Field | Type | Meaning |
| --- | --- | --- |
| `format` | `"kaari.record/v1"` | Required. Files with another value are rejected. |
| `synthetic` | boolean | `true` for demo data. |
| `patient.id` | string | Record id. Never shown in a message. |
| `patient.givenName`, `patient.familyName` | string | |
| `patient.birthYear` | number | Screening ages are 50–69. |
| `patient.motherTongue` | ISO 639-1 code | `fi`, `sv`, `en`, `ru`, `et`, `ar`, `so`, … The message is drafted in this language. |
| `patient.municipality` | string | |
| `patient.mobile` | boolean | `false` means letter only. |
| `screening.invitations[]` | `{ year, attended, result? }` | One entry per screening round. `result` is `"normal"` or `"recalled-no-cancer"`. |
| `medications[]` | `{ atc, name, route, firstPurchase, lastPurchase, purchases }` | Pharmacy purchase summary per medicine. `atc` is the ATC code; dates are `YYYY-MM`. |
| `conditions[]` | `{ icd10, name, since }` | Diagnoses on record. |
| `familyHistory.breastCancerFirstDegree` | number | Mothers, sisters or daughters who have had breast cancer. |
| `appointment` | `{ date, time, site }` | The screening slot reserved for her. `date` is `YYYY-MM-DD`. |

## What the drafting step uses

- **Used:** mother tongue, age, screening history, systemic hormone therapy (ATC `G03F` combined, `G03C` oestrogen-only), first-degree family history, an earlier recall, the appointment.
- **Left out on purpose:** every other medicine and diagnosis (blood pressure, cholesterol, diabetes, thyroid, mood), vaginal oestrogen, municipality, record id. None of these has an established link to breast cancer that belongs in an invitation.

Statistics in a message come only from the evidence library in `src/intake/evidence.ts`. The drafting step may not invent a figure.
