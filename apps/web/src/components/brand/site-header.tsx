import { Suspense } from 'react'
import { cookies, headers } from 'next/headers'
import { BrandLogo } from '@/components/brand/brand-logo'
import { HeaderSearch } from '@/components/brand/header-search'
import { CurrencyPicker } from '@/components/currency/currency-picker'
import { LanguagePicker } from '@/components/i18n/language-picker'
import { GlassButton } from '@/components/ui/glass-button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { AccountMenu } from '@/features/auth/account-menu'
import { ApiError, fetchCurrentUser, type CurrentUser } from '@/features/auth/api'
import { SIGN_OUT_PATH } from '@/features/auth/return-to'
import { readCurrencyCookie } from '@/features/currency/preference'
import { fetchCurrencies } from '@/features/host/experiences-api'
import { UI_LANGUAGE_FIELD } from '@/features/i18n/locale'
import { getSession } from '@/features/auth/session'
import { getTemplate, getTranslator } from '@/features/i18n/translator'
import { path } from '@/lib/routes'

/**
 * Ortak üst çubuk. Her sayfaya kopyalanmıştı; lokalize URL'lere geçerken
 * linklerin tek yerde durması şart oldu — yoksa yeni bir dil eklendiğinde
 * her sayfayı tek tek gezmek gerekir.
 *
 * **Metin sunucuda çözülüyor, istemciye PROP olarak iniyor.** Dört istemci
 * bileşeni var (dil seçici, para birimi, tema düğmesi, hesap menüsü) ve hiçbiri
 * sözlüğe dokunmuyor: sözlük `server-only` ve tarayıcıya inen tek şey o bileşenin
 * gerçekten kullandığı birkaç dizge. Alternatif — istemcide bir çeviri
 * context'i — aktif dilin TÜM anahtarlarını, kullanıcının hiç açmayacağı
 * sayfalarınkiler dahil, her sayfada indirtirdi (docs/I18N.md §5).
 */
/**
 * Üst çubuğun KABUĞU — cam yüzey, yükseklik, genişlik ve istifleme sırası.
 *
 * Ayrı bir bileşen çünkü dört sayfa bu markup'ı birebir kopyalamıştı
 * (`sign-in`, `how-it-works`, `my-experiences` ve <see cref="SiteHeader"/>).
 * Kopyaların içeriği farklıydı ama kabuğu aynıydı; header yüksekliğini ya da
 * z-index'ini değiştirmek dört dosya gezmek demekti ve biri kaçınılmaz olarak
 * geride kalırdı.
 *
 * İÇERİK burada değil: sayfalar farklı şeyler gösteriyor ve o bir tasarım
 * kararı — giriş sayfasında hesap menüsü olmaması hata değil, tercih.
 */
export function HeaderShell({ children }: { children: React.ReactNode }) {
  return (
    /*
      Tam genişlikte YAPIŞKAN bar (tasarım). Eskiden sayfanın üstünde yüzen bir
      haptı çünkü altında video vardı; artık altından beyaz sayfa geçiyor ve
      camın işi yalnız sınırı belli etmek.

      `z-40`: nav'daki açılır paneller (dil seçici, hesap menüsü) ve şehir
      seçicinin paneli (z-30) main'in üstünde çizilmeli; bar da onların
      bağlamını taşıdığı için en üstte.
    */
    <header className="glass-nav sticky top-0 z-40 border-b border-[var(--line)]">
      <div className="mx-auto grid h-20 w-full max-w-[90rem] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-4 sm:px-10">
        {children}
      </div>
    </header>
  )
}

export async function SiteHeader({ lang }: { lang: string }) {
  const [t, triggerTemplate, currencyTrigger, headerList, cookieStore] = await Promise.all([
    getTranslator(lang),
    getTemplate(lang, 'language.trigger'),
    getTemplate(lang, 'currency.trigger'),
    headers(),
    cookies(),
  ])

  // proxy `x-pathname` basıyor (sorgu dahil). Yoksa dil segmentiyle idare.
  const pathname = headerList.get('x-pathname') ?? `/${lang}`
  const displayCurrency = readCurrencyCookie(cookieStore)

  return (
    <HeaderShell>
          <BrandLogo href={path(lang, 'home')} />

        {/*
          Arama ağır: şehir/tarih/misafir istemci chunk'ları + çeviri I/O.
          Suspense olmadan dil/tema düğmeleri de onu beklerdi — yenilemeden
          hemen sonra tıklanınca "kasıyor" hissi buradan geliyordu.
        */}
        <Suspense fallback={<HeaderSearchFallback />}>
          <HeaderSearch lang={lang} />
        </Suspense>

        {/*
          `relative z-50`: orta sütundaki arama hapı (z-20) sağdaki kontrollere
          taşarsa tıklamayı yutmasın — "bir çalışıyor bir çalışmıyor"un bir nedeni.
        */}
        <div className="relative z-50 flex items-center justify-self-end gap-1 whitespace-nowrap">
          <nav className="hidden items-center lg:flex" aria-label={t('nav.primaryLabel')}>
            <GlassButton variant="ghost" size="sm" href={path(lang, 'explore')}>
              {t('nav.explore')}
            </GlassButton>
            <GlassButton variant="ghost" size="sm" href={path(lang, 'myExperiences')}>
              {t('nav.myExperiences')}
            </GlassButton>
            <GlassButton variant="ghost" size="sm" href={path(lang, 'becomeHost')}>
              {t('nav.becomeHost')}
            </GlassButton>
          </nav>
          <LanguagePicker
            current={lang}
            pathname={pathname}
            labels={{
              trigger: triggerTemplate,
              dialog: t('language.dialogLabel'),
              searchLabel: t('language.search.label'),
              searchPlaceholder: t('language.search.placeholder'),
              uiGroup: t('language.group.ui'),
              contentGroup: t('language.group.content'),
              contentHint: t('language.group.contentHint'),
              empty: t('language.empty'),
            }}
          />
          <Suspense fallback={<CurrencyPickerFallback code={displayCurrency} />}>
            <CurrencyPickerSlot
              lang={lang}
              current={displayCurrency}
              labels={{
                trigger: currencyTrigger,
                dialog: t('currency.dialogLabel'),
                searchLabel: t('currency.search.label'),
                searchPlaceholder: t('currency.search.placeholder'),
                none: t('currency.none'),
                empty: t('currency.empty'),
              }}
            />
          </Suspense>
          <ThemeToggle labels={{ toLight: t('theme.toLight'), toDark: t('theme.toDark') }} />

          <Suspense fallback={<AccountSlotFallback label={t('account.loading')} />}>
            <AccountSlot lang={lang} />
          </Suspense>
        </div>
    </HeaderShell>
  )
}

async function CurrencyPickerSlot({
  lang,
  current,
  labels,
}: {
  lang: string
  current: string | null
  labels: {
    trigger: string
    dialog: string
    searchLabel: string
    searchPlaceholder: string
    none: string
    empty: string
  }
}) {
  const currencies = await fetchCurrencies()

  return (
    <CurrencyPicker lang={lang} current={current} currencies={currencies} labels={labels} />
  )
}

function CurrencyPickerFallback({ code }: { code: string | null }) {
  return (
    <span
      className="glass glass-edge inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-glass-sm)] px-3 text-sm font-medium text-fg-muted"
      aria-hidden="true"
    >
      <span>¤</span>
      <span className="uppercase">{code ?? '—'}</span>
    </span>
  )
}

/**
 * Sınır çözülene kadar duran yer tutucu. "Giriş yap" DEĞİL: giriş yapmış
 * kullanıcıya bir an "Giriş yap" gösterip sonra adına çevirmek, her sayfa
 * yüklemesinde "çıkış mı yaptım?" dedirtir. Genişlik iki sonuca da yakın
 * tutuldu, kontroller yerinden oynamasın.
 */
function AccountSlotFallback({ label }: { label: string }) {
  /* `aria-live` YOK: her sayfa geçişinde tekrarlanan bir "yükleniyor" duyurusu
     ekran okuyucu kullanıcısı için gürültüden ibaret. Metin yalnız imleç oraya
     düşerse okunsun diye var. */
  return (
    <span className="glass glass-edge inline-flex h-9 w-24 items-center rounded-[var(--radius-glass-sm)] opacity-60">
      <span className="sr-only">{label}</span>
    </span>
  )
}

/** Arama hapı yüklenirken orta sütunu çökertme — dil/tema hemen kullanılabilir. */
function HeaderSearchFallback() {
  return (
    <div
      className="header-search relative z-20 hidden min-w-0 max-w-full items-center justify-self-center opacity-50 md:flex"
      aria-hidden="true"
    >
      <div className="header-search-fields min-h-11 min-w-0 flex-1 rounded-full" />
    </div>
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
  const t = await getTranslator(lang)

  const session = await getSession()
  if (!session) {
    return <SignInButton lang={lang} label={t('account.signIn')} />
  }

  const user = await loadViewer(session.accessToken)
  if (user === 'signedOut') {
    return <SignInButton lang={lang} label={t('account.signIn')} />
  }

  const label = user?.displayName ?? user?.email ?? t('account.menu.fallbackLabel')
  const email = user?.email ?? null

  return (
    <AccountMenu
      label={label}
      initial={initialOf(label, lang)}
      avatarUrl={user?.avatarUrl ?? null}
      accountHref={path(lang, 'account')}
      /* Dil eylem ADRESİNDE, gizli input olarak DEĞİL: form native POST ediyor ve
         gizli bir alan gövdeye girerdi — o zaman route'un formData ayrıştırması
         gerekirdi. Query string POST'ta da korunuyor ve okuması tek satır. */
      signOutPath={`${SIGN_OUT_PATH}?${UI_LANGUAGE_FIELD}=${encodeURIComponent(lang)}`}
      labels={{
        // Yer tutucular SUNUCUDA doluyor: ad ve adres render anında biliniyor,
        // istemciye şablon göndermenin bir faydası yok.
        trigger: t('account.menu.trigger', { ad: label }),
        title: t('account.menu.title'),
        signedInAs: email === null ? null : t('account.menu.signedInAs', { eposta: email }),
        account: t('account.menu.account'),
        signOut: t('account.menu.signOut'),
      }}
    />
  )
}

function SignInButton({ lang, label }: { lang: string; label: string }) {
  return (
    <GlassButton variant="primary" size="sm" href={path(lang, 'signIn')}>
      {label}
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
