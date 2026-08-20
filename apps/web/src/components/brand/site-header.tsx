import { Suspense } from 'react'
import { BrandLogo } from '@/components/brand/brand-logo'
import { LanguagePicker } from '@/components/i18n/language-picker'
import { GlassButton } from '@/components/ui/glass-button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { AccountMenu } from '@/features/auth/account-menu'
import { t } from '@/features/auth/account-messages'
import { ApiError, fetchCurrentUser, type CurrentUser } from '@/features/auth/api'
import { SIGN_OUT_PATH } from '@/features/auth/return-to'
import { getSession } from '@/features/auth/session'
import { path } from '@/lib/routes'

/**
 * Ortak üst çubuk. Her sayfaya kopyalanmıştı; lokalize URL'lere geçerken
 * linklerin tek yerde durması şart oldu — yoksa yeni bir dil eklendiğinde
 * her sayfayı tek tek gezmek gerekir.
 */
export function SiteHeader({ lang }: { lang: string }) {
  return (
    /* z-30: nav'daki açılır paneller (dil seçici, hesap menüsü) main'in üstünde
       çizilmeli. Header ve main aynı z-10'daysa DOM'da sonra gelen main kazanır. */
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

          {/*
            Oturum okuma AYRI bir dinamik sınırda.

            `AccountSlot` çerezlere ve `/api/auth/me`'ye dokunuyor. Aynı okuma
            header'ın gövdesinde yapılsaydı sayfanın TAMAMI o API turunu beklerdi
            — ana sayfa ve "nasıl çalışır" gibi içeriği oturumdan tamamen bağımsız
            sayfalar dahil. Suspense sınırı kabuğun hemen akmasını sağlıyor: logo,
            menü ve arama kutusu görünürken yalnız bu köşe bekliyor.

            DÜRÜSTLÜK NOTU: bu sınır bugün sayfayı STATİK YAPMIYOR. Next 16'da
            PPR (`cacheComponents`) açık olmadan `cookies()` route'un tamamını
            dinamik render'a düşürüyor ve o anahtar `next.config.ts`'te kapalı
            (açmak bu görevin dosya listesinde yok). Sınır yine de doğru yerde:
            anahtar açıldığı gün statik kabuk + dinamik delik ayrımı kendiliğinden
            oluşur, sayfaları tek tek gezmek gerekmez.
          */}
          <Suspense fallback={<AccountSlotFallback />}>
            <AccountSlot lang={lang} />
          </Suspense>
        </div>
      </div>
    </header>
  )
}

/**
 * Sınır çözülene kadar duran yer tutucu. "Giriş yap" DEĞİL: giriş yapmış
 * kullanıcıya bir an "Giriş yap" gösterip sonra adına çevirmek, her sayfa
 * yüklemesinde "çıkış mı yaptım?" dedirtir. Genişlik iki sonuca da yakın
 * tutuldu, kontroller yerinden oynamasın.
 */
function AccountSlotFallback() {
  /* `aria-live` YOK: her sayfa geçişinde tekrarlanan bir "yükleniyor" duyurusu
     ekran okuyucu kullanıcısı için gürültüden ibaret. Metin yalnız imleç oraya
     düşerse okunsun diye var. */
  return (
    <span className="glass glass-edge inline-flex h-9 w-24 items-center rounded-[var(--radius-glass-sm)] opacity-60">
      <span className="sr-only">{t('account.loading')}</span>
    </span>
  )
}

/**
 * Oturumun üst çubuktaki karşılığı.
 *
 * Oturum VAR/YOK kararını çerez veriyor (proxy'nin kullandığı sinyalin aynısı),
 * profil ise onu süslüyor. Üç durum ayrı ayrı ele alınıyor:
 *
 * - Çerez yok → "Giriş yap".
 * - Çerez var, profil 401 → çerez bayat, gerçekten çıkış yapılmış → "Giriş yap".
 * - Çerez var, profil başka bir nedenle okunamadı (5xx, ağ) → menü YİNE gösterilir,
 *   yalnız etiket genel bir metne düşer. Giriş yapmış kullanıcıya "Giriş yap"
 *   göstermek yalan olurdu ve kullanıcı zaten sahip olduğu oturum için tekrar
 *   kod isterdi; hata `console.error` ile görünür kalıyor (CLAUDE.md #1).
 */
async function AccountSlot({ lang }: { lang: string }) {
  const session = await getSession()
  if (!session) {
    return <SignInButton lang={lang} />
  }

  const user = await loadViewer(session.accessToken)
  if (user === 'signedOut') {
    return <SignInButton lang={lang} />
  }

  const label = user?.displayName ?? user?.email ?? t('account.menu.fallbackLabel')

  return (
    <AccountMenu
      label={label}
      email={user?.email ?? null}
      initial={initialOf(label, lang)}
      accountHref={path(lang, 'account')}
      signOutPath={SIGN_OUT_PATH}
    />
  )
}

function SignInButton({ lang }: { lang: string }) {
  return (
    <GlassButton variant="primary" size="sm" href={path(lang, 'signIn')}>
      {t('account.signIn')}
    </GlassButton>
  )
}

/** `'signedOut'` = çerez var ama API oturumu tanımıyor. `null` = profil okunamadı. */
async function loadViewer(
  accessToken: string | null,
): Promise<CurrentUser | 'signedOut' | null> {
  // Access çerezi düşmüş ama refresh duruyor: proxy yenilemeyi denemiş ve API'ye
  // ulaşamamış olabilir. Oturumu ölü SAYMIYORUZ — token'sız istek zaten 401 alır.
  if (!accessToken) return null

  try {
    return await fetchCurrentUser(accessToken)
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return 'signedOut'

    // Yutma değil: hata Error seviyesinde görünür kalıyor. Burada fırlatmak, API
    // kesintisinde oturumdan bağımsız her sayfayı da 500'e düşürürdü.
    console.error('auth.me.failed', error)
    return null
  }
}

/**
 * Avatar harfi. Büyük harfe çevirme SAYFANIN DİLİYLE yapılıyor: Türkçe'de
 * "i" → "İ", invariant kuralda "I" olurdu (aynı tuzak `LanguageCode.cs`'te de var).
 * `Array.from` kod noktasına göre bölüyor — emoji ile başlayan bir ad yarıya kesilmesin.
 */
function initialOf(label: string, lang: string): string {
  const first = Array.from(label.trim())[0]
  return first ? first.toLocaleUpperCase(lang) : '·'
}
