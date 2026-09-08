'use client'

import { useState } from 'react'
import { ApplePayMark, GooglePayMark } from '@/components/brand/wallet-marks'
import { GlassButton } from '@/components/ui/glass-button'

export type WalletActionLabels = {
  view: string
  apple: string
  google: string
  pdf: string
  appleMissing: string
  googleMissing: string
  signedOut: string
  adding: string
}

/**
 * Bilet cüzdan aksiyonları.
 *
 * Apple: `.pkpass` indir (iOS’ta Cüzdan açılır). Google: save URL’ye git.
 * Kimlikler yoksa 503 → kullanıcıya net mesaj; görüntüleme her zaman ayrı.
 */
export function TicketWalletActions({
  viewHref,
  appleHref,
  googleHref,
  pdfHref,
  labels,
  showView = true,
}: {
  viewHref: string
  appleHref: string
  googleHref: string
  pdfHref: string
  labels: WalletActionLabels
  showView?: boolean
}) {
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState<'apple' | 'google' | null>(null)

  async function addApple() {
    setMessage(null)
    setBusy('apple')
    try {
      const response = await fetch(appleHref, { credentials: 'same-origin' })
      if (response.status === 401) {
        setMessage(labels.signedOut)
        return
      }
      if (response.status === 503 || !response.ok) {
        setMessage(labels.appleMissing)
        return
      }

      const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent)
      if (isIos) {
        window.location.href = appleHref
        return
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'expyra-bilet.pkpass'
      anchor.click()
      URL.revokeObjectURL(url)
    } catch {
      setMessage(labels.appleMissing)
    } finally {
      setBusy(null)
    }
  }

  async function addGoogle() {
    setMessage(null)
    setBusy('google')
    try {
      const response = await fetch(googleHref, {
        credentials: 'same-origin',
        redirect: 'manual',
      })
      if (response.status === 401) {
        setMessage(labels.signedOut)
        return
      }
      if (response.status === 503) {
        setMessage(labels.googleMissing)
        return
      }
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('Location')
        if (location) {
          window.location.href = location
          return
        }
      }
      if (response.type === 'opaqueredirect' || response.status === 0) {
        window.location.href = googleHref
        return
      }
      // CORS/opaque yok — doğrudan gezin (Google 302’yi tarayıcı izler).
      window.location.href = googleHref
    } catch {
      window.location.href = googleHref
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {showView ? (
          <GlassButton variant="primary" size="sm" href={viewHref}>
            {labels.view}
          </GlassButton>
        ) : null}
        <GlassButton size="sm" href={pdfHref} variant={showView ? 'secondary' : 'primary'}>
          {labels.pdf}
        </GlassButton>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void addApple()}
          disabled={busy !== null}
          className="glass glass-edge glass-interactive inline-flex h-9 items-center gap-2 rounded-[var(--radius-glass-sm)] px-4 text-sm font-medium disabled:pointer-events-none disabled:opacity-50"
        >
          <ApplePayMark className="size-4" />
          {busy === 'apple' ? labels.adding : labels.apple}
        </button>
        <button
          type="button"
          onClick={() => void addGoogle()}
          disabled={busy !== null}
          className="glass glass-edge glass-interactive inline-flex h-9 items-center gap-2 rounded-[var(--radius-glass-sm)] px-4 text-sm font-medium disabled:pointer-events-none disabled:opacity-50"
        >
          <GooglePayMark className="size-4" />
          {busy === 'google' ? labels.adding : labels.google}
        </button>
      </div>

      {message ? (
        <p className="text-sm text-fg-muted" role="status">
          {message}
        </p>
      ) : null}
    </div>
  )
}
