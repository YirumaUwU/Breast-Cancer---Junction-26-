import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
// src/intake/record.ts
var isObj = (v) => !!v && typeof v === "object" && !Array.isArray(v);
var str = (v) => typeof v === "string" && v.length > 0 && v.length < 200;
var num = (v) => typeof v === "number" && Number.isFinite(v);
/** Checks a parsed file against the format. Returns plain-language problems. */
function validate(data) {
	const e = [];
	if (!isObj(data)) return { errors: ["The file is not a JSON object."] };
	if (data.format !== "kaari.record/v1") return { errors: ["Not a Kaari record: \"format\" must be \"kaari.record/v1\"."] };
	const p = data.patient;
	if (!isObj(p)) e.push("Missing \"patient\".");
	else {
		for (const k of [
			"id",
			"givenName",
			"familyName",
			"motherTongue",
			"municipality"
		]) if (!str(p[k])) e.push(`patient.${k} is missing.`);
		if (!num(p.birthYear) || p.birthYear < 1900 || p.birthYear > 2026) e.push("patient.birthYear is not a valid year.");
		if (typeof p.mobile !== "boolean") e.push("patient.mobile must be true or false.");
	}
	const inv = isObj(data.screening) ? data.screening.invitations : void 0;
	if (!Array.isArray(inv)) e.push("Missing \"screening.invitations\" (use an empty list for a first invitation).");
	else if (!inv.every((i) => isObj(i) && num(i.year) && typeof i.attended === "boolean")) e.push("Each invitation needs \"year\" and \"attended\".");
	if (!Array.isArray(data.medications)) e.push("Missing \"medications\" (use an empty list if none).");
	else if (!data.medications.every((m) => isObj(m) && str(m.atc) && str(m.name) && str(m.route) && /^\d{4}-\d{2}$/.test(String(m.firstPurchase)) && /^\d{4}-\d{2}$/.test(String(m.lastPurchase)) && num(m.purchases))) e.push("Each medicine needs \"atc\", \"name\", \"route\", \"firstPurchase\" and \"lastPurchase\" (YYYY-MM) and \"purchases\".");
	if (!Array.isArray(data.conditions)) e.push("Missing \"conditions\" (use an empty list if none).");
	else if (!data.conditions.every((c) => isObj(c) && str(c.icd10) && str(c.name) && num(c.since))) e.push("Each condition needs \"icd10\", \"name\" and \"since\".");
	if (!isObj(data.familyHistory) || !num(data.familyHistory.breastCancerFirstDegree)) e.push("Missing \"familyHistory.breastCancerFirstDegree\".");
	const a = data.appointment;
	if (!isObj(a) || !/^\d{4}-\d{2}-\d{2}$/.test(String(a.date)) || !/^\d{2}:\d{2}$/.test(String(a.time)) || !str(a.site)) e.push("\"appointment\" needs \"date\" (YYYY-MM-DD), \"time\" (HH:MM) and \"site\".");
	return e.length ? { errors: e } : { record: data };
}
var LANG_NAMES = {
	fi: "Finnish",
	sv: "Swedish",
	en: "English",
	ru: "Russian",
	et: "Estonian",
	ar: "Arabic",
	so: "Somali",
	ku: "Kurdish",
	fa: "Persian",
	zh: "Chinese",
	vi: "Vietnamese",
	th: "Thai",
	tr: "Turkish",
	es: "Spanish",
	uk: "Ukrainian"
};
var langName = (code) => LANG_NAMES[code.toLowerCase()] ?? code.toUpperCase();
// src/data.ts
var TODAY = "2026-11-16";
var DAY = 864e5;
var toDay = (iso) => Math.round(Date.parse(iso + "T00:00:00Z") / DAY);
var addDays = (iso, n) => (/* @__PURE__ */ new Date((toDay(iso) + n) * DAY)).toISOString().slice(0, 10);
Array.from({ length: 6 }, (_, i) => addDays(TODAY, i));
// src/intake/evidence.ts
var FACTS = [
	{
		id: "E1",
		when: "First invitation.",
		en: "Breast cancer is the most common cancer in women in Finland: more than 5,000 women are diagnosed each year.",
		source: "IARC Global Cancer Observatory, Finland fact sheet 2022 (5,378 new cases)",
		url: "https://gco.iarc.who.int/media/globocan/factsheets/populations/246-finland-fact-sheet.pdf"
	},
	{
		id: "E2",
		when: "Every invitation.",
		en: "Women aged 50–69 who attend screening have about a 40% lower risk of dying of breast cancer than women who do not.",
		source: "Lauby-Secretan B et al., IARC working group. N Engl J Med 2015;372:2353–8",
		url: "https://doi.org/10.1056/NEJMsr1504363"
	},
	{
		id: "E3",
		when: "General reassurance when no more specific fact applies.",
		en: "In Finland about 9 in 10 women with breast cancer are alive five years after diagnosis, and a cancer found early is easier to treat.",
		source: "Finnish Cancer Registry data, five-year relative survival 92% in 2015–2019",
		url: "https://trepo.tuni.fi/handle/10024/229065"
	},
	{
		id: "E4",
		when: "Systemic combined hormone therapy (ATC G03F) for two years or more.",
		en: "You have used combined hormone therapy for about {years}. Among women who use it for five years from age 50, about 1 in 50 gets a breast cancer she would not otherwise have had. Regular screening is how it is found early.",
		source: "Collaborative Group on Hormonal Factors in Breast Cancer. Lancet 2019;394:1159–68",
		url: "https://doi.org/10.1016/S0140-6736(19)31709-X"
	},
	{
		id: "E5",
		when: "Systemic oestrogen-only hormone therapy (ATC G03C, not vaginal) for two years or more.",
		en: "You have used oestrogen-only hormone therapy for about {years}. Among women who use it for five years from age 50, about 1 in 200 gets a breast cancer she would not otherwise have had. Regular screening is how it is found early.",
		source: "Collaborative Group on Hormonal Factors in Breast Cancer. Lancet 2019;394:1159–68",
		url: "https://doi.org/10.1016/S0140-6736(19)31709-X"
	},
	{
		id: "E6",
		when: "One or more first-degree relatives with breast cancer.",
		en: "Your records show that a close relative has had breast cancer. Women with an affected mother, sister or daughter have about 1.8 times the usual risk, so regular screening matters more for you.",
		source: "Collaborative Group on Hormonal Factors in Breast Cancer. Lancet 2001;358:1389–99",
		url: "https://pubmed.ncbi.nlm.nih.gov/11705483/"
	},
	{
		id: "E7",
		when: "Never attended and no first-degree relative with breast cancer.",
		en: "A family history is not what decides most cases: 8 in 9 women who get breast cancer have no mother, sister or daughter with the disease.",
		source: "Collaborative Group on Hormonal Factors in Breast Cancer. Lancet 2001;358:1389–99",
		url: "https://pubmed.ncbi.nlm.nih.gov/11705483/"
	},
	{
		id: "E8",
		when: "Recalled for more tests at an earlier screening.",
		en: "Fewer than 5 in 100 women are asked back for more tests after screening, and most of them do not have cancer.",
		source: "Finnish Cancer Registry, breast screening annual report on 2023 screening (recall 2.6–4.4% by age)",
		url: "https://syoparekisteri.fi/assets/files/2025/06/Rintasyovan-seulontaohjelma-vuosiraportti-2023-seulonnasta.pdf"
	}
];
// src/intake/engine.ts
var THIS_YEAR = 2026;
/** The facts about her that decide the wording. */
function profile(rec) {
	const inv = [...rec.screening.invitations].sort((a, b) => a.year - b.year);
	const went = inv.filter((i) => i.attended);
	const last = inv[inv.length - 1];
	const lastScreen = went.length ? went[went.length - 1].year : null;
	const segment = !inv.length ? "first" : !went.length ? "never" : !last.attended ? "missed" : "regular";
	const recalled = went.length > 0 && went[went.length - 1].result === "recalled-no-cancer";
	const months = (ym) => Number(ym.slice(0, 4)) * 12 + Number(ym.slice(5, 7));
	const hormone = rec.medications.filter((m) => /^G03[CF]/i.test(m.atc) && m.route.toLowerCase() !== "vaginal").map((m) => ({
		med: m,
		kind: /^G03F/i.test(m.atc) ? "combined" : "oestrogen",
		years: Math.round((months(m.lastPurchase) - months(m.firstPurchase)) / 12)
	})).sort((a, b) => b.years - a.years)[0];
	return {
		age: THIS_YEAR - rec.patient.birthYear,
		inv,
		went,
		last,
		lastScreen,
		segment,
		recalled,
		hormone,
		family: rec.familyHistory.breastCancerFirstDegree
	};
}
var dateText = (iso) => `${Number(iso.slice(8, 10))}.${Number(iso.slice(5, 7))}.`;
/** Evidence retrieval: matches each entry's condition against her profile. At most three. */
function chooseFacts(p) {
	const hormoneOk = p.hormone && p.hormone.years >= 2 ? p.hormone : void 0;
	const hormoneFact = hormoneOk ? hormoneOk.kind === "combined" ? "E4" : "E5" : null;
	const context = p.recalled ? "E8" : p.segment === "first" ? "E1" : p.segment === "never" && !p.family ? "E7" : "E3";
	return {
		hormoneOk,
		hormoneFact,
		facts: [
			hormoneFact,
			p.family > 0 ? "E6" : null,
			"E2",
			context
		].filter((x) => !!x).slice(0, 3)
	};
}
/**
* Guard against invented statistics: every number in the draft must come
* from the record or from the evidence entries the draft cites. Returns the
* numbers that do not.
*/
function unknownNumbers(text, rec, facts) {
	const tokens = (s) => (s.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/(\d)[,  ](\d{3})(?!\d)/g, "$1$2").match(/\d+(?:[.,]\d+)?/g) ?? []).map((t) => t.replace(",", ".").replace(/^0+(?=\d)/, ""));
	const p = profile(rec);
	const a = rec.appointment;
	const allowed = /* @__PURE__ */ new Set([
		...FACTS.filter((f) => facts.includes(f.id)).flatMap((f) => tokens(f.en)),
		...tokens(`${a.date} ${a.time} ${dateText(a.date)} ${a.site}`),
		`${Number(a.date.slice(8, 10))}.${Number(a.date.slice(5, 7))}`,
		...rec.screening.invitations.map((i) => String(i.year)),
		String(p.age),
		String(rec.patient.birthYear),
		String(p.hormone?.years ?? ""),
		String(p.family),
		String(p.inv.length),
		"15",
		"50",
		"69",
		"2"
	]);
	return [...new Set(tokens(text).filter((t) => !allowed.has(t)))];
}
// server/protocol.ts
/**
* The drafting protocol, shared by the app's server route and `npm run pipeline`:
*
*   reduce -> retrieve evidence -> draft (one model call) -> validate
*
* Code does the retrieval and the checks. The language model only words the
* message, and it never sees a name, an id, a date or a place: those are
* placeholders that code fills in afterwards.
*/
var PROMPT_VERSION = "draft-2026-11-a";
var LINK = "kaari.example/a";
var SYSTEM = `You word breast screening invitations for a public screening unit in Finland. A nurse reviews every draft before it is sent.

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
var SCHEMA = {
	type: "object",
	additionalProperties: false,
	required: [
		"message",
		"message_en",
		"sms"
	],
	properties: {
		message: { type: "string" },
		message_en: { type: "string" },
		sms: { type: "string" }
	}
};
var BANNED = [
	/\bAI\b/i,
	/algorithm/i,
	/risk score/i,
	/you (probably |likely )?have cancer/i,
	/prevents? (breast )?cancer/i,
	/will save your life/i,
	/before it is too late/i,
	/ramipril|atorvastatin|metformin|levothyroxine|escitalopram|amlodipine/i
];
var PLACEHOLDERS = [
	"{name}",
	"{date}",
	"{time}",
	"{place}",
	"{link}"
];
/** A key that is not tied to one workspace needs the workspace id on every request. */
function createClient(env) {
	const apiKey = env.ANTHROPIC_API_KEY?.trim();
	const workspace = env.ANTHROPIC_WORKSPACE_ID?.trim();
	const model = env.KAARI_MODEL?.trim() || "claude-opus-5-5";
	return {
		client: apiKey ? new Anthropic({
			apiKey,
			defaultHeaders: workspace ? { "anthropic-workspace-id": workspace } : void 0
		}) : null,
		model
	};
}
/** Reduce the record to a nameless profile and match the evidence to it. */
function prepare(rec) {
	const p = profile(rec);
	const { hormoneOk, facts } = chooseFacts(p);
	return {
		reduced: {
			language: langName(rec.patient.motherTongue),
			age: p.age,
			screening: p.segment === "first" ? "first invitation" : p.segment === "never" ? `invited ${p.inv.length} times, never attended` : p.segment === "missed" ? `last mammogram ${p.lastScreen}, missed the latest appointment, a new time is reserved` : `last mammogram ${p.lastScreen}, attends regularly`,
			recalled_last_time_no_cancer: p.recalled,
			hormone_therapy: hormoneOk ? {
				kind: hormoneOk.kind === "combined" ? "combined (oestrogen plus progestagen)" : "oestrogen-only",
				years: hormoneOk.years
			} : null,
			close_relatives_with_breast_cancer: p.family,
			has_mobile_phone: rec.patient.mobile
		},
		dropped: [
			...rec.medications.filter((m) => m !== hormoneOk?.med).map((m) => m.name),
			...rec.conditions.map((c) => c.name),
			"name",
			"id",
			"municipality",
			"birth year",
			"appointment"
		],
		facts,
		evidence: facts.map((id) => {
			const f = FACTS.find((x) => x.id === id);
			return {
				id,
				statement: f.en.replace("{years}", `${hormoneOk?.years ?? 0} years`),
				source: f.source
			};
		})
	};
}
/** The exact body of the one request to the Messages API. */
function requestBody(model, prep) {
	return {
		model,
		max_tokens: 8e3,
		system: SYSTEM,
		output_config: { format: {
			type: "json_schema",
			schema: SCHEMA
		} },
		messages: [{
			role: "user",
			content: JSON.stringify({
				profile: prep.reduced,
				evidence: prep.evidence.map(({ id, statement }) => ({
					id,
					statement
				}))
			})
		}]
	};
}
/** One model call. Returns the draft with its placeholders still in place. `onText` receives the output as it is written. */
async function callModel(client, model, prep, onText) {
	const started = Date.now();
	const stream = client.messages.stream(requestBody(model, prep));
	if (onText) stream.on("text", onText);
	const final = await stream.finalMessage();
	if (final.stop_reason === "refusal") throw new Error("the model declined");
	const raw = final.content.flatMap((b) => b.type === "text" ? [b.text] : []).join("");
	return {
		draft: JSON.parse(raw),
		raw,
		stopReason: final.stop_reason,
		requestId: stream.request_id ?? null,
		messageId: final.id,
		tokensIn: final.usage.input_tokens,
		tokensOut: final.usage.output_tokens,
		seconds: (Date.now() - started) / 1e3
	};
}
/** Fill the placeholders from the record, then check the result. An empty `problems` means it may go to a nurse. */
function check(draft, rec, facts) {
	const checks = [];
	const missing = Object.entries(draft).flatMap(([k, text]) => PLACEHOLDERS.filter((ph) => !String(text).includes(ph)).map((ph) => `${k}: placeholder ${ph} is missing`));
	checks.push({
		name: "placeholders",
		ok: !missing.length,
		detail: missing.length ? missing.join("; ") : `${PLACEHOLDERS.join(" ")} present in all three texts`
	});
	const a = rec.appointment;
	const values = {
		"{name}": rec.patient.givenName,
		"{date}": `${Number(a.date.slice(8, 10))}.${Number(a.date.slice(5, 7))}.`,
		"{time}": a.time,
		"{place}": a.site,
		"{link}": LINK
	};
	const fillIn = (s) => PLACEHOLDERS.reduce((t, ph) => t.replaceAll(ph, values[ph]), String(s));
	const filled = {
		message: fillIn(draft.message),
		message_en: fillIn(draft.message_en),
		sms: fillIn(draft.sms)
	};
	const odd = unknownNumbers(`${filled.message}\n${filled.message_en}\n${filled.sms}`, rec, facts);
	checks.push({
		name: "figures",
		ok: !odd.length,
		detail: odd.length ? `figures not in the record or the evidence: ${odd.join(", ")}` : "every number is in the record or the cited evidence"
	});
	const banned = BANNED.filter((re) => re.test(filled.message_en) || re.test(filled.sms)).map(String);
	checks.push({
		name: "banned wording",
		ok: !banned.length,
		detail: banned.length ? `banned wording: ${banned.join(" ")}` : `${BANNED.length} patterns, none matched`
	});
	const words = filled.message_en.split(/\s+/).length;
	checks.push({
		name: "length",
		ok: words <= 210 && filled.sms.length <= 300,
		detail: `message ${words} words (limit 210), SMS ${filled.sms.length} characters (limit 300)`
	});
	return {
		filled,
		values,
		checks,
		problems: checks.filter((c) => !c.ok).map((c) => c.detail),
		words
	};
}
/** A short reason safe to show to staff. */
function explain(err) {
	if (err instanceof Anthropic.RateLimitError) return "rate limited";
	if (err instanceof Anthropic.AuthenticationError) return "the API key was rejected";
	if (err instanceof Anthropic.APIError) return /workspace/i.test(err.message) ? "the API key needs ANTHROPIC_WORKSPACE_ID" : `upstream error ${err.status ?? ""}`.trim();
	return err instanceof Error ? err.message : "no usable draft came back";
}
// server/draft.ts
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
async function readJson(req) {
	const parsed = req.body;
	if (parsed !== void 0) return typeof parsed === "string" ? JSON.parse(parsed) : parsed;
	let raw = "";
	for await (const chunk of req) {
		raw += chunk;
		if (raw.length > 3e4) throw new Error("too large");
	}
	return JSON.parse(raw);
}
function send(res, status, body) {
	res.writeHead(status, {
		"content-type": "application/json; charset=utf-8",
		"cache-control": "no-store"
	});
	res.end(JSON.stringify(body));
}
function createDraftHandler(env) {
	const { client, model } = createClient(env);
	return async function handle(req, res, next) {
		const path = (req.url ?? "").split("?")[0].replace(/\/$/, "");
		if (path !== "/api/draft" && path !== "/api/draft/status") return next ? next() : send(res, 404, { error: "Not found" });
		if (req.method === "GET") return send(res, 200, { available: !!client });
		if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });
		if (!client) return send(res, 503, { error: "ANTHROPIC_API_KEY is not set" });
		let checked;
		try {
			checked = validate(await readJson(req));
		} catch {
			return send(res, 400, { error: "Bad request" });
		}
		if ("errors" in checked) return send(res, 400, { error: checked.errors.join(" ") });
		const record = checked.record;
		const trace = /[?&]trace=1/.test(req.url ?? "");
		const t0 = Date.now();
		const emit = (step, title, data) => {
			if (trace) res.write(`${JSON.stringify({
				ms: Date.now() - t0,
				step,
				title,
				data
			})}\n`);
		};
		if (trace) res.writeHead(200, {
			"content-type": "application/x-ndjson; charset=utf-8",
			"cache-control": "no-store, no-transform",
			"x-accel-buffering": "no"
		});
		const done = (status, body) => {
			if (!trace) return send(res, status, body);
			res.end(`${JSON.stringify({
				ms: Date.now() - t0,
				step: status === 200 ? "RESULT" : "ERROR",
				title: status === 200 ? "Draft handed to the approval queue" : String(body.error),
				data: body
			})}\n`);
		};
		try {
			const raw = JSON.stringify(record);
			emit("INPUT", `Record ${record.patient.id} received and matches kaari.record/v1`, {
				bytes: raw.length,
				sha256: createHash("sha256").update(raw).digest("hex"),
				resources: {
					screeningRounds: record.screening.invitations.length,
					medications: record.medications.length,
					conditions: record.conditions.length
				}
			});
			const prep = prepare(record);
			emit("REDUCE", "Code reduced the record to a profile without identity", {
				sentToModel: prep.reduced,
				notSent: prep.dropped
			});
			emit("EVIDENCE", `Code matched ${prep.evidence.length} evidence statements to the profile`, prep.evidence);
			emit("REQUEST", `POST https://api.anthropic.com/v1/messages (${model})`, {
				headers: {
					"x-api-key": "sk-ant-… (kept on the server)",
					"anthropic-version": "2023-06-01",
					"content-type": "application/json",
					...env.ANTHROPIC_WORKSPACE_ID ? { "anthropic-workspace-id": "(set, kept on the server)" } : {}
				},
				body: {
					...requestBody(model, prep),
					stream: true
				}
			});
			const out = await callModel(client, model, prep, trace ? (delta) => emit("DELTA", "", delta) : void 0);
			emit("RESPONSE", `Model answered in ${out.seconds.toFixed(1)}s: ${out.tokensIn} tokens in, ${out.tokensOut} out`, {
				requestId: out.requestId,
				messageId: out.messageId,
				stopReason: out.stopReason,
				usage: {
					input_tokens: out.tokensIn,
					output_tokens: out.tokensOut
				},
				output: out.draft
			});
			const { filled, values, checks, problems } = check(out.draft, record, prep.facts);
			emit("FILL", "Code filled the placeholders from the record", values);
			emit("VALIDATE", problems.length ? `${problems.length} check(s) failed: draft discarded` : `All ${checks.length} checks passed`, checks);
			if (problems.length) return done(422, { error: `The model draft failed the checks (${problems.join("; ")})` });
			emit("QUEUE", "Waiting for staff approval with its provenance. Nothing is sent.", {
				status: "needs_approval",
				patientId: record.patient.id,
				draftedBy: model,
				promptVersion: PROMPT_VERSION,
				evidence: prep.facts
			});
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
				seconds: Math.round(out.seconds * 10) / 10
			});
		} catch (err) {
			return done(502, { error: explain(err) });
		}
	};
}
// server/vercel.ts
/**
* Entry for the Vercel function. `npm run build:api` bundles this into
* api/draft.js, which Vercel serves at /api/draft. Set ANTHROPIC_API_KEY
* (and ANTHROPIC_WORKSPACE_ID if the key needs it) in the Vercel project.
*/
var config = { maxDuration: 60 };
var vercel_default = createDraftHandler(process.env);
export { config, vercel_default as default };
