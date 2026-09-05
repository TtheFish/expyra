import { getTranslator } from '@/features/i18n/translator'
import { path } from '@/lib/routes'

/**
 * Ortak alt bilgi.
 *
 * Buradaki bağlantılar dekorasyon değil: üst navigasyon `sm` altında gizli
 * olduğu için telefonda "Deneyimlerim" ve "Host ol" sayfalarına ulaşan başka
 * hiçbir yol yoktu — kapıda biletini açmak isteyen kullanıcı bilet sayfasına
 * gidemiyordu. Masaüstünde de ikinci yol olması iyi (WCAG 2.4.5).
 *
 * Etiketler üst çubukla AYNI anahtarlardan geliyor: iki menüde aynı sayfanın
 * farklı adla görünmesi, çeviri eklendiğinde fark edilmeyen bir tutarsızlık olurdu.
 */
export async function SiteFooter({ lang }: { lang: string }) {
  const t = await getTranslator(lang)

  const links = [
    { href: path(lang, 'explore'), label: t('nav.explore') },
    { href: path(lang, 'myExperiences'), label: t('nav.myExperiences') },
    { href: path(lang, 'becomeHost'), label: t('nav.becomeHost') },
    { href: path(lang, 'howItWorks'), label: t('nav.howItWorks') },
  ]

  return (
    /* Sayfanın sonu: kağıttan bir ton koyu zemin + üstte çizgi (tasarım). */
    <footer className="mt-auto border-t border-[var(--line)] bg-[var(--surface-sunken)]">
      <div className="mx-auto flex w-full max-w-[90rem] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-8 text-sm text-fg-muted sm:px-10">
        {/* Marka adı çevrilmiyor. */}
        <span className="font-bold tracking-[-0.02em] text-fg">Expyra</span>

        <nav aria-label={t('nav.footerLabel')}>
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 font-semibold">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="text-fg-muted transition-colors duration-200 hover:text-fg focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] focus-visible:outline-offset-2"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  )
}
