import type { SeascapeVariant } from '@/components/art/Seascape'
import type { Pillar } from '@/generated/prisma/enums'

export function pillarArt(pillar: Pillar): SeascapeVariant {
  switch (pillar) {
    case 'SAILING_FOR_IMPACT':
      return 'regatta'
    case 'COASTAL_SCHOOL_RENEWAL':
      return 'coast'
    case 'BLUE_HORIZONS_SCHOLARSHIPS':
      return 'day'
    case 'ANNUAL_GALA':
      return 'night'
  }
}
