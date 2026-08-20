'use client'

import { useRef, type PointerEvent } from 'react'
import type { Ticket } from '@/lib/ticket'
import { formatLocalDateTime, formatMoney } from '@/lib/ticket'

/**
 * QR bilet.
 *
 * Tasarım kararı: cam malzeme bileti SARAR, QR'ın üstüne BİNMEZ.
 * Kamera düşük kontrastlı kodu okuyamaz — kapıda okunmayan bilet, ne kadar
 * güzel olursa olsun başarısızdır. Bu yüzden QR alanı opak beyaz.
 *
 * **"Demo" ibaresi neden biletin ÜSTÜNDE:** QR bugün imzasız düz bir URL taşıyor
 * (`lib/ticket.ts` `ticketPayload`) ve işaret ettiği `/dogrula/[code]` sayfası
 * hiç yok — okutulduğunda 404 veriyor. Yani bu bilet kapıda çalışmaz. Bunu
 * yalnız kod yorumunda söylemek yetmez: ekranı gören kişi biletinin geçerli
 * olduğunu sanar ve bunu kapıda öğrenir. İbare Blok 12'de (imzalı token +
 * doğrulama sayfası + check-in) kalkacak.
 */

type Props = {
  ticket: Ticket
  /** Sunucuda üretilmiş QR (SVG string). */
  qrMarkup: string
}

export function GlassTicket({ ticket, qrMarkup }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const isUsed = ticket.status === 'used'

  const handleMove = (event: PointerEvent<HTMLDivElement>) => {
    const node = ref.current
    if (!node) return

    const rect = node.getBoundingClientRect()
    const px = (event.clientX - rect.left) / rect.width
    const py = (event.clientY - rect.top) / rect.height

    // Merkezden uzaklığa göre eğim. 6 derece yeterli — fazlası oyuncak gibi durur.
    node.style.setProperty('--tilt-y', `${(px - 0.5) * 12}deg`)
    node.style.setProperty('--tilt-x', `${(0.5 - py) * 8}deg`)
    node.style.setProperty('--pointer-x', `${px * 100}%`)
    node.style.setProperty('--pointer-y', `${py * 100}%`)
  }

  const handleLeave = () => {
    const node = ref.current
    if (!node) return
    node.style.setProperty('--tilt-x', '0deg')
    node.style.setProperty('--tilt-y', '0deg')
  }

  return (
    <div className="ticket-scene">
      <div
        ref={ref}
        onPointerMove={handleMove}
        onPointerLeave={handleLeave}
        className={`ticket glass glass-edge relative overflow-hidden rounded-[var(--radius-glass-xl)] ${
          isUsed ? 'ticket-used' : ''
        }`}
      >
        <div className="ticket-holo" aria-hidden="true" />

        {/*
          Renkli banttan bağımsız duruyor (bant `aria-hidden`), çünkü bu bir
          süs değil bilgi: ekran okuyucu da duymalı.
        */}
        <p className="absolute right-4 top-4 z-[3] rounded-full border border-white/25 bg-[rgb(12_14_20_/_0.62)] px-2.5 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-white">
          Demo bilet
        </p>

        {/* --- Üst: deneyim kimliği ------------------------------------- */}
        <div
          className="relative h-20 w-full"
          style={{
            background: `linear-gradient(135deg,
              oklch(0.55 0.06 ${ticket.hue} / 0.55),
              oklch(0.40 0.05 ${ticket.hue + 30} / 0.65))`,
          }}
          aria-hidden="true"
        />

        <div className="relative z-[2] px-6 pb-5 pt-4">
          <p className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-fg-muted">
            {ticket.location}
          </p>
          <h3 className="mt-1 text-lg font-semibold leading-snug">
            {ticket.experienceTitle}
          </h3>
          <p className="mt-1 text-sm text-fg-muted">{ticket.hostName}</p>

          <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-[0.6875rem] text-fg-muted">Kişi</dt>
              <dd className="font-semibold">{ticket.guests}</dd>
            </div>
            <div>
              <dt className="text-[0.6875rem] text-fg-muted">Tutar</dt>
              <dd className="font-semibold">
                {formatMoney(ticket.totalAmount, ticket.currency)}
              </dd>
            </div>
            <div>
              <dt className="text-[0.6875rem] text-fg-muted">Durum</dt>
              <dd className={`font-semibold ${isUsed ? 'text-fg-muted' : 'text-brand-500'}`}>
                {isUsed ? 'Kullanıldı' : 'Geçerli'}
              </dd>
            </div>
          </dl>

          <p className="mt-4 text-sm font-medium">{formatLocalDateTime(ticket)}</p>
          {/* IANA kimliği (`Europe/Prague`) sistemler arası eşleşme için var,
              okunmak için değil. Biletin en kritik alanı saat — yanlış anlaşılması
              kaçırılmış deneyim demek. */}
          <p className="text-[0.6875rem] text-fg-muted">
            {ticket.location.split(',')[0]} saatiyle
          </p>
        </div>

        {/* --- Perforasyon: koçan ayrımı --------------------------------- */}
        <div className="ticket-perforation" aria-hidden="true">
          <span className="ticket-notch ticket-notch-left" />
          <span className="ticket-notch ticket-notch-right" />
          <span className="ticket-dashes" />
        </div>

        {/* --- Alt koçan: QR -------------------------------------------- */}
        <div className="relative z-[2] px-6 pb-6 pt-8">
          <div className="ticket-qr relative mx-auto w-fit p-4">
            <div
              className="w-40"
              // Ekran okuyucudan gizli: bilet kodu hemen altında metin olarak
              // zaten var, QR'ın metin karşılığına ihtiyacı yok. Adsız 160×160
              // grafik olarak ağaçta durması yalnızca gürültü (WCAG 1.1.1).
              aria-hidden="true"
              // QR sunucuda üretildi; string sabit ve kullanıcı girdisi içermiyor.
              dangerouslySetInnerHTML={{ __html: qrMarkup }}
            />
            {!isUsed && <span className="ticket-scanline" aria-hidden="true" />}
          </div>

          <p className="mt-3 text-center font-mono text-sm tracking-[0.18em]">
            {ticket.code}
          </p>

          {/*
            Eski metin "girişte host bu kodu okutacak · tek kullanımlık" diyordu;
            ikisi de bugün doğru değil (okutacak bir ekran ve tek kullanımı
            garantileyen bir kayıt yok). Yerine ne olduğu ve ne zaman gerçek
            olacağı yazıyor.
          */}
          <p className="mx-auto mt-2 max-w-[15rem] text-center text-[0.6875rem] leading-relaxed text-fg-muted">
            Örnek bilet: QR henüz imzalanmıyor ve girişte doğrulanamıyor.
          </p>

          {isUsed && (
            <span className="ticket-stamp text-sm">Kullanıldı</span>
          )}
        </div>
      </div>
    </div>
  )
}
