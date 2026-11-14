import { fmtDay, type Appt, type Lang, type MsgKind, type Patient } from './data';

/**
 * Message drafts per language. In the prototype these are fixed drafts; in a
 * real deployment the AI drafts them and a native speaker approves each one.
 * No health detail, no fear wording, always a way to change the time.
 */
const T: Record<Lang, Record<MsgKind, string>> = {
  English: {
    remind: 'Hi {name}, your free breast screening is on {date} at {time}, {place}. Need another time? {link}',
    rebook: 'Hi {name}, we missed you last time. We have booked a new free screening for you: {date} at {time}, {place}. Change it here: {link}',
    follow: 'Hi {name}, your follow-up appointment is on {date} at {time}, {place}. It is the next step after your screening. Questions? {link}',
  },
  Finnish: {
    remind: 'Hei {name}, maksuton rintasyövän seulonta-aikasi on {date} klo {time}, {place}. Tarvitsetko toisen ajan? {link}',
    rebook: 'Hei {name}, edellinen aikasi jäi käyttämättä. Varasimme sinulle uuden maksuttoman seulonta-ajan: {date} klo {time}, {place}. Vaihda aika: {link}',
    follow: 'Hei {name}, jatkotutkimusaikasi on {date} klo {time}, {place}. Käynti on seuraava vaihe seulontasi jälkeen. Kysyttävää? {link}',
  },
  Swedish: {
    remind: 'Hej {name}, din kostnadsfria mammografiscreening är {date} kl. {time}, {place}. Behöver du en annan tid? {link}',
    rebook: 'Hej {name}, du missade din förra tid. Vi har bokat en ny kostnadsfri screeningtid åt dig: {date} kl. {time}, {place}. Byt tid: {link}',
    follow: 'Hej {name}, din uppföljningstid är {date} kl. {time}, {place}. Besöket är nästa steg efter din screening. Frågor? {link}',
  },
  Russian: {
    remind: 'Здравствуйте, {name}! Ваша бесплатная маммография назначена на {date} в {time}, {place}. Нужно другое время? {link}',
    rebook: 'Здравствуйте, {name}! Вы пропустили прошлый приём. Мы записали вас на новую бесплатную маммографию: {date} в {time}, {place}. Изменить время: {link}',
    follow: 'Здравствуйте, {name}! Ваш повторный приём назначен на {date} в {time}, {place}. Это следующий шаг после обследования. Вопросы? {link}',
  },
  Estonian: {
    remind: 'Tere, {name}! Teie tasuta rinnavähi sõeluuring on {date} kell {time}, {place}. Kas vajate teist aega? {link}',
    rebook: 'Tere, {name}! Eelmine aeg jäi kasutamata. Broneerisime teile uue tasuta sõeluuringu aja: {date} kell {time}, {place}. Muuda aega: {link}',
    follow: 'Tere, {name}! Teie järelkontrolli aeg on {date} kell {time}, {place}. See on järgmine samm pärast sõeluuringut. Küsimusi? {link}',
  },
  Arabic: {
    remind: 'مرحباً {name}، موعد فحص الثدي المجاني الخاص بك هو {date} الساعة {time} في {place}. هل تحتاجين موعداً آخر؟ {link}',
    rebook: 'مرحباً {name}، فاتك موعدك السابق. حجزنا لك موعداً جديداً مجانياً لفحص الثدي: {date} الساعة {time} في {place}. لتغيير الموعد: {link}',
    follow: 'مرحباً {name}، موعد المتابعة الخاص بك هو {date} الساعة {time} في {place}. هذه هي الخطوة التالية بعد الفحص. لديك أسئلة؟ {link}',
  },
};

/** Reminder wording that follows the patient's screening history. */
const R: Record<Lang, { first: string; regular: string }> = {
  English: {
    first: 'Hi {name}, welcome to your first free breast screening: {date} at {time}, {place}. Need another time? {link}',
    regular: 'Hi {name}, your last breast screening was in {year}. Your next free one is on {date} at {time}, {place}. Need another time? {link}',
  },
  Finnish: {
    first: 'Hei {name}, tervetuloa ensimmäiseen maksuttomaan rintasyövän seulontaasi: {date} klo {time}, {place}. Tarvitsetko toisen ajan? {link}',
    regular: 'Hei {name}, kävit viimeksi seulonnassa vuonna {year}. Seuraava maksuton aikasi on {date} klo {time}, {place}. Tarvitsetko toisen ajan? {link}',
  },
  Swedish: {
    first: 'Hej {name}, välkommen till din första kostnadsfria mammografiscreening: {date} kl. {time}, {place}. Behöver du en annan tid? {link}',
    regular: 'Hej {name}, din senaste screening var {year}. Din nästa kostnadsfria tid är {date} kl. {time}, {place}. Behöver du en annan tid? {link}',
  },
  Russian: {
    first: 'Здравствуйте, {name}! Приглашаем вас на первую бесплатную маммографию: {date} в {time}, {place}. Нужно другое время? {link}',
    regular: 'Здравствуйте, {name}! В последний раз вы проходили обследование в {year} году. Следующая бесплатная маммография: {date} в {time}, {place}. Нужно другое время? {link}',
  },
  Estonian: {
    first: 'Tere, {name}! Olete oodatud oma esimesele tasuta rinnavähi sõeluuringule: {date} kell {time}, {place}. Kas vajate teist aega? {link}',
    regular: 'Tere, {name}! Käisite viimati sõeluuringul {year}. aastal. Teie järgmine tasuta aeg on {date} kell {time}, {place}. Kas vajate teist aega? {link}',
  },
  Arabic: {
    first: 'مرحباً {name}، أهلاً بك في أول فحص مجاني للثدي: {date} الساعة {time} في {place}. هل تحتاجين موعداً آخر؟ {link}',
    regular: 'مرحباً {name}، كان آخر فحص للثدي لك في عام {year}. موعدك المجاني القادم هو {date} الساعة {time} في {place}. هل تحتاجين موعداً آخر؟ {link}',
  },
};

/**
 * Longer message the patient opens after strong login. This is the only place
 * where details from her records are written out: an SMS can be read by anyone
 * holding the phone. Wording is factual, with no fear and no risk score. The
 * hormone therapy sentence needs clinical sign-off before real use.
 */
type Part = 'hi' | 'first' | 'regular' | 'missed' | 'never' | 'hrt' | 'slot' | 'symptom';
const S: Record<Lang, Record<Part, string>> = {
  English: {
    hi: 'Hi {name},',
    first: 'This is your first invitation to breast screening. It is free and takes about 15 minutes.',
    regular: 'Our records show your last mammogram was in {year}. Screening is offered every two years, so it is time for the next one.',
    missed: 'Our records show your last mammogram was in {year}, and you could not make your latest appointment. We have kept a new time for you.',
    never: 'Our records show you have not had a screening mammogram yet. It is free and takes about 15 minutes.',
    hrt: 'You have used hormone therapy for about {n} years. Regular screening is especially useful during long hormone therapy.',
    slot: 'Your time: {date} at {time}, {place}. Choose another time here: {link}',
    symptom: 'If you notice a lump or another change in your breast, do not wait for screening. Contact your health station.',
  },
  Finnish: {
    hi: 'Hei {name},',
    first: 'Tämä on ensimmäinen kutsusi rintasyövän seulontaan. Tutkimus on maksuton ja kestää noin 15 minuuttia.',
    regular: 'Tietojemme mukaan edellinen mammografiasi oli vuonna {year}. Seulonta tehdään kahden vuoden välein, joten nyt on seuraavan aika.',
    missed: 'Tietojemme mukaan edellinen mammografiasi oli vuonna {year}, ja viimeisin aikasi jäi käyttämättä. Olemme varanneet sinulle uuden ajan.',
    never: 'Tietojemme mukaan et ole vielä käynyt seulontamammografiassa. Tutkimus on maksuton ja kestää noin 15 minuuttia.',
    hrt: 'Olet käyttänyt hormonihoitoa noin {n} vuotta. Säännöllinen seulonta on erityisen hyödyllistä pitkän hormonihoidon aikana.',
    slot: 'Aikasi: {date} klo {time}, {place}. Valitse toinen aika täältä: {link}',
    symptom: 'Jos huomaat rinnassa kyhmyn tai muun muutoksen, älä odota seulontaa. Ota yhteys terveysasemaasi.',
  },
  Swedish: {
    hi: 'Hej {name},',
    first: 'Det här är din första kallelse till mammografiscreening. Undersökningen är kostnadsfri och tar cirka 15 minuter.',
    regular: 'Enligt våra uppgifter gjordes din senaste mammografi {year}. Screening erbjuds vartannat år, så nu är det dags igen.',
    missed: 'Enligt våra uppgifter gjordes din senaste mammografi {year}, och din senaste tid blev outnyttjad. Vi har reserverat en ny tid åt dig.',
    never: 'Enligt våra uppgifter har du ännu inte gjort någon screeningmammografi. Undersökningen är kostnadsfri och tar cirka 15 minuter.',
    hrt: 'Du har använt hormonbehandling i ungefär {n} år. Regelbunden screening är särskilt värdefull vid långvarig hormonbehandling.',
    slot: 'Din tid: {date} kl. {time}, {place}. Välj en annan tid här: {link}',
    symptom: 'Om du märker en knöl eller någon annan förändring i bröstet, vänta inte på screeningen. Kontakta din hälsostation.',
  },
  Russian: {
    hi: 'Здравствуйте, {name}!',
    first: 'Это ваше первое приглашение на маммографический скрининг. Обследование бесплатное и занимает около 15 минут.',
    regular: 'По нашим данным, последняя маммография была у вас в {year} году. Скрининг проводится раз в два года, поэтому пришло время следующего.',
    missed: 'По нашим данным, последняя маммография была у вас в {year} году, а последний приём вы пропустили. Мы забронировали для вас новое время.',
    never: 'По нашим данным, вы ещё не проходили скрининговую маммографию. Обследование бесплатное и занимает около 15 минут.',
    hrt: 'Вы принимаете гормональную терапию около {n} лет. При длительной гормональной терапии регулярный скрининг особенно полезен.',
    slot: 'Ваше время: {date} в {time}, {place}. Выбрать другое время: {link}',
    symptom: 'Если вы заметили уплотнение или другое изменение в груди, не ждите скрининга. Обратитесь в свою поликлинику.',
  },
  Estonian: {
    hi: 'Tere, {name}!',
    first: 'See on teie esimene kutse rinnavähi sõeluuringule. Uuring on tasuta ja kestab umbes 15 minutit.',
    regular: 'Meie andmetel tehti teie viimane mammograafia {year}. aastal. Sõeluuring toimub iga kahe aasta järel, seega on aeg järgmiseks.',
    missed: 'Meie andmetel tehti teie viimane mammograafia {year}. aastal ja viimane aeg jäi kasutamata. Broneerisime teile uue aja.',
    never: 'Meie andmetel ei ole te veel sõeluuringu mammograafias käinud. Uuring on tasuta ja kestab umbes 15 minutit.',
    hrt: 'Olete kasutanud hormoonravi umbes {n} aastat. Pikaajalise hormoonravi ajal on regulaarne sõeluuring eriti kasulik.',
    slot: 'Teie aeg: {date} kell {time}, {place}. Valige teine aeg siin: {link}',
    symptom: 'Kui märkate rinnas tükki või muud muutust, ärge oodake sõeluuringut. Võtke ühendust oma tervisekeskusega.',
  },
  Arabic: {
    hi: 'مرحباً {name}،',
    first: 'هذه أول دعوة لك لفحص الثدي. الفحص مجاني ويستغرق حوالي 15 دقيقة.',
    regular: 'حسب سجلاتنا، كان آخر تصوير للثدي لك في عام {year}. يُجرى الفحص كل سنتين، وقد حان موعد الفحص التالي.',
    missed: 'حسب سجلاتنا، كان آخر تصوير للثدي لك في عام {year}، ولم تتمكني من حضور موعدك الأخير. حجزنا لك موعداً جديداً.',
    never: 'حسب سجلاتنا، لم تُجري بعد تصوير الثدي ضمن برنامج الفحص. الفحص مجاني ويستغرق حوالي 15 دقيقة.',
    hrt: 'أنت تستخدمين العلاج الهرموني منذ حوالي {n} سنوات. الفحص المنتظم مفيد بشكل خاص عند استخدام العلاج الهرموني لفترة طويلة.',
    slot: 'موعدك: {date} الساعة {time} في {place}. لاختيار موعد آخر: {link}',
    symptom: 'إذا لاحظتِ كتلة أو أي تغيّر آخر في الثدي، فلا تنتظري موعد الفحص. تواصلي مع مركزك الصحي.',
  },
};

export type Segment = 'first' | 'regular' | 'missed' | 'never';
export const segment = (p: Patient): Segment =>
  p.invited === 0 ? 'first' : !p.lastScreen ? 'never' : p.reasons.includes('Missed last time') ? 'missed' : 'regular';

function fill(t: string, p: Patient, a: Appt): string {
  const d = fmtDay(a.date);
  return t
    .replace('{year}', String(p.lastScreen ?? ''))
    .replace('{n}', String(p.hrtYears))
    .replace('{name}', p.first)
    .replace('{date}', `${d.day}.${new Date(a.date).getUTCMonth() + 1}.`)
    .replace('{time}', a.time)
    .replace('{place}', a.site)
    .replace('{link}', 'kaari.example/a');
}

/** SMS: name, time, place and at most the year of her last visit. */
export function compose(p: Patient, a: Appt, lang: Lang = p.lang, kind: MsgKind = a.msgKind): string {
  const seg = segment(p);
  const t = kind === 'remind' && (seg === 'first' || seg === 'regular') ? R[lang][seg] : T[lang][kind];
  return fill(t, p, a);
}

/** Secure message: adds what her records say. Screening invitations only. */
export function composeSecure(p: Patient, a: Appt, lang: Lang = p.lang): string {
  const parts: Part[] = ['hi', segment(p), ...(p.hrtYears ? (['hrt'] as Part[]) : []), 'slot', 'symptom'];
  return parts.map((k) => fill(S[lang][k], p, a)).join('\n\n');
}

export interface Basis {
  text: string;
  /** Record it came from. */
  from: string;
  /** True when it may only appear in the secure message, never in an SMS. */
  secure?: boolean;
}

/** The record signals behind a draft, shown to staff next to it. */
export function basis(p: Patient, a: Appt): Basis[] {
  const seg = segment(p);
  const b: Basis[] = [{ text: p.lang, from: 'Population register' }];
  if (a.msgKind === 'follow') b.push({ text: 'After screening', from: 'Screening register' });
  else {
    b.push({ text: seg === 'first' ? 'First invitation' : p.lastScreen ? `Last mammogram ${p.lastScreen}` : 'No mammogram yet', from: 'Screening register' });
    if (seg === 'missed' || a.msgKind === 'rebook') b.push({ text: 'Missed last slot', from: 'Screening register' });
    if (p.hrtYears) b.push({ text: `Hormone therapy ${p.hrtYears} yrs`, from: 'Prescription records', secure: true });
  }
  b.push({ text: `Reads ${p.bestTime.toLowerCase()}s`, from: 'Message history' });
  b.push({ text: p.mobile ? 'SMS' : 'Letter', from: 'Contact details' });
  return b;
}

export const KIND_LABEL: Record<MsgKind, string> = { remind: 'Reminder', rebook: 'New time', follow: 'Follow-up' };
