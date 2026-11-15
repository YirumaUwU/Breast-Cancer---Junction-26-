/**
 * Evidence library. A drafted message may only state figures that appear
 * here, word for word. Each entry names its source so staff can check it.
 * All entries need clinical sign-off before real use.
 */
export interface Fact {
  id: string;
  /** When the drafting step may use it. */
  when: string;
  en: string;
  source: string;
  url: string;
}

export const FACTS: Fact[] = [
  {
    id: 'E1',
    when: 'First invitation.',
    en: 'Breast cancer is the most common cancer in women in Finland: more than 5,000 women are diagnosed each year.',
    source: 'IARC Global Cancer Observatory, Finland fact sheet 2022 (5,378 new cases)',
    url: 'https://gco.iarc.who.int/media/globocan/factsheets/populations/246-finland-fact-sheet.pdf',
  },
  {
    id: 'E2',
    when: 'Every invitation.',
    en: 'Women aged 50–69 who attend screening have about a 40% lower risk of dying of breast cancer than women who do not.',
    source: 'Lauby-Secretan B et al., IARC working group. N Engl J Med 2015;372:2353–8',
    url: 'https://doi.org/10.1056/NEJMsr1504363',
  },
  {
    id: 'E3',
    when: 'General reassurance when no more specific fact applies.',
    en: 'In Finland about 9 in 10 women with breast cancer are alive five years after diagnosis, and a cancer found early is easier to treat.',
    source: 'Finnish Cancer Registry data, five-year relative survival 92% in 2015–2019',
    url: 'https://trepo.tuni.fi/handle/10024/229065',
  },
  {
    id: 'E4',
    when: 'Systemic combined hormone therapy (ATC G03F) for two years or more.',
    en: 'You have used combined hormone therapy for about {years}. Among women who use it for five years from age 50, about 1 in 50 gets a breast cancer she would not otherwise have had. Regular screening is how it is found early.',
    source: 'Collaborative Group on Hormonal Factors in Breast Cancer. Lancet 2019;394:1159–68',
    url: 'https://doi.org/10.1016/S0140-6736(19)31709-X',
  },
  {
    id: 'E5',
    when: 'Systemic oestrogen-only hormone therapy (ATC G03C, not vaginal) for two years or more.',
    en: 'You have used oestrogen-only hormone therapy for about {years}. Among women who use it for five years from age 50, about 1 in 200 gets a breast cancer she would not otherwise have had. Regular screening is how it is found early.',
    source: 'Collaborative Group on Hormonal Factors in Breast Cancer. Lancet 2019;394:1159–68',
    url: 'https://doi.org/10.1016/S0140-6736(19)31709-X',
  },
  {
    id: 'E6',
    when: 'One or more first-degree relatives with breast cancer.',
    en: 'Your records show that a close relative has had breast cancer. Women with an affected mother, sister or daughter have about 1.8 times the usual risk, so regular screening matters more for you.',
    source: 'Collaborative Group on Hormonal Factors in Breast Cancer. Lancet 2001;358:1389–99',
    url: 'https://pubmed.ncbi.nlm.nih.gov/11705483/',
  },
  {
    id: 'E7',
    when: 'Never attended and no first-degree relative with breast cancer.',
    en: 'A family history is not what decides most cases: 8 in 9 women who get breast cancer have no mother, sister or daughter with the disease.',
    source: 'Collaborative Group on Hormonal Factors in Breast Cancer. Lancet 2001;358:1389–99',
    url: 'https://pubmed.ncbi.nlm.nih.gov/11705483/',
  },
  {
    id: 'E8',
    when: 'Recalled for more tests at an earlier screening.',
    en: 'Fewer than 5 in 100 women are asked back for more tests after screening, and most of them do not have cancer.',
    source: 'Finnish Cancer Registry, breast screening annual report on 2023 screening (recall 2.6–4.4% by age)',
    url: 'https://syoparekisteri.fi/assets/files/2025/06/Rintasyovan-seulontaohjelma-vuosiraportti-2023-seulonnasta.pdf',
  },
];

export const factById = (id: string) => FACTS.find((f) => f.id === id);
