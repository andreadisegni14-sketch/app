import { describe, expect, it } from 'vitest'
import { db } from '@/lib/db'
import { getNextPublishedEvent, getPublishedEvent, isEventInterestOpen } from '@/lib/server/public-data'
import { createEvent } from './factories'

describe('public event read models', () => {
  it('returns a published event by slug and hides unpublished or unknown ones', async () => {
    await createEvent({ slug: 'visible-gala' })
    const hidden = await createEvent({ slug: 'hidden-gala' })
    await db.event.update({ where: { id: hidden.id }, data: { isPublished: false } })

    expect(await getPublishedEvent('visible-gala')).toMatchObject({ slug: 'visible-gala', titleEn: 'Test gala' })
    expect(await getPublishedEvent('hidden-gala')).toBeNull()
    expect(await getPublishedEvent('missing')).toBeNull()
  })

  it('picks the first upcoming published event of a type by sort order', async () => {
    const base = { titleEn: 'E', titleIt: 'E', summaryEn: 'S', summaryIt: 'S', locationEn: 'L', locationIt: 'L', dateLabelEn: 'D', dateLabelIt: 'D' }
    await db.event.createMany({
      data: [
        { ...base, slug: 'later', type: 'OTHER', sortOrder: 5 },
        { ...base, slug: 'cancelled', type: 'OTHER', sortOrder: 1, status: 'CANCELLED' },
        { ...base, slug: 'unpublished', type: 'OTHER', sortOrder: 0, isPublished: false },
        { ...base, slug: 'first', type: 'OTHER', sortOrder: 2 },
        { ...base, slug: 'a-gala', type: 'GALA', sortOrder: 0 },
      ],
    })
    expect((await getNextPublishedEvent('OTHER'))?.slug).toBe('first')
    expect(await getNextPublishedEvent('PARTNERSHIP')).toBeNull()
  })

  it('only opens interest for proposed or confirmed events that accept it', () => {
    expect(isEventInterestOpen({ interestOpen: true, status: 'PROPOSED' })).toBe(true)
    expect(isEventInterestOpen({ interestOpen: true, status: 'CONFIRMED' })).toBe(true)
    expect(isEventInterestOpen({ interestOpen: false, status: 'PROPOSED' })).toBe(false)
    expect(isEventInterestOpen({ interestOpen: true, status: 'CANCELLED' })).toBe(false)
    expect(isEventInterestOpen({ interestOpen: true, status: 'COMPLETED' })).toBe(false)
  })
})
