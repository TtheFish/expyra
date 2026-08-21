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
    <footer className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-[var(--glass-border)] px-1 py-5 text-xs">
        {/* Marka adı çevrilmiyor. */}
        <span className="font-semibold tracking-tight text-fg">Expyra</span>

        <nav aria-label={t('nav.footerLabel')}>
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="text-fg-muted transition-colors duration-200 hover:text-fg focus-visible:outline-2 focus-visible:outline-brand-400 focus-visible:outline-offset-2"
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
