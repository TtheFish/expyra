'use client'

import { useState } from 'react'
import { ApplePayMark, GooglePayMark } from '@/components/brand/wallet-marks'
import { GlassButton } from '@/components/ui/glass-button'

export type PaymentMethodId = 'card' | 'bank' | 'google' | 'apple'

export type CheckoutPaymentLabels = {
  heading: string
  card: string
  bank: string
  google: string
  apple: string
  bankSelect: string
  terms: string
  submit: string
  submitting: string
  demoNote: string
  /** Ödeme sağlayıcısı yokken düğmenin altındaki dürüst açıklama. */
  unavailable: string
  successTitle: string
  successBody: string
  backHome: string
}

/**
 * Ödeme yöntemleri + onay. Ödeme sağlayıcısı (#19, Blok 11) gelene kadar kart
 * çekilmiyor:
 * - `demoPayment` kapalı (varsayılan, prod): onay düğmesi devre dışı ve
 *   altında ödemenin henüz alınamadığı yazıyor. Sahte başarı ekranı YOK.
 * - `demoPayment` açık (`EXPYRA_DEMO_CONTENT=1`, yerel demo): onay yalnız
 *   "akış tamam" ekranını gösteriyor; metin bunun demo olduğunu söylüyor.
 */
export function CheckoutPaymentForm({
  labels,
  homeHref,
  demoPayment,
}: {
  labels: CheckoutPaymentLabels
  homeHref: string
  demoPayment: boolean
}) {
  const [method, setMethod] = useState<PaymentMethodId>('card')
  const [done, setDone] = useState(false)
  const [pending, setPending] = useState(false)

  if (done) {
    return (
      <div className="surface rounded-[var(--radius-glass-lg)] p-6" role="status">
        <p className="text-xl font-extrabold tracking-tight">{labels.successTitle}</p>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-fg-muted">{labels.successBody}</p>
        <GlassButton href={homeHref} variant="primary" size="md" className="mt-6">
          {labels.backHome}
        </GlassButton>
      </div>
    )
  }

  const methods: { id: PaymentMethodId; label: string; hint?: string }[] = [
    { id: 'bank', label: labels.bank, hint: labels.bankSelect },
    { id: 'card', label: labels.card },
    { id: 'google', label: labels.google },
    { id: 'apple', label: labels.apple },
  ]

  return (
    <form
      className="grid gap-6"
      onSubmit={(event) => {
        event.preventDefault()
        // Düğme zaten kapalı; Enter ile gönderim de aynı kapıdan dönmeli.
        if (!demoPayment) return
        setPending(true)
        // Sahte gecikme: gerçek ödeme sağlayıcısı gibi hissetsin.
        window.setTimeout(() => {
          setPending(false)
          setDone(true)
        }, 700)
      }}
    >
      <fieldset className="grid gap-3">
        <legend className="text-lg font-extrabold tracking-tight">{labels.heading}</legend>

        {methods.map((item) => {
          const selected = method === item.id
          return (
            <label
              key={item.id}
              className={[
                'flex cursor-pointer items-center gap-4 rounded-[var(--radius-glass)] border px-4 py-4 transition-colors',
                selected
                  ? 'border-brand-500 bg-[color-mix(in_oklch,var(--color-brand-500)_8%,transparent)]'
                  : 'border-[var(--line-strong)] bg-[var(--surface)] hover:border-brand-500/40',
              ].join(' ')}
            >
              <input
                type="radio"
                name="yontem"
                value={item.id}
                checked={selected}
                onChange={() => setMethod(item.id)}
                className="size-4 accent-[var(--color-brand-500)]"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">{item.label}</span>
                {item.hint && selected ? (
                  <span className="mt-1 inline-flex rounded-full border border-[var(--line)] px-3 py-1 text-xs font-semibold text-fg-muted">
                    {item.hint}
                  </span>
                ) : null}
              </span>
              <MethodGlyph id={item.id} />
            </label>
          )
        })}
      </fieldset>

      <p className="text-sm leading-relaxed text-fg-muted">{labels.terms}</p>
      <p id="odeme-durumu" className="text-sm text-fg-muted">
        {demoPayment ? labels.demoNote : labels.unavailable}
      </p>

      <GlassButton
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        disabled={!demoPayment || pending}
        aria-describedby="odeme-durumu"
      >
        {pending ? labels.submitting : labels.submit}
      </GlassButton>
    </form>
  )
}

function MethodGlyph({ id }: { id: PaymentMethodId }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-10 shrink-0 items-center justify-center rounded-[0.75rem] bg-[color-mix(in_oklch,var(--fg)_6%,transparent)] text-base"
    >
      {id === 'bank' ? (
        <span>🏦</span>
      ) : id === 'card' ? (
        <span>💳</span>
      ) : id === 'google' ? (
        <GooglePayMark />
      ) : (
        <ApplePayMark />
      )}
    </span>
  )
}

