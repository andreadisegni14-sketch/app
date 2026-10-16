/**
 * Prints, as a JSON array, the SQL statements that bring an existing database's DEMO projects and
 * events in line with prisma/demo-content.ts.
 *
 *   npx tsx scripts/demo-content-sql.ts > demo-update.json
 *
 * Safety: only rows still flagged isDemo are touched (anything an administrator adopted by unticking
 * "Demo" is left alone); statements only UPDATE or INSERT, never DELETE; projects are matched by their
 * current or previous slug, so row ids, links to media and donations are preserved.
 */
import { randomBytes } from 'node:crypto'
import { DEMO_EVENTS, DEMO_PROJECTS } from '../prisma/demo-content'

function q(value: string): string {
  if (value.includes('$c$')) throw new Error('Content must not contain $c$')
  return `$c$${value}$c$`
}

function textArray(values: string[]): string {
  return values.length ? `ARRAY[${values.map(q).join(', ')}]::text[]` : `'{}'::text[]`
}

function id(): string {
  return `c${randomBytes(12).toString('hex')}`
}

const statements: string[] = []

for (const p of DEMO_PROJECTS) {
  const slugs = [p.slug, ...p.previousSlugs].map(q).join(', ')
  const budgetCents = p.budgetLines.reduce((sum, l) => sum + l.amountCents, 0)
  statements.push(`UPDATE "Project" SET
  "slug" = ${q(p.slug)}, "pillar" = ${q(p.pillar)}::"Pillar", "isFeatured" = ${p.isFeatured ? 'true' : 'false'}, "sortOrder" = ${p.sortOrder},
  "titleEn" = ${q(p.titleEn)}, "titleIt" = ${q(p.titleIt)},
  "summaryEn" = ${q(p.summaryEn)}, "summaryIt" = ${q(p.summaryIt)},
  "descriptionEn" = ${q(p.descriptionEn)}, "descriptionIt" = ${q(p.descriptionIt)},
  "locationEn" = ${q(p.locationEn)}, "locationIt" = ${q(p.locationIt)},
  "goalsEn" = ${textArray(p.goalsEn)}, "goalsIt" = ${textArray(p.goalsIt)},
  "budgetLines" = ${q(JSON.stringify(p.budgetLines))}::jsonb, "budgetCents" = ${budgetCents}, "updatedAt" = NOW()
WHERE "isDemo" = true AND "slug" IN (${slugs})`)

  const project = `(SELECT "id" FROM "Project" WHERE "slug" = ${q(p.slug)} AND "isDemo" = true)`
  p.milestones.forEach((m, i) => {
    const fields = `"titleEn" = ${q(m.titleEn)}, "titleIt" = ${q(m.titleIt)}, "targetLabelEn" = ${q(m.targetLabelEn)}, "targetLabelIt" = ${q(m.targetLabelIt)}, "updatedAt" = NOW()`
    statements.push(`UPDATE "ProjectMilestone" SET ${fields} WHERE "projectId" = ${project} AND "sortOrder" = ${i}`)
    statements.push(`INSERT INTO "ProjectMilestone" ("id", "projectId", "titleEn", "titleIt", "targetLabelEn", "targetLabelIt", "sortOrder", "createdAt", "updatedAt")
SELECT ${q(id())}, ${project}, ${q(m.titleEn)}, ${q(m.titleIt)}, ${q(m.targetLabelEn)}, ${q(m.targetLabelIt)}, ${i}, NOW(), NOW()
WHERE ${project} IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "ProjectMilestone" WHERE "projectId" = ${project} AND "sortOrder" = ${i})`)
  })
}

for (const e of DEMO_EVENTS) {
  statements.push(`UPDATE "Event" SET
  "titleEn" = ${q(e.titleEn)}, "titleIt" = ${q(e.titleIt)}, "summaryEn" = ${q(e.summaryEn)}, "summaryIt" = ${q(e.summaryIt)},
  "locationEn" = ${q(e.locationEn)}, "locationIt" = ${q(e.locationIt)}, "dateLabelEn" = ${q(e.dateLabelEn)}, "dateLabelIt" = ${q(e.dateLabelIt)},
  "sortOrder" = ${e.sortOrder}, "updatedAt" = NOW()
WHERE "isDemo" = true AND "slug" = ${q(e.slug)}`)
}

process.stdout.write(JSON.stringify(statements, null, 2) + '\n')
