'use client'

import { useRef, useState, type ChangeEvent, type CSSProperties } from 'react'

/**
 * Kod girişi: TEK input, altı ayrı kutu DEĞİL.
 *
 * Altı kutu ekran okuyucuya altı kez "düzenleme, boş" okutur ve değerin bütününü
 * hiç duyurmaz; otomatik ilerleme düzeltme yapan kullanıcının odağını çalar;
 * yapıştırma ("Kodun: 123 456", NBSP) elle bölünmek zorunda kalır;
 * `autocomplete="one-time-code"` bölünmüş alanlarda güvenilmez (Safari bazı
 * sürümlerde yalnız ilk kutuyu doldurur); Gboard `keydown`'ı `keyCode 229`
 * bildirdiği için `Backspace` davranışı klavyeye göre bozulur.
 *
 * Görsel yuvalar kaybolmuyor: altta `aria-hidden` bir grid çiziliyor, rakamlar
 * `letter-spacing` ile kutuların ortasına oturuyor.
 */

type OtpInputProps = {
  id: string
  name: string
  /** Sunucunun bildirdiği hane sayısı — `Auth:Otp:Digits` kaçış valfi 8'e çıkarsa alan da uzar. */
  length: number
  describedBy: string
  invalid: boolean
  disabled: boolean
}

export function OtpInput({ id, name, length, describedBy, invalid, disabled }: OtpInputProps) {
  const [value, setValue] = useState('')

  // Gönderilen son değer. Guard olmadan ikinci bir `change` (ör. IME onayı,
  // otomatik doldurma) aynı kod için ikinci bir POST tetikler.
  const submittedRef = useRef<string | null>(null)

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    // NFKC: JP/KO klavyelerinden gelen tam genişlikli rakamları (１２３) ASCII'ye indirir.
    const next = event.target.value.normalize('NFKC').replace(/\D/g, '').slice(0, length)
    setValue(next)

    if (next.length < length) {
      submittedRef.current = null
      return
    }

    if (disabled || submittedRef.current === next) return

    submittedRef.current = next
    event.target.form?.requestSubmit()
  }

  return (
    <div className="otp-field" style={{ '--otp-length': length } as CSSProperties}>
      <div className="otp-slots" aria-hidden="true">
        {Array.from({ length }, (_, index) => (
          <span key={index} className="otp-slot" />
        ))}
      </div>

      {/*
        type="text" — "number" DEĞİL: ok tuşu ve tekerlek değeri değiştirir,
        maxLength yok sayılır, baştaki sıfır düşer.
      */}
      <input
        id={id}
        name={name}
        className="otp-input"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern={`\\d{${length}}`}
        maxLength={length}
        enterKeyHint="go"
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        // Kod adımında niyet tek anlamlı; e-posta adımında autoFocus YOK.
        autoFocus
        required
        disabled={disabled}
        aria-describedby={describedBy}
        aria-invalid={invalid}
        value={value}
        onChange={handleChange}
      />
    </div>
  )
}
