'use client'

import Image from 'next/image'
import { useEffect, useId, useRef, useState } from 'react'

/**
 * Hesap menüsü — üst çubuktaki "Giriş yap" düğmesinin oturum açıkken aldığı yer.
 *
 * Kalıp `language-picker.tsx` / `guest-picker.tsx` ile AYNI, bilinçli olarak:
 * `aria-expanded` + `aria-controls`, Escape kapatır ve odağı tetikleyiciye geri
 * verir, panel dışına tıklama kapatır, panelin arkası opak. Üçüncü bir açılır
 * panel kalıbı uydurmak, üçüncü bir erişilebilirlik hata yüzeyi demekti.
 *
 * `role="dialog"` — `role="menu"` DEĞİL. Menü rolü ok tuşlarıyla dolaşım, tek
 * tab durağı ve `menuitem` çocukları şart koşar; iki satırlık bir panelde bunun
 * bedeli faydasından büyük ve komşu iki panel de aynı kararı vermiş durumda.
 *
 * Çıkış NATIVE FORM ile POST ediliyor: `/cikis` yalnız POST kabul ediyor
 * (link ön-yükleyicileri kullanıcıyı habersiz düşürmesin diye) ve native form
 * JS kapalıyken de çalışır. Çerezler `sameSite=lax` olduğu için siteler arası
 * bir POST oturum çerezini taşımaz — ayrı bir CSRF jetonu gerekmiyor.
 *
 * **Metin sözlükten değil PROP'tan geliyor.** Sözlük `server-only`; bu bileşen
 * tarayıcıda çalışıyor ve ihtiyacı olan beş dizgeyi sunucudan hazır alıyor
 * (bkz. `site-header.tsx`). Yer tutuculu ikisi — tetikleyici etiketi ve "…
 * olarak giriş yaptın" — sunucuda dolduruluyor: ad ve adres render anında
 * biliniyor, istemcide değişmiyorlar.
 */

export type AccountMenuLabels = {
  /** Doldurulmuş: "Hesap menüsü: Deniz K." */
  trigger: string
  title: string
  /** Doldurulmuş; profil okunamadıysa `null` ve satır hiç çizilmiyor. */
  signedInAs: string | null
  account: string
  signOut: string
}

type AccountMenuProps = {
  /** Tetikleyicide görünen ad: görünen ad, yoksa e-posta. */
  label: string
  /** Avatar dairesindeki tek harf. Sunucuda üretiliyor — büyük harfe çevirme dile bağlı. */
  initial: string
  /** Profil fotoğrafı varsa harfin yerini alır; boyut aynı kalır (h-6). */
  avatarUrl: string | null
  accountHref: string
  signOutPath: string
  labels: AccountMenuLabels
}

export function AccountMenu({
  label,
  initial,
  avatarUrl,
  accountHref,
  signOutPath,
  labels,
}: AccountMenuProps) {
  const [open, setOpen] = useState(false)

  const panelId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const firstItemRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      // Escape sonrası odak tetikleyiciye döner — panelde kaybolmasın.
      triggerRef.current?.focus()
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)

    // Odak panelin ilk satırına: klavye kullanıcısı açtığı menünün içine girer.
    // (Dil seçicide aynı hamle odağı arama kutusuna taşıyor.)
    firstItemRef.current?.focus()

    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  /*
    Satırlara tıklanınca menü ELLE kapatılmıyor. İkisi de tam sayfa gezinme
    (native `<a>` ve native form POST); React tıklamayı discrete olay sayıp
    state'i senkron akıtır, yani `setOpen(false)` düğümü tarayıcı varsayılan
    eylemi çalışmadan DOM'dan söker ve gezinme iptal olabilir. Sayfa değiştiği
    için menü zaten yeniden monte oluyor.
  */
  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={labels.trigger}
        /* Yükseklik komşularıyla aynı (h-9): 3.5rem'lik barda tek kontrolü
           büyütmek hizayı bozar. Dokunma hedefi 36×64 px — WCAG 2.5.8'in
           24×24 eşiğinin üstünde; panelin içindeki satırlar 3rem. */
        className="glass glass-edge glass-interactive inline-flex h-9 max-w-[11rem] items-center gap-2 rounded-[var(--radius-glass-sm)] px-2 text-sm font-medium text-fg"
      >
        {avatarUrl === null ? (
          <span
            aria-hidden="true"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklch,var(--fg)_12%,transparent)] text-xs font-semibold"
          >
            {initial}
          </span>
        ) : (
          <Image
            src={avatarUrl}
            alt=""
            width={24}
            height={24}
            className="h-6 w-6 shrink-0 rounded-full object-cover"
            aria-hidden="true"
          />
        )}
        {/*
          Dar ekranda yalnız avatar kalıyor: 375 px'lik barda logo + dil seçici +
          tema düğmesinden sonra ada yer yok, zorlarsak logo eziliyor. Ad o
          genişlikte de kaybolmuyor — tetikleyicinin `aria-label`'ında ve panelin
          ilk satırında tam hâliyle duruyor.
        */}
        <span className="hidden max-w-[6.5rem] truncate min-[26rem]:block">{label}</span>
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label={labels.title}
          /* Panel opak kart — koyu temada cam+beyaz örtü patlıyordu. */
          className="surface-lifted fixed inset-x-4 top-[4.25rem] z-30 rounded-[var(--radius-glass)] p-2 sm:absolute sm:inset-x-auto sm:end-0 sm:top-full sm:mt-2 sm:w-[17rem]"
        >
          {labels.signedInAs ? (
            <p className="px-3 pb-2 pt-2 text-xs break-words text-fg-muted">{labels.signedInAs}</p>
          ) : null}

          <a
            ref={firstItemRef}
            href={accountHref}
            className="flex min-h-12 w-full items-center rounded-[var(--radius-glass-sm)] px-3 text-sm font-medium transition-colors duration-150 hover:bg-[color-mix(in_oklch,var(--fg)_8%,transparent)] focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] focus-visible:outline-offset-[-2px]"
          >
            {labels.account}
          </a>

          <div className="my-1 h-px bg-[var(--line)]" />

          <form action={signOutPath} method="post">
            <button
              type="submit"
              className="flex min-h-12 w-full items-center rounded-[var(--radius-glass-sm)] px-3 text-left text-sm font-medium transition-colors duration-150 hover:bg-[color-mix(in_oklch,var(--fg)_8%,transparent)] focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] focus-visible:outline-offset-[-2px]"
            >
              {labels.signOut}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  )
}
