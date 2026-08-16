import { BrandLogo } from '@/components/brand/brand-logo'
import { AuthCard } from '@/components/auth/auth-card'
import { GlassButton } from '@/components/ui/glass-button'
import { getChallenge, secondsUntil } from '@/features/auth/challenge'
import { CodeStep } from '@/features/auth/code-step'
import { EmailStep } from '@/features/auth/email-step'
import { t } from '@/features/auth/messages'
import { RETURN_TO_PARAM, safeReturnTo } from '@/features/auth/return-to'

/**
 * Kayıt ve giriş TEK akış, TEK route.
 *
 * Adım URL'de değil `httpOnly` çerezde: çerez yoksa e-posta adımı, varsa kod adımı.
 * Server Component olmasının nedeni de bu — adım seçimi çerezden okunuyor ve
 * "boş → dolu" titremesi hiç yaşanmıyor.
 *
 * Ayrı bir `/kayit` ekranı yok: tanım gereği enumeration üretirdi
 * ("bu e-posta zaten kayıtlı").
 */

export const metadata = {
  title: 'Giriş · Expyra',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const returnTo = safeReturnTo(params[RETURN_TO_PARAM])
  const challenge = await getChallenge()

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="relative z-10 px-4 pt-4">
        <div className="glass glass-edge glass-nav mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-3 pl-4">
          <BrandLogo className="text-white text-on-media" />
          <GlassButton variant="ghost" size="sm" href="/" className="text-nav-link">
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
