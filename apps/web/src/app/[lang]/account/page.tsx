import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { SiteFooter } from '@/components/brand/site-footer'
import { SiteHeader } from '@/components/brand/site-header'
import { GlassSurface } from '@/components/ui/glass-surface'
import {
  ApiError,
  DISPLAY_NAME_MAX_LENGTH,
  fetchCurrentUser,
  type CurrentUser,
} from '@/features/auth/api'
import { AvatarField } from '@/features/auth/avatar-field'
import { ProfileForm, type LanguageOption } from '@/features/auth/profile-form'
import { RETURN_TO_PARAM } from '@/features/auth/return-to'
import { getSession } from '@/features/auth/session'
import { getTranslator } from '@/features/i18n/translator'
import { contentLanguages, localNameOf } from '@/lib/languages'
import { alternateLinks, path } from '@/lib/routes'

/**
 * Hesap sayfası — profil görüntüle + düzenle.
 *
 * Yetki kararı BURADA veriliyor, `proxy.ts`'te değil. Proxy yalnız "çerez var mı"
 * bakan iyimser bir kestirme (kendi dosyasında yazılı); token'ın gerçekten geçerli
 * olup olmadığını ancak API söyleyebilir. İki katman da gerekli: proxy gereksiz
 * bir sayfa yüklemesini önlüyor, buradaki kontrol güvenlik sınırı.
 *
 * E-posta salt okunur: adres değiştirmek step-up doğrulama (yeni adrese kod)
 * ister ve bu blokta yok. Düzenlenebilir gibi göstermek yerine nedenini yazıyoruz.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>
}): Promise<Metadata> {
  const { lang } = await params
  const t = await getTranslator(lang)

  return {
    title: `${t('account.title')} · Expyra`,
    alternates: { languages: alternateLinks('account') },
    // Kişisel sayfa; arama motoru indekslemesin.
    robots: { index: false, follow: false },
  }
}

export default async function AccountPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  const t = await getTranslator(lang)
  const session = await getSession()

  // `redirect` NEXT_REDIRECT fırlatıyor; bu yüzden hiçbir `try` bloğunun içinde
  // çağrılmıyor — profil okuma kendi catch'iyle birlikte `loadProfile`'da duruyor.
  if (!session?.accessToken) {
    redirect(signInHref(lang))
  }

  const user = await loadProfile(session.accessToken)
  if (!user) {
    redirect(signInHref(lang))
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader lang={lang} />

      <main className="relative z-10 mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:py-16">
        <GlassSurface tone="thick" className="auth-card">
          <h1 className="auth-title">{t('account.title')}</h1>
          <p className="auth-lede">{t('account.lede')}</p>

          <section className="mt-6" aria-labelledby="hesap-eposta-etiket">
            <h2 id="hesap-eposta-etiket" className="auth-label">
              {t('account.email.label')}
            </h2>
            {/* Devre dışı bir `<input>` DEĞİL: düzenlenemeyen bir alanı form
                kontrolü gibi göstermek, kullanıcıya "bir yolunu bulursam
                değiştirebilirim" dedirtiyor. Düz metin dürüst olan. */}
            <p className="auth-email text-sm">{user.email}</p>
            <p className="auth-help">{t('account.email.note')}</p>
          </section>

          <AvatarField
            lang={lang}
            avatarUrl={user.avatarUrl}
            displayName={user.displayName}
            labels={{
              heading: t('account.avatar.label'),
              hint: t('account.avatar.help'),
              add: t('account.avatar.add'),
              change: t('account.avatar.change'),
              remove: t('account.avatar.remove'),
              uploading: t('account.avatar.uploading'),
              errorRejected: t('host.media.error.rejected'),
              errorTooLarge: t('host.media.error.tooLarge'),
            }}
          />

          <ProfileForm
            displayName={user.displayName}
            preferredLanguage={user.preferredLanguage}
            languages={languageOptions(lang, user.preferredLanguage)}
            displayNameMaxLength={DISPLAY_NAME_MAX_LENGTH}
            lang={lang}
            labels={{
              nameLabel: t('account.name.label'),
              nameHelp: t('account.name.help'),
              namePlaceholder: t('account.name.placeholder'),
              languageLabel: t('account.language.label'),
              languageHelp: t('account.language.help'),
              languageNone: t('account.language.none'),
              save: t('account.save'),
              saving: t('account.saving'),
            }}
          />
        </GlassSurface>
      </main>

      <SiteFooter lang={lang} />
    </div>
  )
}

/**
 * 401 = token gerçekten ölü (proxy yenilemeyi denemiş, olmamış) → giriş ekranı.
 *
 * Diğer her şey — 5xx, ağ hatası — YUTULMUYOR, hata sınırına gidiyor. "Bir
 * şeyler oldu, seni giriş ekranına atalım" demek gerçek arızayı kullanıcı
 * hatası gibi gösterir ve kullanıcı sonsuza kadar giriş yapmayı dener
 * (CLAUDE.md #1).
 */
async function loadProfile(accessToken: string): Promise<CurrentUser | null> {
  try {
    return await fetchCurrentUser(accessToken)
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null
    throw error
  }
}

/** Giriş sonrası kullanıcı buraya döner; `donus` değeri `safeReturnTo`'dan da geçecek. */
function signInHref(lang: string): string {
  const query = new URLSearchParams({ [RETURN_TO_PARAM]: path(lang, 'account') })
  return `${path(lang, 'signIn')}?${query.toString()}`
}

/**
 * Seçenekler sunucuda üretiliyor: `Intl.DisplayNames` verisi sayfanın diline
 * bağlı ve Node ile tarayıcının ICU sürümleri ayrışırsa hidrasyon uyuşmazlığı
 * çıkar. Tek yerde üretmek bu riski tamamen kaldırıyor.
 *
 * Liste `contentLanguages` (49 dil), `uiLanguages` (2 dil) DEĞİL: bu alan
 * kullanıcıya hangi dilde YAZACAĞIMIZI söylüyor ve API doğrulaması da
 * `ContentAllowed`'a bakıyor. Arayüz dilini URL taşıyor (docs/I18N.md §5.2).
 */
function languageOptions(lang: string, current: string | null): LanguageOption[] {
  const collator = new Intl.Collator(lang)

  const options = contentLanguages
    .map((language) => {
      // "日本語 — Japonca": kendi adı + kullanıcının dilindeki adı. İkisi aynıysa
      // tekrar etmiyoruz.
      const local = localNameOf(language.code, lang) ?? language.englishName
      return {
        code: language.code,
        label: local === language.nativeName ? language.nativeName : `${language.nativeName} — ${local}`,
      }
    })
    .sort((a, b) => collator.compare(a.label, b.label))

  // Kayıtlı tercih listede yoksa (API'nin kayıt defteri bu dosyadan ileri gitmiş
  // olabilir) satır BAŞA eklenir. Aksi halde `<select>` sessizce ilk seçeneğe
  // düşer ve form tam profili gönderdiği için kullanıcının tercihi, adını
  // düzeltirken silinirdi.
  if (current && !options.some((option) => option.code === current)) {
    options.unshift({ code: current, label: current })
  }

  return options
}
