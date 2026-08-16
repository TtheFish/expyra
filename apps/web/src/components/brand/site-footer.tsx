import { path } from '@/lib/routes'

/**
 * Ortak alt bilgi.
 *
 * Buradaki bağlantılar dekorasyon değil: üst navigasyon `sm` altında gizli
 * olduğu için telefonda "Deneyimlerim" ve "Host ol" sayfalarına ulaşan başka
 * hiçbir yol yoktu — kapıda biletini açmak isteyen kullanıcı bilet sayfasına
 * gidemiyordu. Masaüstünde de ikinci yol olması iyi (WCAG 2.4.5).
 */
export function SiteFooter({ lang }: { lang: string }) {
  const links = [
    { href: path(lang, 'explore'), label: 'Keşfet' },
    { href: path(lang, 'myExperiences'), label: 'Deneyimlerim' },
    { href: path(lang, 'becomeHost'), label: 'Host ol' },
    { href: path(lang, 'howItWorks'), label: 'Nasıl çalışır?' },
  ]

  return (
    <footer className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-[var(--glass-border)] px-1 py-5 text-xs">
        <span className="font-semibold tracking-tight text-fg">Expyra</span>

        <nav aria-label="Alt menü">
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
