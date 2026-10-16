import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { LegalShell } from '@/components/site/LegalPage'
import { pageMetadata } from '@/lib/seo'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return pageMetadata(locale, 'cookies', '/cookies')
}

export default async function CookiesPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('legal.cookies')
  const rows = t.raw('rows') as { name: string; purpose: string; duration: string; type: string }[]
  return (
    <LegalShell title={t('title')} intro={t('intro')}>
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead className="bg-ivory-deep">
            <tr>
              {[t('tableName'), t('tablePurpose'), t('tableDuration'), t('tableType')].map((h) => (
                <th key={h} scope="col" className="px-4 py-3 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name} className="border-t border-line">
                <th scope="row" className="px-4 py-3 font-mono text-xs font-medium">
                  {row.name}
                </th>
                <td className="px-4 py-3">{row.purpose}</td>
                <td className="px-4 py-3">{row.duration}</td>
                <td className="px-4 py-3">{row.type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="leading-relaxed">{t('analytics')}</p>
      <p className="leading-relaxed">{t('noThirdParty')}</p>
    </LegalShell>
  )
}
