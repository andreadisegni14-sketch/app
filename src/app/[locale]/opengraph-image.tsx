import { ImageResponse } from 'next/og'
import { getTranslations } from 'next-intl/server'

export const alt = 'The Blue Legacy Foundation'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OpenGraphImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'meta' })
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: 72,
          background: 'linear-gradient(180deg, #0b1c2a 0%, #1c3a52 58%, #8c7a58 62%, #1a3448 64%, #0a1824 100%)',
          color: '#F7F3EB',
        }}
      >
        <div style={{ fontSize: 22, letterSpacing: 6, textTransform: 'uppercase', color: '#B69B65' }}>{t('tagline')}</div>
        <div style={{ fontSize: 76, marginTop: 18, lineHeight: 1.05 }}>{t('siteName')}</div>
        <div style={{ fontSize: 26, marginTop: 24, color: '#d4c09a' }}>{locale === 'it' ? 'Proposta · non ancora costituita' : 'Proposed · not yet incorporated'}</div>
      </div>
    ),
    size,
  )
}
