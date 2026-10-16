/**
 * Starting (DEMO) content: the proposed first-year programme.
 *
 * Used by the seed for new databases, and by scripts/demo-content-sql.ts to update the DEMO rows of
 * an existing database when the wording changes. Everything here is a proposal and is shown with a
 * "Demo content" badge until an administrator adopts it.
 */

const eur = (euros: number) => euros * 100

export type DemoProject = {
  slug: string
  /** Earlier slugs of the same demo project, so an existing database can be updated in place. */
  previousSlugs: string[]
  pillar: 'SAILING_FOR_IMPACT' | 'COASTAL_SCHOOL_RENEWAL' | 'BLUE_HORIZONS_SCHOLARSHIPS' | 'ANNUAL_GALA'
  isFeatured?: boolean
  sortOrder: number
  titleEn: string
  titleIt: string
  summaryEn: string
  summaryIt: string
  descriptionEn: string
  descriptionIt: string
  locationEn: string
  locationIt: string
  goalsEn: string[]
  goalsIt: string[]
  budgetLines: { labelEn: string; labelIt: string; amountCents: number }[]
  milestones: { titleEn: string; titleIt: string; targetLabelEn: string; targetLabelIt: string }[]
}

export type DemoEvent = {
  slug: string
  type: 'REGATTA' | 'GALA'
  sortOrder: number
  titleEn: string
  titleIt: string
  summaryEn: string
  summaryIt: string
  locationEn: string
  locationIt: string
  dateLabelEn: string
  dateLabelIt: string
}

export const DEMO_PROJECTS: DemoProject[] = [
  {
    slug: 'school-renewal-pilot-africa',
    previousSlugs: ['coastal-school-renewal-pilot'],
    pillar: 'COASTAL_SCHOOL_RENEWAL',
    isFeatured: true,
    sortOrder: 1,
    titleEn: 'School renewal pilot — Morocco or Kenya',
    titleIt: 'Progetto pilota di riqualificazione scolastica — Marocco o Kenya',
    summaryEn:
      'A proposed, well-scoped renovation of one existing school in Morocco or Kenya, delivered with a vetted local partner organisation and the school community.',
    summaryIt:
      'Una proposta di riqualificazione mirata di una scuola esistente in Marocco o in Kenya, realizzata con un’organizzazione partner locale verificata e con la comunità scolastica.',
    descriptionEn:
      'The pilot would fund improvements to one existing school chosen with its community: typically safe classrooms and roofing, clean water and sanitation, solar power and lighting, furniture and learning materials.\n\nNo country, school or partner has been selected. We would first identify and vet an established local organisation that already works with schools, then choose a school together with the community and the local education authorities. Funds would be released in instalments against verified milestones, with photographs, a local technical sign-off and a site visit before the completion report is published.',
    descriptionIt:
      'Il progetto pilota finanzierebbe interventi in una scuola esistente scelta insieme alla sua comunità: di norma aule e coperture sicure, acqua pulita e servizi igienici, energia solare e illuminazione, arredi e materiali didattici.\n\nNessun paese, scuola o partner è stato selezionato. Prima individueremmo e verificheremmo un’organizzazione locale affermata che già lavora con le scuole, poi sceglieremmo una scuola insieme alla comunità e alle autorità scolastiche locali. I fondi sarebbero erogati in tranche a fronte di tappe verificate, con fotografie, un collaudo tecnico locale e una visita in loco prima della pubblicazione della relazione finale.',
    locationEn: 'Morocco or Kenya — school and local partner to be selected',
    locationIt: 'Marocco o Kenya — scuola e partner locale da individuare',
    goalsEn: [
      'Improve daily learning conditions for the children of one school',
      'Deliver the works on budget, with all required local authorisations',
      'Publish the baseline, costs, verification and completion report',
    ],
    goalsIt: [
      'Migliorare le condizioni di studio quotidiane dei bambini di una scuola',
      'Realizzare i lavori nel rispetto del budget e con tutte le autorizzazioni locali',
      'Pubblicare situazione di partenza, costi, verifiche e relazione finale',
    ],
    budgetLines: [
      { labelEn: 'Classroom repairs and roofing', labelIt: 'Riparazione delle aule e delle coperture', amountCents: eur(18_000) },
      { labelEn: 'Clean water and sanitation', labelIt: 'Acqua pulita e servizi igienici', amountCents: eur(7_000) },
      { labelEn: 'Solar power and lighting', labelIt: 'Energia solare e illuminazione', amountCents: eur(5_000) },
      { labelEn: 'Local technical supervision and permits', labelIt: 'Direzione tecnica locale e permessi', amountCents: eur(2_000) },
      { labelEn: 'Partner monitoring and verification visits', labelIt: 'Monitoraggio del partner e visite di verifica', amountCents: eur(3_000) },
    ],
    milestones: [
      { titleEn: 'Identify and vet a local partner organisation', titleIt: 'Individuare e verificare un’organizzazione partner locale', targetLabelEn: 'After incorporation', targetLabelIt: 'Dopo la costituzione' },
      { titleEn: 'Select a school with the community and local authorities', titleIt: 'Scegliere una scuola con la comunità e le autorità locali', targetLabelEn: 'To be scheduled', targetLabelIt: 'Da programmare' },
      { titleEn: 'Needs assessment, budget and authorisations', titleIt: 'Analisi dei bisogni, budget e autorizzazioni', targetLabelEn: 'To be scheduled', targetLabelIt: 'Da programmare' },
      { titleEn: 'Works in instalments, verification and public completion report', titleIt: 'Lavori in tranche, verifica e relazione finale pubblica', targetLabelEn: 'To be scheduled', targetLabelIt: 'Da programmare' },
    ],
  },
  {
    slug: 'blue-horizons-scholarships',
    previousSlugs: [],
    pillar: 'BLUE_HORIZONS_SCHOLARSHIPS',
    sortOrder: 2,
    titleEn: 'Blue Horizons scholarships',
    titleIt: 'Borse Blue Horizons',
    summaryEn: 'Small, needs-based awards so that students of our partner schools in Africa can stay in school and continue their education.',
    summaryIt: 'Piccoli contributi, basati sul bisogno, perché gli studenti delle nostre scuole partner in Africa possano restare a scuola e proseguire gli studi.',
    descriptionEn:
      'Awards would cover school fees, uniforms, books and the step to secondary or vocational education. They would be made against published criteria with the local partner, reviewed by people without a conflict of interest, and paid directly to schools or suppliers wherever possible.\n\nRecipients would never be named publicly without their consent and that of a parent or guardian.',
    descriptionIt:
      'I contributi coprirebbero tasse scolastiche, uniformi, libri e il passaggio alla scuola secondaria o alla formazione professionale. Sarebbero assegnati secondo criteri pubblicati insieme al partner locale, valutati da persone prive di conflitti di interesse e, ove possibile, versati direttamente a scuole o fornitori.\n\nI beneficiari non sarebbero mai nominati pubblicamente senza il loro consenso e quello di un genitore o tutore.',
    locationEn: 'Partner schools in Africa',
    locationIt: 'Scuole partner in Africa',
    goalsEn: ['Help students of partner schools stay in school', 'Use transparent, published criteria and independent review'],
    goalsIt: ['Aiutare gli studenti delle scuole partner a restare a scuola', 'Usare criteri trasparenti e pubblicati e una valutazione indipendente'],
    budgetLines: [
      { labelEn: 'School fees, uniforms and books', labelIt: 'Tasse scolastiche, uniformi e libri', amountCents: eur(5_000) },
      { labelEn: 'Secondary and vocational education support', labelIt: 'Sostegno alla scuola secondaria e alla formazione professionale', amountCents: eur(4_000) },
      { labelEn: 'Selection and monitoring with the local partner', labelIt: 'Selezione e monitoraggio con il partner locale', amountCents: eur(1_000) },
    ],
    milestones: [],
  },
  {
    slug: 'blue-legacy-regatta',
    previousSlugs: ['youth-sailing-scholarships'],
    pillar: 'SAILING_FOR_IMPACT',
    sortOrder: 3,
    titleEn: 'Towards a Blue Legacy Regatta',
    titleIt: 'Verso una Regata Blue Legacy',
    summaryEn:
      'Our long-term ambition: an annual regatta carrying the foundation’s name, bringing sailors and sponsors together to fund schools in Africa. Today it is an idea, not a plan.',
    summaryIt:
      'Il nostro obiettivo di lungo periodo: una regata annuale con il nome della fondazione, che riunisca velisti e sponsor per finanziare scuole in Africa. Oggi è un’idea, non un piano.',
    descriptionEn:
      'We intend to start as a charity partner at regattas that established clubs already run, so that we can meet sailors, owners and sponsors and show transparently what their support achieves.\n\nOnly with a proven record, an established partner club, the necessary permits and insurance would we explore a regatta of our own. No club, venue or date has been discussed.',
    descriptionIt:
      'Intendiamo iniziare come partner benefico di regate che circoli affermati già organizzano, per incontrare velisti, armatori e sponsor e mostrare in modo trasparente ciò che il loro sostegno rende possibile.\n\nSolo con una storia di risultati comprovati, un circolo partner affermato, i permessi e le assicurazioni necessari valuteremmo una regata tutta nostra. Nessun circolo, luogo o data è stato discusso.',
    locationEn: 'Italian waters — club and venue to be identified',
    locationIt: 'Acque italiane — circolo e luogo da individuare',
    goalsEn: ['Build relationships with sailors, owners and sponsors', 'Show, with published figures, what each event raises for the schools'],
    goalsIt: ['Costruire relazioni con velisti, armatori e sponsor', 'Mostrare, con cifre pubblicate, quanto ogni evento raccoglie per le scuole'],
    budgetLines: [],
    milestones: [
      { titleEn: 'Charity partner at an existing regatta', titleIt: 'Partner benefico di una regata esistente', targetLabelEn: 'After incorporation', targetLabelIt: 'Dopo la costituzione' },
      { titleEn: 'Build a record of transparent results', titleIt: 'Costruire una storia di risultati trasparenti', targetLabelEn: 'To be scheduled', targetLabelIt: 'Da programmare' },
      { titleEn: 'Explore a named regatta with an established club', titleIt: 'Valutare una regata con il nostro nome insieme a un circolo affermato', targetLabelEn: 'Long term', targetLabelIt: 'Lungo periodo' },
    ],
  },
  {
    slug: 'blue-legacy-gala',
    previousSlugs: [],
    pillar: 'ANNUAL_GALA',
    sortOrder: 4,
    titleEn: 'The first Blue Legacy Gala',
    titleIt: 'Il primo Gala Blue Legacy',
    summaryEn: 'A small fundraising evening by the sea for our school projects. Gross and net results will be published separately.',
    summaryIt: 'Una piccola serata di raccolta fondi in riva al mare per i nostri progetti scolastici. I risultati lordi e netti saranno pubblicati separatamente.',
    descriptionEn:
      'The budget below shows the illustrative direct costs of staging the evening. In the illustrative first-year scenario, gross fundraising of €30,000 less these costs would leave a net contribution of €15,000 for the school projects.\n\nNo venue, date or supplier has been booked, and tickets will not be sold before incorporation and approval.',
    descriptionIt:
      'Il budget qui sotto indica i costi diretti indicativi della serata. Nello scenario indicativo del primo anno, una raccolta lorda di 30.000 € al netto di questi costi lascerebbe un contributo netto di 15.000 € per i progetti scolastici.\n\nNessuna location, data o fornitore è stato prenotato e i biglietti non saranno venduti prima della costituzione e dell’approvazione.',
    locationEn: 'Coastal venue to be selected',
    locationIt: 'Location costiera da individuare',
    goalsEn: ['Gather a first community of supporters', 'Keep direct costs proportionate and publish gross and net results'],
    goalsIt: ['Riunire una prima comunità di sostenitori', 'Mantenere costi diretti proporzionati e pubblicare risultati lordi e netti'],
    budgetLines: [
      { labelEn: 'Venue and catering', labelIt: 'Location e catering', amountCents: eur(9_000) },
      { labelEn: 'Production and lighting', labelIt: 'Produzione e luci', amountCents: eur(3_000) },
      { labelEn: 'Insurance and permits', labelIt: 'Assicurazione e permessi', amountCents: eur(1_500) },
      { labelEn: 'Printing and communications', labelIt: 'Stampa e comunicazione', amountCents: eur(1_500) },
    ],
    milestones: [],
  },
]

export const DEMO_EVENTS: DemoEvent[] = [
  {
    slug: 'charity-regatta-partnership',
    type: 'REGATTA',
    sortOrder: 1,
    titleEn: 'Charity regatta partnership (proposed)',
    titleIt: 'Partnership con una regata benefica (proposta)',
    summaryEn:
      'We intend to partner with an established Italian club to add a charity dimension to one of its regattas and introduce our school projects to sailors, owners and sponsors. No club, regatta or date has been agreed.',
    summaryIt:
      'Intendiamo collaborare con un circolo italiano affermato per aggiungere una dimensione benefica a una delle sue regate e presentare i nostri progetti scolastici a velisti, armatori e sponsor. Nessun circolo, regata o data è stato concordato.',
    locationEn: 'Partner club to be identified',
    locationIt: 'Circolo partner da individuare',
    dateLabelEn: 'Proposed for the 2027 season',
    dateLabelIt: 'Proposta per la stagione 2027',
  },
  {
    slug: 'blue-legacy-gala-2027',
    type: 'GALA',
    sortOrder: 2,
    titleEn: 'The Blue Legacy Gala (proposed)',
    titleIt: 'Il Gala Blue Legacy (proposto)',
    summaryEn: 'A seated dinner for an indicative 100–120 guests in support of our school projects. Date and venue to be confirmed after incorporation.',
    summaryIt: 'Una cena placée per circa 100–120 ospiti (indicativi) a sostegno dei nostri progetti scolastici. Data e location da confermare dopo la costituzione.',
    locationEn: 'Coastal venue to be selected',
    locationIt: 'Location costiera da individuare',
    dateLabelEn: 'Proposed for summer 2027',
    dateLabelIt: 'Proposto per l’estate 2027',
  },
]
