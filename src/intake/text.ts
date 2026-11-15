import type { Lang } from '../data';

/**
 * Evidence sentences per language for the rule-based drafting path. They say
 * the same as the English entries in evidence.ts. Every language needs a
 * native-speaker check before real use.
 */
export const F: Record<Lang, Record<string, string>> = {
  English: {
    E1: 'Breast cancer is the most common cancer in women in Finland: more than 5,000 women are diagnosed each year.',
    E2: 'Women aged 50–69 who attend screening have about a 40% lower risk of dying of breast cancer than women who do not.',
    E3: 'In Finland about 9 in 10 women with breast cancer are alive five years after diagnosis, and a cancer found early is easier to treat.',
    E4: 'You have used combined hormone therapy for about {years}. Among women who use it for five years from age 50, about 1 in 50 gets a breast cancer she would not otherwise have had. Regular screening is how it is found early.',
    E5: 'You have used oestrogen-only hormone therapy for about {years}. Among women who use it for five years from age 50, about 1 in 200 gets a breast cancer she would not otherwise have had. Regular screening is how it is found early.',
    E6: 'Your records show that a close relative has had breast cancer. Women with an affected mother, sister or daughter have about 1.8 times the usual risk, so regular screening matters more for you.',
    E7: 'A family history is not what decides most cases: 8 in 9 women who get breast cancer have no mother, sister or daughter with the disease.',
    E8: 'Fewer than 5 in 100 women are asked back for more tests after screening, and most of them do not have cancer.',
    recalled: 'Last time you were asked back for more tests, and no cancer was found.',
    sms: 'Hi {name}, your free breast screening is on {date} at {time}, {place}. A personal message is waiting for you: {link}',
  },
  Finnish: {
    E1: 'Rintasyöpä on naisten yleisin syöpä Suomessa: siihen sairastuu vuosittain yli 5 000 naista.',
    E2: 'Seulontaan osallistuvilla 50–69-vuotiailla naisilla on noin 40 % pienempi riski kuolla rintasyöpään kuin naisilla, jotka eivät osallistu.',
    E3: 'Suomessa noin 9 naista 10:stä on elossa viiden vuoden kuluttua rintasyöpädiagnoosista, ja varhain löydetty syöpä on helpompi hoitaa.',
    E4: 'Olet käyttänyt yhdistelmähormonihoitoa noin {years}. Kun hoitoa käytetään viisi vuotta 50 vuoden iästä alkaen, noin yksi nainen 50:stä sairastuu rintasyöpään, jota hän ei muuten olisi saanut. Säännöllisessä seulonnassa se löytyy varhain.',
    E5: 'Olet käyttänyt pelkkää estrogeenia sisältävää hormonihoitoa noin {years}. Kun hoitoa käytetään viisi vuotta 50 vuoden iästä alkaen, noin yksi nainen 200:sta sairastuu rintasyöpään, jota hän ei muuten olisi saanut. Säännöllisessä seulonnassa se löytyy varhain.',
    E6: 'Tietojemme mukaan lähisukulaisellasi on ollut rintasyöpä. Naisilla, joiden äidillä, sisarella tai tyttärellä on ollut rintasyöpä, riski on noin 1,8-kertainen, joten säännöllinen seulonta on sinulle erityisen tärkeää.',
    E7: 'Sukutausta ei selitä useimpia tapauksia: 8 naisella 9:stä rintasyöpään sairastuvasta ei ole äitiä, sisarta tai tytärtä, jolla olisi ollut sama sairaus.',
    E8: 'Alle 5 naista 100:sta kutsutaan seulonnan jälkeen jatkotutkimuksiin, ja useimmilla heistä ei ole syöpää.',
    recalled: 'Viime kerralla sinut kutsuttiin jatkotutkimuksiin, eikä syöpää löytynyt.',
    sms: 'Hei {name}, maksuton rintasyövän seulonta-aikasi on {date} klo {time}, {place}. Sinulle on henkilökohtainen viesti: {link}',
  },
  Swedish: {
    E1: 'Bröstcancer är den vanligaste cancerformen hos kvinnor i Finland: över 5 000 kvinnor får diagnosen varje år.',
    E2: 'Kvinnor i åldern 50–69 år som deltar i screening har ungefär 40 % lägre risk att dö i bröstcancer än kvinnor som inte deltar.',
    E3: 'I Finland lever ungefär 9 av 10 kvinnor med bröstcancer fem år efter diagnosen, och en cancer som hittas tidigt är lättare att behandla.',
    E4: 'Du har använt kombinerad hormonbehandling i ungefär {years}. Bland kvinnor som använder den i fem år från 50 års ålder får ungefär 1 av 50 en bröstcancer som hon annars inte skulle ha fått. Med regelbunden screening hittas den tidigt.',
    E5: 'Du har använt hormonbehandling med enbart östrogen i ungefär {years}. Bland kvinnor som använder den i fem år från 50 års ålder får ungefär 1 av 200 en bröstcancer som hon annars inte skulle ha fått. Med regelbunden screening hittas den tidigt.',
    E6: 'Enligt våra uppgifter har en nära släkting till dig haft bröstcancer. Kvinnor vars mamma, syster eller dotter har haft bröstcancer har ungefär 1,8 gånger så hög risk, så regelbunden screening är extra viktig för dig.',
    E7: 'Ärftlighet förklarar inte de flesta fallen: 8 av 9 kvinnor som får bröstcancer har ingen mamma, syster eller dotter med sjukdomen.',
    E8: 'Färre än 5 av 100 kvinnor kallas till fler undersökningar efter screeningen, och de flesta av dem har inte cancer.',
    recalled: 'Förra gången kallades du till fler undersökningar, och ingen cancer hittades.',
    sms: 'Hej {name}, din kostnadsfria mammografiscreening är {date} kl. {time}, {place}. Du har ett personligt meddelande: {link}',
  },
  Russian: {
    E1: 'Рак молочной железы — самый частый вид рака у женщин в Финляндии: каждый год его диагностируют более чем у 5000 женщин.',
    E2: 'У женщин 50–69 лет, которые проходят скрининг, риск умереть от рака молочной железы примерно на 40 % ниже, чем у тех, кто его не проходит.',
    E3: 'В Финляндии примерно 9 из 10 женщин с раком молочной железы живы через пять лет после постановки диагноза, а рак, найденный рано, легче лечить.',
    E4: 'Вы принимаете комбинированную гормональную терапию около {years}. Среди женщин, которые принимают её пять лет начиная с 50 лет, примерно у 1 из 50 развивается рак молочной железы, которого иначе не было бы. Регулярный скрининг помогает обнаружить его рано.',
    E5: 'Вы принимаете гормональную терапию, содержащую только эстроген, около {years}. Среди женщин, которые принимают её пять лет начиная с 50 лет, примерно у 1 из 200 развивается рак молочной железы, которого иначе не было бы. Регулярный скрининг помогает обнаружить его рано.',
    E6: 'По нашим данным, у вашей близкой родственницы был рак молочной железы. У женщин, чья мать, сестра или дочь болели раком молочной железы, риск примерно в 1,8 раза выше, поэтому регулярный скрининг для вас особенно важен.',
    E7: 'Наследственность не объясняет большинство случаев: у 8 из 9 женщин, заболевших раком молочной железы, нет матери, сестры или дочери с этой болезнью.',
    E8: 'Менее 5 из 100 женщин после скрининга приглашают на дополнительное обследование, и у большинства из них рака нет.',
    recalled: 'В прошлый раз вас пригласили на дополнительное обследование, и рак не был обнаружен.',
    sms: 'Здравствуйте, {name}! Ваша бесплатная маммография назначена на {date} в {time}, {place}. Для вас есть личное сообщение: {link}',
  },
  Estonian: {
    E1: 'Rinnavähk on Soomes naiste kõige sagedasem vähk: igal aastal diagnoositakse see enam kui 5000 naisel.',
    E2: 'Sõeluuringul osalevatel 50–69-aastastel naistel on umbes 40% väiksem risk surra rinnavähki kui naistel, kes ei osale.',
    E3: 'Soomes on umbes 9 naist 10-st viis aastat pärast rinnavähi diagnoosi elus ning varakult avastatud vähki on lihtsam ravida.',
    E4: 'Olete kasutanud kombineeritud hormoonravi umbes {years}. Naistest, kes kasutavad seda viis aastat alates 50. eluaastast, haigestub umbes 1 naine 50-st rinnavähki, mida tal muidu ei oleks tekkinud. Regulaarne sõeluuring aitab selle varakult avastada.',
    E5: 'Olete kasutanud ainult östrogeeni sisaldavat hormoonravi umbes {years}. Naistest, kes kasutavad seda viis aastat alates 50. eluaastast, haigestub umbes 1 naine 200-st rinnavähki, mida tal muidu ei oleks tekkinud. Regulaarne sõeluuring aitab selle varakult avastada.',
    E6: 'Meie andmetel on teie lähisugulasel olnud rinnavähk. Naistel, kelle emal, õel või tütrel on olnud rinnavähk, on risk umbes 1,8 korda suurem, seega on regulaarne sõeluuring teile eriti oluline.',
    E7: 'Pärilikkus ei selgita enamikku juhtudest: 8 naisel 9-st, kes haigestuvad rinnavähki, ei ole ema, õde ega tütart, kellel oleks see haigus olnud.',
    E8: 'Vähem kui 5 naist 100-st kutsutakse pärast sõeluuringut lisauuringutele ja enamikul neist vähki ei ole.',
    recalled: 'Eelmisel korral kutsuti teid lisauuringutele ja vähki ei leitud.',
    sms: 'Tere, {name}! Teie tasuta rinnavähi sõeluuring on {date} kell {time}, {place}. Teile on isiklik sõnum: {link}',
  },
  Arabic: {
    E1: 'سرطان الثدي هو أكثر أنواع السرطان شيوعاً لدى النساء في فنلندا: يُشخَّص لدى أكثر من 5000 امرأة كل عام.',
    E2: 'النساء بين 50 و69 عاماً اللواتي يحضرن الفحص ينخفض لديهن خطر الوفاة بسرطان الثدي بنحو 40% مقارنة بمن لا يحضرن.',
    E3: 'في فنلندا، نحو 9 من كل 10 نساء مصابات بسرطان الثدي يبقين على قيد الحياة بعد خمس سنوات من التشخيص، والسرطان الذي يُكتشف مبكراً أسهل علاجاً.',
    E4: 'أنت تستخدمين العلاج الهرموني المركّب منذ نحو {years}. من بين النساء اللواتي يستخدمنه لمدة خمس سنوات ابتداءً من سن 50، تصاب نحو امرأة واحدة من كل 50 بسرطان ثدي ما كانت لتصاب به لولا ذلك. الفحص المنتظم يساعد على اكتشافه مبكراً.',
    E5: 'أنت تستخدمين العلاج الهرموني بالإستروجين فقط منذ نحو {years}. من بين النساء اللواتي يستخدمنه لمدة خمس سنوات ابتداءً من سن 50، تصاب نحو امرأة واحدة من كل 200 بسرطان ثدي ما كانت لتصاب به لولا ذلك. الفحص المنتظم يساعد على اكتشافه مبكراً.',
    E6: 'حسب سجلاتنا، أُصيبت إحدى قريباتك المقرّبات بسرطان الثدي. النساء اللواتي أُصيبت أمهاتهن أو أخواتهن أو بناتهن بسرطان الثدي يكون الخطر لديهن أعلى بنحو 1.8 مرة، ولذلك فإن الفحص المنتظم مهم لك بشكل خاص.',
    E7: 'التاريخ العائلي لا يفسّر معظم الحالات: 8 من كل 9 نساء يُصبن بسرطان الثدي ليس لديهن أم أو أخت أو ابنة مصابة بالمرض.',
    E8: 'تُستدعى أقل من 5 من كل 100 امرأة لإجراء فحوص إضافية بعد الفحص، ومعظمهن لا يكنّ مصابات بالسرطان.',
    recalled: 'في المرة السابقة استُدعيتِ لإجراء فحوص إضافية ولم يُكتشف أي سرطان.',
    sms: 'مرحباً {name}، موعد فحص الثدي المجاني الخاص بك هو {date} الساعة {time} في {place}. لديك رسالة شخصية: {link}',
  },
};

/** "6 years" in each language. */
export function yearsText(lang: Lang, n: number): string {
  switch (lang) {
    case 'Finnish': return `${n} vuotta`;
    case 'Swedish': return `${n} år`;
    case 'Russian': return `${n} лет`;
    case 'Estonian': return `${n} aastat`;
    case 'Arabic': return n === 2 ? 'سنتين' : n <= 10 ? `${n} سنوات` : `${n} سنة`;
    default: return `${n} years`;
  }
}
