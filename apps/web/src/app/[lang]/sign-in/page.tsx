import type { Metadata } from 'next'
import { AuthCard } from '@/components/auth/auth-card'
import { BrandLogo } from '@/components/brand/brand-logo'
import { HeaderShell } from '@/components/brand/site-header'
import { GlassButton } from '@/components/ui/glass-button'
import { peekDevLoginCode } from '@/features/auth/api'
import { getChallenge, secondsUntil } from '@/features/auth/challenge'
import { CodeStep } from '@/features/auth/code-step'
import { DevCodeHint } from '@/features/auth/dev-code-hint'
import { EmailStep } from '@/features/auth/email-step'
import { RETURN_TO_PARAM, safeReturnTo } from '@/features/auth/return-to'
import { getTranslator } from '@/features/i18n/translator'
import { alternateLinks, path } from '@/lib/routes'

/**
 * Kayıt ve giriş TEK akış, TEK route.
 *
 * Adım URL'de değil `httpOnly` çerezde: çerez yoksa e-posta adımı, varsa kod
 * adımı. Server Component olmasının nedeni de bu — adım seçimi çerezden
 * okunuyor ve "boş → dolu" titremesi hiç yaşanmıyor.
 *
 * E-posta URL'e ASLA yazılmıyor: geçmişe düşer, Referer ile dışarı sızar,
 * sunucu loglarına PII girer ve `?eposta=` ücretsiz bir enumeration hedefi olur.
 *
 * Ayrı bir `/kayit` ekranı yok: tanım gereği enumeration üretirdi
 * ("bu e-posta zaten kayıtlı").
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>
}): Promise<Metadata> {
  const { lang } = await params
  const t = await getTranslator(lang)

  return {
    title: `${t('auth.meta.title')} · Expyra`,
    alternates: { languages: alternateLinks('signIn') },
  }
}

export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const [{ lang }, query] = await Promise.all([params, searchParams])
  const t = await getTranslator(lang)

  const returnTo = safeReturnTo(query[RETURN_TO_PARAM])
  const challenge = await getChallenge()

  return (
    <div className="flex min-h-dvh flex-col">
      <HeaderShell>
          <BrandLogo href={path(lang, 'home')} />
          {/* Orta sütun boş: bu sayfada arama bağlamı yok. Izgara yine üç
              sütunlu ki logo solda, çıkış sağda kalsın. */}
          <span />
          <GlassButton
            variant="ghost"
            size="sm"
            href={path(lang, 'home')}
            className="justify-self-end"
          >
            {t('auth.back')}
          </GlassButton>
      </HeaderShell>

      <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
        {challenge ? (
          <AuthCard
            title={t('auth.title')}
            lede={
              /*
                Adres cümlenin İÇİNE değil SONUNA konuyor: metin iki nokta üst
                üste ile bitiyor ve adres ayrı bir öğe. Yer tutucuyla doldurmak
                `<strong>` sarmalayıcısını çeviriye taşırdı; cümleyi ikiye bölmek
                ise "cümle birleştirme yok" kuralını çiğnerdi. Bu üçüncü yol her
                dilde çalışıyor çünkü çevirmenin gördüğü metin tam bir cümle.
              */
              <>
                {t('auth.code.lede')} <strong className="auth-email">{challenge.email}</strong>
              </>
            }
          >
            <CodeStep
              codeLength={challenge.codeLength}
              resendAvailableAtUtc={challenge.resendAvailableAtUtc}
              initialRemainingSeconds={secondsUntil(challenge.resendAvailableAtUtc)}
              returnTo={returnTo}
              lang={lang}
              labels={{
                label: t('auth.code.label'),
                hint: t('auth.code.hint'),
                submit: t('auth.common.continue'),
                working: t('auth.common.working'),
                resend: t('auth.code.resend'),
                changeEmail: t('auth.code.changeEmail'),
              }}
            />

            {/* Geliştirme kolayligi: kod SUNUCUDA okunuyor. Üretimde
                `peekDevLoginCode` daima null döndürüyor ve şerit hiç çizilmiyor. */}
            <DevCodeHint
              email={challenge.email}
              codeLength={challenge.codeLength}
              initialCode={await peekDevLoginCode(challenge.email, challenge.codeLength)}
            />
          </AuthCard>
        ) : (
          <AuthCard title={t('auth.title')} lede={t('auth.email.lede')}>
            <EmailStep
              returnTo={returnTo}
              lang={lang}
              labels={{
                label: t('auth.email.label'),
                help: t('auth.email.help'),
                placeholder: t('auth.email.placeholder'),
                submit: t('auth.common.continue'),
                working: t('auth.common.working'),
              }}
            />
          </AuthCard>
        )}
      </main>
    </div>
  )
}
