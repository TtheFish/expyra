import { BrandLogo } from '@/components/brand/brand-logo'
import { LanguagePicker } from '@/components/i18n/language-picker'
import { GlassButton } from '@/components/ui/glass-button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { path } from '@/lib/routes'

/**
 * Ortak üst çubuk. Her sayfaya kopyalanmıştı; lokalize URL'lere geçerken
 * linklerin tek yerde durması şart oldu — yoksa yeni bir dil eklendiğinde
 * her sayfayı tek tek gezmek gerekir.
 */
export function SiteHeader({ lang }: { lang: string }) {
  return (
    /* z-30: nav'daki açılır paneller (dil seçici) main'in üstünde çizilmeli.
       Header ve main aynı z-10'daysa DOM'da sonra gelen main kazanır. */
    <header className="relative z-30 px-4 pt-4">
      <div className="glass glass-edge glass-nav mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-3 pl-4">
        <BrandLogo className="text-white text-on-media" href={path(lang, 'home')} />

        <nav className="hidden items-center gap-1 sm:flex" aria-label="Ana menü">
          <GlassButton variant="ghost" size="sm" href={path(lang, 'explore')} className="text-nav-link">
            Keşfet
          </GlassButton>
          <GlassButton
            variant="ghost"
            size="sm"
            href={path(lang, 'myExperiences')}
            className="text-nav-link"
          >
            Deneyimlerim
          </GlassButton>
          <GlassButton
            variant="ghost"
            size="sm"
            href={path(lang, 'becomeHost')}
            className="text-nav-link"
          >
            Host ol
          </GlassButton>
        </nav>

        <div className="flex items-center gap-2">
          <LanguagePicker current={lang} />
          <ThemeToggle />
          <GlassButton variant="primary" size="sm" href={path(lang, 'signIn')}>
            Giriş yap
          </GlassButton>
        </div>
      </div>
    </header>
  )
}
