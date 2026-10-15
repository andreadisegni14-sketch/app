/**
 * Seed data. Idempotent (safe to re-run).
 *
 * - Roles are always created.
 * - Projects and events describe the PROPOSED first-year pilot and are flagged isDemo=true,
 *   which labels them "Demo content" on the public site. Untick "Demo" in the admin once the
 *   founding team has reviewed and adopted the wording.
 * - No users are created unless SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are provided.
 *   Credentials are never hard-coded.
 * - No beneficiaries, donations or enquiries are seeded: none exist.
 */
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL is not set')
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) })

const eur = (euros: number) => euros * 100

type SeedProject = {
  slug: string
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

const PROJECTS: SeedProject[] = [
  {
    slug: 'coastal-school-renewal-pilot',
    pillar: 'COASTAL_SCHOOL_RENEWAL',
    isFeatured: true,
    sortOrder: 1,
    titleEn: 'Coastal School Renewal — pilot',
    titleIt: 'Rinnovamento di una scuola costiera — progetto pilota',
    summaryEn: 'A proposed, well-scoped renovation of one existing school in an Italian coastal community, delivered with the public body that owns the building.',
    summaryIt: "Una proposta di riqualificazione mirata di una scuola esistente in una comunità costiera italiana, realizzata insieme all'ente pubblico proprietario dell'edificio.",
    descriptionEn:
      'The pilot would fund improvements to one existing school: typically classrooms or a science laboratory, accessibility works, and an outdoor learning space that connects pupils with the coast.\n\nNo school has been selected. Candidate schools would be identified with local authorities and assessed for need, feasibility and the authorisations required for works on public buildings. Works would be designed and supervised by qualified professionals and handed over with a technical sign-off.',
    descriptionIt:
      "Il progetto pilota finanzierebbe interventi in una scuola esistente: di norma aule o un laboratorio scientifico, opere per l'accessibilità e uno spazio per la didattica all'aperto che avvicini gli studenti alla costa.\n\nNessuna scuola è stata selezionata. Le scuole candidate sarebbero individuate con gli enti locali e valutate per bisogno, fattibilità e autorizzazioni necessarie per lavori su edifici pubblici. I lavori sarebbero progettati e diretti da professionisti qualificati e consegnati con collaudo tecnico.",
    locationEn: 'Italian coast — site to be selected',
    locationIt: 'Costa italiana — sede da individuare',
    goalsEn: [
      'Improve daily learning conditions for pupils in one coastal school',
      'Deliver the works on budget, with all required authorisations',
      'Publish the baseline, costs, technical sign-off and completion report',
    ],
    goalsIt: [
      'Migliorare le condizioni di studio quotidiane in una scuola costiera',
      'Realizzare i lavori nel rispetto del budget e con tutte le autorizzazioni',
      'Pubblicare situazione di partenza, costi, collaudo e relazione finale',
    ],
    budgetLines: [
      { labelEn: 'Classroom and laboratory upgrades', labelIt: 'Riqualificazione di aule e laboratorio', amountCents: eur(20_000) },
      { labelEn: 'Accessibility works', labelIt: "Opere per l'accessibilità", amountCents: eur(8_000) },
      { labelEn: 'Outdoor learning space', labelIt: 'Spazio per la didattica all’aperto', amountCents: eur(4_000) },
      { labelEn: 'Design, supervision and permits', labelIt: 'Progettazione, direzione lavori e permessi', amountCents: eur(3_000) },
    ],
    milestones: [
      { titleEn: 'Identify candidate schools with local authorities', titleIt: 'Individuare le scuole candidate con gli enti locali', targetLabelEn: 'After incorporation', targetLabelIt: 'Dopo la costituzione' },
      { titleEn: 'Needs assessment and technical survey', titleIt: 'Analisi dei bisogni e sopralluogo tecnico', targetLabelEn: 'To be scheduled', targetLabelIt: 'Da programmare' },
      { titleEn: 'Authorisations and agreement with the building owner', titleIt: "Autorizzazioni e accordo con l'ente proprietario", targetLabelEn: 'To be scheduled', targetLabelIt: 'Da programmare' },
      { titleEn: 'Works, sign-off and public completion report', titleIt: 'Lavori, collaudo e relazione finale pubblica', targetLabelEn: 'To be scheduled', targetLabelIt: 'Da programmare' },
    ],
  },
  {
    slug: 'youth-sailing-scholarships',
    pillar: 'SAILING_FOR_IMPACT',
    sortOrder: 2,
    titleEn: 'Youth sailing scholarships',
    titleIt: 'Borse di vela per giovani',
    summaryEn: 'A modest programme funding places on sailing courses at established clubs for young people referred by schools and community organisations.',
    summaryIt: 'Un piccolo programma che finanzia posti in corsi di vela presso circoli affermati per giovani segnalati da scuole e realtà del territorio.',
    descriptionEn:
      'The foundation would fund course places, kit, insurance and transport, while partner clubs provide qualified instruction under their existing safety procedures.\n\nNo club has been engaged. Before any activity, each partner club would agree in writing to safeguarding standards, including vetted adults, supervision ratios, parental consent and incident reporting.',
    descriptionIt:
      "La fondazione finanzierebbe posti nei corsi, attrezzatura, assicurazione e trasporti, mentre i circoli partner offrirebbero istruzione qualificata secondo le proprie procedure di sicurezza.\n\nNessun circolo è stato coinvolto. Prima di qualsiasi attività, ogni circolo partner si impegnerebbe per iscritto su standard di tutela dei minori, tra cui adulti verificati, rapporti di supervisione, consenso dei genitori e segnalazione degli incidenti.",
    locationEn: 'Partner clubs to be identified',
    locationIt: 'Circoli partner da individuare',
    goalsEn: ['Give young people their first safe, structured experience of sailing', 'Remove cost as a barrier: fees, kit and transport covered', 'Report participation in aggregate only'],
    goalsIt: ['Offrire ai giovani una prima esperienza di vela sicura e strutturata', 'Eliminare il costo come ostacolo: quote, attrezzatura e trasporti coperti', 'Rendicontare la partecipazione solo in forma aggregata'],
    budgetLines: [
      { labelEn: 'Course places at partner clubs', labelIt: 'Posti nei corsi presso i circoli partner', amountCents: eur(9_000) },
      { labelEn: 'Transport', labelIt: 'Trasporti', amountCents: eur(2_500) },
      { labelEn: 'Kit and buoyancy aids', labelIt: 'Attrezzatura e giubbotti', amountCents: eur(2_000) },
      { labelEn: 'Insurance and safety', labelIt: 'Assicurazione e sicurezza', amountCents: eur(1_500) },
    ],
    milestones: [
      { titleEn: 'Adopt the child-safeguarding policy', titleIt: 'Adottare la policy per la tutela dei minori', targetLabelEn: 'Before any activity', targetLabelIt: 'Prima di ogni attività' },
      { titleEn: 'Agreements with partner clubs', titleIt: 'Accordi con i circoli partner', targetLabelEn: 'To be scheduled', targetLabelIt: 'Da programmare' },
    ],
  },
  {
    slug: 'blue-horizons-scholarships',
    pillar: 'BLUE_HORIZONS_SCHOLARSHIPS',
    sortOrder: 3,
    titleEn: 'Blue Horizons scholarships',
    titleIt: 'Borse Blue Horizons',
    summaryEn: 'Small, needs-based awards for equipment, safety certification and study connected to the sea.',
    summaryIt: 'Piccoli contributi, basati sul bisogno, per attrezzatura, certificazioni di sicurezza e studi legati al mare.',
    descriptionEn:
      'Awards would be made against published criteria, reviewed by people without a conflict of interest, and paid directly to course providers or suppliers wherever possible.\n\nRecipients would never be named publicly without their consent (or that of a parent or guardian for minors).',
    descriptionIt:
      'I contributi sarebbero assegnati secondo criteri pubblicati, valutati da persone prive di conflitti di interesse e, ove possibile, versati direttamente agli enti formativi o ai fornitori.\n\nI beneficiari non sarebbero mai nominati pubblicamente senza il loro consenso (o quello di un genitore o tutore, per i minori).',
    locationEn: 'Italian coastal communities',
    locationIt: 'Comunità costiere italiane',
    goalsEn: ['Fund equipment and certification that open doors to maritime study and work', 'Use transparent, published criteria and independent review'],
    goalsIt: ['Finanziare attrezzatura e certificazioni che aprano a studi e lavori legati al mare', 'Usare criteri trasparenti e pubblicati e una valutazione indipendente'],
    budgetLines: [
      { labelEn: 'Equipment grants', labelIt: 'Contributi per attrezzatura', amountCents: eur(5_000) },
      { labelEn: 'Safety certification', labelIt: 'Certificazioni di sicurezza', amountCents: eur(3_000) },
      { labelEn: 'Study support', labelIt: 'Sostegno allo studio', amountCents: eur(2_000) },
    ],
    milestones: [],
  },
  {
    slug: 'blue-legacy-gala',
    pillar: 'ANNUAL_GALA',
    sortOrder: 4,
    titleEn: 'The first Blue Legacy Gala',
    titleIt: 'Il primo Gala Blue Legacy',
    summaryEn: 'A small fundraising evening by the sea. Gross and net results will be published separately.',
    summaryIt: 'Una piccola serata di raccolta fondi in riva al mare. I risultati lordi e netti saranno pubblicati separatamente.',
    descriptionEn:
      'The budget below shows the illustrative direct costs of staging the evening. In the illustrative first-year scenario, gross fundraising of €30,000 less these costs would leave a net contribution of €15,000 for the programmes.\n\nNo venue, date or supplier has been booked, and tickets will not be sold before incorporation and approval.',
    descriptionIt:
      "Il budget qui sotto indica i costi diretti indicativi della serata. Nello scenario indicativo del primo anno, una raccolta lorda di 30.000 € al netto di questi costi lascerebbe un contributo netto di 15.000 € per i programmi.\n\nNessuna location, data o fornitore è stato prenotato e i biglietti non saranno venduti prima della costituzione e dell'approvazione.",
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

const EVENTS = [
  {
    slug: 'charity-regatta-partnership',
    type: 'REGATTA' as const,
    sortOrder: 1,
    titleEn: 'Charity regatta partnership (proposed)',
    titleIt: 'Partnership con una regata benefica (proposta)',
    summaryEn: 'We intend to partner with an established Italian club to add a charity dimension to one of its existing regattas. No club, regatta or date has been agreed.',
    summaryIt: 'Intendiamo collaborare con un circolo italiano affermato per aggiungere una dimensione benefica a una delle sue regate. Nessun circolo, regata o data è stato concordato.',
    locationEn: 'Partner club to be identified',
    locationIt: 'Circolo partner da individuare',
    dateLabelEn: 'Proposed for the 2027 season',
    dateLabelIt: 'Proposta per la stagione 2027',
  },
  {
    slug: 'blue-legacy-gala-2027',
    type: 'GALA' as const,
    sortOrder: 2,
    titleEn: 'The Blue Legacy Gala (proposed)',
    titleIt: 'Il Gala Blue Legacy (proposto)',
    summaryEn: 'A seated dinner for an indicative 100–120 guests. Date and venue to be confirmed after incorporation.',
    summaryIt: 'Una cena placée per circa 100–120 ospiti (indicativi). Data e location da confermare dopo la costituzione.',
    locationEn: 'Coastal venue to be selected',
    locationIt: 'Location costiera da individuare',
    dateLabelEn: 'Proposed for summer 2027',
    dateLabelIt: "Proposto per l'estate 2027",
  },
]

async function main() {
  const roles = [
    { name: 'ADMIN' as const, description: 'Full access, including personal-data exports, donations, users and settings.' },
    { name: 'EDITOR' as const, description: 'Programme content (projects, events, media) and enquiry handling.' },
    { name: 'VIEWER' as const, description: 'Read-only access to programme content and aggregate figures.' },
  ]
  for (const role of roles) {
    await db.role.upsert({ where: { name: role.name }, create: role, update: { description: role.description } })
  }

  for (const { milestones, ...project } of PROJECTS) {
    const budgetCents = project.budgetLines.reduce((sum, l) => sum + l.amountCents, 0)
    const data = { ...project, status: 'IDEA' as const, isDemo: true, isPublished: true, isFeatured: project.isFeatured ?? false, budgetCents, budgetIsIllustrative: true }
    const saved = await db.project.upsert({ where: { slug: project.slug }, create: data, update: data })
    await db.projectMilestone.deleteMany({ where: { projectId: saved.id } })
    if (milestones.length) {
      await db.projectMilestone.createMany({ data: milestones.map((m, i) => ({ ...m, projectId: saved.id, sortOrder: i })) })
    }
  }

  for (const event of EVENTS) {
    const data = { ...event, status: 'PROPOSED' as const, isDemo: true, isPublished: true, interestOpen: true }
    await db.event.upsert({ where: { slug: event.slug }, create: data, update: data })
  }

  await db.siteSetting.upsert({
    where: { key: 'launchStatusNote' },
    create: {
      key: 'launchStatusNote',
      value: {
        en: 'DEMO: the founding team is preparing the legal form and statute with Italian advisers.',
        it: "DEMO: il gruppo promotore sta preparando forma giuridica e statuto con consulenti italiani.",
      },
      description: 'Optional note shown in the launch-status section of the homepage.',
    },
    update: {},
  })

  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.SEED_ADMIN_PASSWORD
  if (email && password) {
    if (password.length < 12) throw new Error('SEED_ADMIN_PASSWORD must be at least 12 characters')
    const role = await db.role.findUniqueOrThrow({ where: { name: 'ADMIN' } })
    await db.user.upsert({
      where: { email },
      create: { email, name: process.env.SEED_ADMIN_NAME?.trim() || 'Administrator', roleId: role.id, passwordHash: await bcrypt.hash(password, 12) },
      update: {},
    })
    console.log(`Admin user ensured for ${email} (existing passwords are never overwritten).`)
  } else {
    console.log('No SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD provided: no user created. Run `npm run admin:create` to add one.')
  }

  console.log(`Seeded ${roles.length} roles, ${PROJECTS.length} DEMO projects, ${EVENTS.length} DEMO events.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
