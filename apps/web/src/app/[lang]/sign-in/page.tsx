import type { Metadata } from 'next'
import { AuthCard } from '@/components/auth/auth-card'
import { BrandLogo } from '@/components/brand/brand-logo'
import { GlassButton } from '@/components/ui/glass-button'
import { getChallenge, secondsUntil } from '@/features/auth/challenge'
import { CodeStep } from '@/features/auth/code-step'
import { EmailStep } from '@/features/auth/email-step'
import { t } from '@/features/auth/messages'
import { RETURN_TO_PARAM, safeReturnTo } from '@/features/auth/return-to'
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

export function generateMetadata(): Metadata {
  return {
    title: 'Giriş · Expyra',
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

  const returnTo = safeReturnTo(query[RETURN_TO_PARAM])
  const challenge = await getChallenge()

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="relative z-30 px-4 pt-4">
        <div className="glass glass-edge glass-nav mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-3 pl-4">
          <BrandLogo className="text-white text-on-media" href={path(lang, 'home')} />
          <GlassButton variant="ghost" size="sm" href={path(lang, 'home')} className="text-nav-link">
            Geri
          </GlassButton>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
        {challenge ? (
          <AuthCard
            title={t('auth.title')}
            lede={
              <>
                {t('auth.code.lede')}{' '}
                <strong className="auth-email">{challenge.email}</strong>
              </>
            }
          >
            <CodeStep
              codeLength={challenge.codeLength}
              resendAvailableAtUtc={challenge.resendAvailableAtUtc}
              initialRemainingSeconds={secondsUntil(challenge.resendAvailableAtUtc)}
              returnTo={returnTo}
            />
          </AuthCard>
        ) : (
          <AuthCard title={t('auth.title')} lede={t('auth.email.lede')}>
            <EmailStep returnTo={returnTo} />
          </AuthCard>
        )}
      </main>
    </div>
  )
}
