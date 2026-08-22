'use client'

import Image from 'next/image'
import { useId, useRef, useState, useTransition } from 'react'
import { GlassButton } from '@/components/ui/glass-button'
import {
  confirmMediaAction,
  deleteMediaAction,
  reorderMediaAction,
  requestMediaUploadAction,
  setMediaCoverAction,
} from './experience-actions'
import type { HostExperienceMedia } from './experiences-api'

/**
 * İlan görselleri: yükleme, sıralama, kapak seçimi, silme.
 *
 * ## Bayt bu bileşenden Next sunucusuna GİTMİYOR
 *
 * Akış üç adımlı: (1) sunucu eylemi imzalı bir adres üretiyor, (2) **tarayıcı**
 * dosyayı doğrudan depoya PUT ediyor, (3) sunucu eylemi onaylıyor ve doğrulamayı
 * o yapıyor. İkinci adım hiçbir sunucudan geçmiyor — dosya bir `FormData` ile
 * sunucu eylemine verilseydi PLAN Blok 6 kabul kriteri 1 ("API bayt taşımaz")
 * BFF katmanında delinirdi: dosya yine bir sunucudan geçmiş olurdu.
 *
 * Bu yüzden bu bileşen bir `<form action={...}>` DEĞİL. Form eylemi ortadaki
 * tarayıcı adımını ifade edemiyor.
 *
 * ## Metinler prop olarak geliyor
 *
 * Sözlük `server-only`; sayfa metinleri çözüp buraya veriyor (`experience-forms.tsx`
 * ile aynı karar). Tarayıcıya inen tek şey bu ilanın ihtiyacı olan bir avuç dizge.
 *
 * ## Sürükle-bırak yalnız EKLEMEDE
 *
 * Dosya bırakma alanı var ama sıralama sürüklemeyle DEĞİL, düğmelerle yapılıyor.
 * Sürükleyerek sıralama klavyeyle çalışmıyor ve ekran okuyucuya durumu
 * anlatmıyor; erişilebilir bir sürükleme (WAI-ARIA sürükle-bırak kalıbı) bu
 * bloğun işi değil. Düğmeler her girdi yöntemiyle çalışıyor ve sıra sunucuya
 * TOPTAN yazıldığı için ara durum hiç doğmuyor.
 */
export function MediaUploader({
  experienceId,
  language,
  media,
  labels,
}: {
  experienceId: string
  language: string
  media: HostExperienceMedia[]
  labels: MediaUploaderLabels
}) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, startTransition] = useTransition()

  // Yüklenen dosya sayısı: "1/3 yükleniyor" demek için değil, düğmeyi kilitlemek
  // ve ekran okuyucuya bir şeyin sürdüğünü söylemek için.
  const [uploading, setUploading] = useState(0)

  const atLimit = media.length >= MAX_MEDIA
  const disabled = busy || uploading > 0 || atLimit

  async function upload(files: FileList | File[]) {
    setError(null)

    // Sıralı yükleniyor, paralel değil: on iki dosya aynı anda PUT edilseydi
    // yavaş bağlantıda hepsi birden tıkanır ve hangisinin bittiği belirsizleşirdi.
    // Ayrıca sunucudaki tavan sayacı da sıralı akışta doğru davranıyor.
    for (const file of Array.from(files)) {
      setUploading((count) => count + 1)

      // İzin ALINDIKTAN sonra her başarısızlıkta satır geri veriliyor: sunucu
      // taze Pending satırları kotaya sayıyor, dolayısıyla bırakılan her yarım
      // yükleme imzanın ömrü boyunca (15 dk) bir hak tutuyor. Silmek onu anında
      // iade ediyor; silinemezse zaten kendi kendine düşüyor.
      let mediaId: string | null = null

      try {
        const permit = await requestMediaUploadAction(
          language,
          experienceId,
          file.type,
          file.size,
        )

        if (permit.error !== null) {
          setError(permit.error)
          break
        }

        mediaId = permit.upload.mediaId

        const response = await fetch(permit.upload.uploadUrl, {
          method: permit.upload.method,
          // İmza bu başlıkların üzerine kurulu; eksik gönderilirse depo reddediyor.
          headers: permit.upload.headers,
          body: file,
          // Kimlik doğrulaması YOK ve olmamalı: yetki imzada. Çerez gönderilseydi
          // depo adresi bir gün başka bir alan adına taşındığında oturum çerezi de
          // oraya sızardı.
          credentials: 'omit',
        })

        if (!response.ok) {
          setError(response.status === 413 ? labels.errorTooLarge : labels.errorRejected)
          break
        }

        const confirmed = await confirmMediaAction(language, experienceId, permit.upload.mediaId)

        if (confirmed.error !== null) {
          setError(confirmed.error)
          break
        }

        // Buraya gelindiyse satır Active; iade edilecek bir şey yok.
        mediaId = null
      } catch {
        // `catch` ŞART: `fetch` ağ hatasında FIRLATIYOR ve yalnız `finally`
        // varken bu yakalanmamış bir reddedilme oluyordu — ekranda hiçbir şey
        // değişmiyor, host yüklemenin neden olmadığını göremiyordu.
        setError(labels.errorRejected)
        break
      } finally {
        setUploading((count) => count - 1)

        if (mediaId !== null) {
          // Sonucu beklenmiyor ve hatası yutuluyor: bu bir TEMİZLİK, kullanıcının
          // gördüğü hata mesajını ikinci bir hatayla değiştirmenin anlamı yok.
          void deleteMediaAction(language, experienceId, mediaId)
        }
      }
    }

    // Aynı dosyayı ikinci kez seçebilmek için: değer temizlenmezse tarayıcı
    // "değişmedi" deyip `change` olayını hiç ateşlemiyor.
    if (inputRef.current) inputRef.current.value = ''
  }

  function run(action: () => Promise<{ error: string | null }>) {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (result.error !== null) setError(result.error)
    })
  }

  function move(index: number, delta: number) {
    const next = [...media]
    const target = index + delta

    if (target < 0 || target >= next.length) return

    // Yer değiştirme İSTEMCİDE hesaplanıp sunucuya TAM LİSTE olarak gidiyor:
    // "şunu bir yukarı al" gönderilseydi sunucu, istemcinin gördüğü sıranın
    // hâlâ geçerli olduğunu varsaymak zorunda kalırdı.
    ;[next[index], next[target]] = [next[target], next[index]]

    run(() => reorderMediaAction(language, experienceId, next.map((item) => item.id)))
  }

  return (
    <div aria-busy={busy || uploading > 0}>
      <p className="text-xs text-fg-muted">{labels.hint}</p>

      {/*
        Bırakma alanı bir `<label>`: klavye ve ekran okuyucu için dosya seçici
        zaten burada ve `<div onClick>` ile taklit edilmiş bir düğmeye gerek yok.
        Sürükleme sadece fare kullanıcısına ek bir yol.
      */}
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          if (!disabled && event.dataTransfer.files.length > 0) void upload(event.dataTransfer.files)
        }}
        className={[
          'mt-3 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-[var(--radius-glass)]',
          'border border-dashed p-6 text-center text-sm transition-colors',
          dragging
            ? 'border-brand-400 bg-[rgb(var(--glass-tint)_/_0.12)]'
            : 'border-[rgb(var(--glass-tint)_/_0.35)]',
          disabled ? 'cursor-not-allowed opacity-60' : 'hover:border-brand-400',
        ].join(' ')}
      >
        <span className="font-medium">{uploading > 0 ? labels.uploading : labels.add}</span>
        <span className="text-xs text-fg-muted">{labels.drop}</span>
      </label>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        multiple
        // Tarayıcının seçiciyi daraltması için. Gerçek kapı SUNUCUDA ve baytlara
        // bakıyor: `accept` yalnız bir kolaylık, doğrulama değil.
        accept="image/jpeg,image/png,image/webp"
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          if (event.target.files && event.target.files.length > 0) void upload(event.target.files)
        }}
      />

      {error !== null && (
        // `role="alert"`: metin SONRADAN belirdiği için ekran okuyucu onu duyuruyor.
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}

      {media.length === 0 ? (
        <p className="mt-4 text-sm text-fg-muted">{labels.empty}</p>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {media.map((item, index) => (
            <li
              key={item.id}
              className="glass glass-edge overflow-hidden rounded-[var(--radius-glass-sm)]"
            >
              <div className="relative aspect-[4/3]">
                <Image
                  src={item.url}
                  /* Sıra bilgisi taşıyor: "3. görsel". Boş bırakılsaydı ekran
                     okuyucu kullanıcısı hangi görselin düğmelerini kullandığını
                     bilemezdi — burada görsel dekoratif DEĞİL, bir kontrolün konusu. */
                  alt={labels.positions[index] ?? ''}
                  fill
                  sizes="(min-width: 640px) 200px, 45vw"
                  className="object-cover"
                />

                {item.isCover && (
                  <span className="glass glass-edge absolute left-2 top-2 rounded-[var(--radius-glass-sm)] px-2 py-0.5 text-[0.6875rem] font-medium">
                    {labels.cover}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1 p-2">
                <IconButton
                  label={labels.moveEarlier}
                  disabled={busy || index === 0}
                  onClick={() => move(index, -1)}
                >
                  ←
                </IconButton>

                <IconButton
                  label={labels.moveLater}
                  disabled={busy || index === media.length - 1}
                  onClick={() => move(index, 1)}
                >
                  →
                </IconButton>

                {!item.isCover && (
                  <GlassButton
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => run(() => setMediaCoverAction(language, experienceId, item.id))}
                  >
                    {labels.makeCover}
                  </GlassButton>
                )}

                <GlassButton
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => run(() => deleteMediaAction(language, experienceId, item.id))}
                  className="ml-auto"
                >
                  {labels.delete}
                </GlassButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * Ok düğmesi. Görünen içerik bir OK KARAKTERİ, dolayısıyla erişilebilir adı
 * ayrıca veriliyor: ekran okuyucu "→" duyduğunda ne yapacağını bilmez.
 */
function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  children: string
}) {
  return (
    <GlassButton
      type="button"
      size="sm"
      variant="ghost"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      <span aria-hidden="true">{children}</span>
    </GlassButton>
  )
}

export type MediaUploaderLabels = {
  hint: string
  add: string
  drop: string
  uploading: string
  empty: string
  cover: string
  makeCover: string
  delete: string
  moveEarlier: string
  moveLater: string
  /**
   * Görsel başına sıra etiketi ("3. görsel"), SUNUCUDA çözülmüş.
   *
   * Neden dizi ve neden şablon değil: çeviri sunucuda `{n}` yer tutucusunu
   * hemen dolduruyor, yani istemciye şablon inemiyor. Alternatif, biçimlendirme
   * fonksiyonunu prop olarak geçirmekti — düz fonksiyonlar istemci bileşenine
   * serileştirilemiyor.
   */
  positions: string[]
  errorRejected: string
  errorTooLarge: string
}

/**
 * Sunucunun reddettiği yükleme sayısı burada DEĞİL sunucuda sayılıyor; bu sabit
 * yalnız düğmeyi erken kapatmak için. Gerçek kapı `MediaRules.MaxPerExperience`.
 */
const MAX_MEDIA = 12
