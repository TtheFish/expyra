'use client'

import Image from 'next/image'
import { useId, useRef, useState, useTransition } from 'react'
import { GlassButton } from '@/components/ui/glass-button'
import {
  confirmAvatarAction,
  deleteAvatarAction,
  requestAvatarUploadAction,
} from './actions'

/**
 * Profil fotoğrafı. Yükleme akışı ilan görselleriyle BİREBİR aynı: imzalı adres →
 * tarayıcı depoya PUT ediyor → sunucu onaylıyor ve baytlara bakarak doğruluyor.
 *
 * `ProfileForm`'un İÇİNDE değil, yanında: o form `useActionState` ile tek bir
 * `PATCH` gönderiyor ve gövdesi tam profil. Fotoğrafı oraya katmak, "adı kaydet"
 * düğmesinin fotoğrafı da yüklemesi demekti — kullanıcı iki ayrı işi tek düğmeye
 * bağlamıyor ve fotoğraf zaten seçilir seçilmez yükleniyor.
 */
export function AvatarField({
  lang,
  avatarUrl,
  displayName,
  labels,
}: {
  lang: string
  avatarUrl: string | null
  displayName: string | null
  labels: AvatarFieldLabels
}) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [busy, startTransition] = useTransition()

  const disabled = uploading || busy

  async function upload(file: File) {
    setError(null)
    setUploading(true)

    try {
      const permit = await requestAvatarUploadAction(lang, file.type, file.size)

      if (permit.error !== null) {
        setError(permit.error)
        return
      }

      const response = await fetch(permit.upload.uploadUrl, {
        method: permit.upload.method,
        headers: permit.upload.headers,
        body: file,
        // Yetki imzada; çerez gönderilmiyor (media-uploader.tsx ile aynı gerekçe).
        credentials: 'omit',
      })

      if (!response.ok) {
        setError(response.status === 413 ? labels.errorTooLarge : labels.errorRejected)
        return
      }

      const confirmed = await confirmAvatarAction(lang, permit.upload.storageKey)
      if (confirmed.error !== null) setError(confirmed.error)
    } finally {
      setUploading(false)

      // Aynı dosyayı ikinci kez seçebilmek için: değer temizlenmezse tarayıcı
      // `change` olayını hiç ateşlemiyor.
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <section className="mt-6" aria-labelledby={`${inputId}-baslik`} aria-busy={disabled}>
      <h2 id={`${inputId}-baslik`} className="auth-label">
        {labels.heading}
      </h2>

      <div className="mt-3 flex items-center gap-4">
        {avatarUrl === null ? (
          /*
            Fotoğraf yok: baş harf. `aria-hidden` çünkü adın kendisi zaten
            formda yazılı — ekran okuyucuya "A" harfi duyurmak gürültü olurdu.
          */
          <span
            aria-hidden="true"
            className="glass glass-edge flex size-16 shrink-0 items-center justify-center rounded-full text-lg font-semibold"
          >
            {initialOf(displayName) ?? '·'}
          </span>
        ) : (
          <Image
            src={avatarUrl}
            /* Dekoratif: yanındaki başlık ve ad neyin gösterildiğini söylüyor. */
            alt=""
            width={64}
            height={64}
            className="size-16 shrink-0 rounded-full object-cover"
          />
        )}

        <div className="flex flex-wrap items-center gap-2">
          {/* Etiketten ÖNCE: `peer-*` yalnız DOM'da kendinden sonraki kardeşleri
              etkiliyor, yani odak halkası ancak bu sırayla çalışıyor. */}
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            // Gerçek kapı SUNUCUDA ve baytlara bakıyor; bu yalnız seçiciyi daraltıyor.
            accept="image/jpeg,image/png,image/webp"
            disabled={disabled}
            className="peer sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void upload(file)
            }}
          />

          {/*
            `<label>`, `GlassButton` DEĞİL: dosya seçiciyi açan tek erişilebilir
            yol, girdinin kendi etiketine tıklamak. Bir `<button>` yazıp
            `input.click()` çağırmak da mümkündü ama o zaman ekran okuyucu iki
            kontrol duyururdu — düğme ve gizli dosya girdisi.

            Odak halkası GİRDİDE (`peer-focus-visible`): odağı alan öğe o,
            etiket değil. Halka olmasaydı klavyeyle gezen kullanıcı düğmenin
            üzerinde olduğunu göremezdi.
          */}
          <label
            htmlFor={inputId}
            className={[
              'inline-flex h-9 cursor-pointer items-center justify-center rounded-[var(--radius-glass-sm)]',
              'px-4 text-sm font-medium transition-colors duration-300',
              'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-brand-400',
              disabled ? 'cursor-not-allowed opacity-50' : 'hover:text-fg',
            ].join(' ')}
          >
            {uploading ? labels.uploading : avatarUrl === null ? labels.add : labels.change}
          </label>

          {avatarUrl !== null && (
            <GlassButton
              type="button"
              size="sm"
              variant="ghost"
              disabled={disabled}
              onClick={() => {
                setError(null)
                startTransition(async () => {
                  const result = await deleteAvatarAction(lang)
                  if (result.error !== null) setError(result.error)
                })
              }}
            >
              {labels.remove}
            </GlassButton>
          )}
        </div>
      </div>

      <p className="auth-help">{labels.hint}</p>

      {error !== null && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  )
}

export type AvatarFieldLabels = {
  heading: string
  hint: string
  add: string
  change: string
  remove: string
  uploading: string
  errorRejected: string
  errorTooLarge: string
}

/**
 * Adın ilk harfi. Değişmez kültürle büyütülüyor: gösterilen ad kullanıcının kendi
 * adı ve dili bilinmiyor — "istanbul" yazan bir İngiliz için Türkçe kurallarıyla
 * "İ" üretmek yanlış olurdu.
 */
function initialOf(name: string | null): string | null {
  const trimmed = name?.trim()
  if (!trimmed) return null

  // Codepoint bazlı: BMP dışı bir harfle başlayan ad `[0]` ile yarım surrogate verirdi.
  return [...trimmed][0]?.toUpperCase() ?? null
}
