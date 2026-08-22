'use client'

import { useState, useTransition } from 'react'
import { peekDevLoginCodeAction } from './actions'

/**
 * GELİŞTİRME ŞERİDİ — giriş kodunu ekranda gösterir.
 *
 * Şifresiz sistemde her giriş bir OTP istiyor. Geliştirmede o kodu okumanın tek yolu
 * API'nin `.mail-drop` klasöründeki en yeni `.eml` dosyasını elle açmaktı; günde
 * onlarca kez yapılan bir iş.
 *
 * ## Üretimde bu bileşen HİÇ ÇİZİLMİYOR
 *
 * Sayfa `initialCode` olarak `null` geçiyor ve bileşen hiçbir şey döndürmüyor.
 * Değerin kaynağı olan `/api/dev/emails` ucu da API tarafında yalnız
 * `IsDevelopment()` altında kuruluyor — yani üretimde gösterilecek bir kod olsa bile
 * getirilemiyor. İki bağımsız kapı, çünkü tek kapı unutulabilir.
 *
 * ## "Yenile" düğmesi neden var
 *
 * İlk kod SUNUCUDA okunuyor ve doğru. Ama "yeniden gönder" akışı sayfayı yeniden
 * çizmiyor (form eylemi durum döndürüyor, yönlendirme yapmıyor), dolayısıyla yeni
 * kod geldiğinde ekrandaki eskimiş oluyor. Otomatik yoklama YAPILMIYOR: saniyede bir
 * istek atan bir dev aracı, gerçek bir hata ayıklarken log'u kirletir.
 */
export function DevCodeHint({
  email,
  codeLength,
  initialCode,
}: {
  email: string
  codeLength: number
  initialCode: string | null
}) {
  const [code, setCode] = useState(initialCode)
  const [pending, startTransition] = useTransition()

  // Üretimde `initialCode` daima null ve şerit hiç doğmuyor. Yenileme sonrası kod
  // bulunamazsa da (kutu boşaldı) şerit kayboluyor — boş bir kutu göstermek yerine.
  if (code === null) return null

  return (
    <div className="mt-4 rounded-[var(--radius-glass-sm)] border border-dashed border-[rgb(var(--glass-tint)_/_0.35)] px-3 py-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {/* Etiket ÇEVRİLMİYOR: bu bir geliştirici aracı, kullanıcı yüzeyi değil.
            Sözlüğe anahtar eklemek, üretimde hiç görünmeyecek bir metni iki dilde
            bakımda tutmak olurdu (docs/I18N.md §1 — arayüz metni ≠ araç metni). */}
        <span className="font-medium uppercase tracking-wide text-fg-muted">dev</span>

        <code className="select-all font-mono text-base font-semibold tracking-[0.2em]">
          {code}
        </code>

        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setCode(await peekDevLoginCodeAction(email, codeLength))
            })}
          className="ml-auto underline underline-offset-4 disabled:opacity-50"
        >
          {pending ? '…' : 'yenile'}
        </button>
      </div>

      <p className="mt-1 text-[0.6875rem] text-fg-muted">
        Bu şerit yalnız geliştirmede görünür; gerçek e-posta gönderilmiyor.
      </p>
    </div>
  )
}
