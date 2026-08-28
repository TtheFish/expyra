import type { SimpleMessageKey } from '@/features/i18n/dictionary'

/**
 * Duvar kağıdı klipleri.
 *
 * **Metin burada DEĞİL, sözlükte.** Önceki hâli `label: 'Sokakta ızgara balık'`
 * yazıyordu ve duvar kağıdı ortak layout'ta yaşadığı için o Türkçe metin `/en`
 * dahil HER sayfada görünüyordu — CLAUDE.md'nin "metin hardcode edilmez" kuralının
 * ihlali. Blok 3'ün "/en'de Türkçe kalıntı sıfır" ölçümü bunu kaçırmıştı çünkü
 * ölçüm sayfaları taramış, ortak iskeleti taramamıştı.
 *
 * "Host içeriği" muafiyeti geçmiyor (docs/I18N.md §1): bu metni biz yazdık ve
 * kaynak dosyada duruyor.
 */
export type WallpaperClip = {
  src: string
  labelKey: SimpleMessageKey
  placeKey: SimpleMessageKey
}

/** Yerel deneyim: sokak lezzeti → ev yemeği → Kapadokya */
export const WALLPAPER_CLIPS: WallpaperClip[] = [
  {
    src: '/brand/clips/01-balik.mp4',
    placeKey: 'wallpaper.istanbul.place',
    labelKey: 'wallpaper.istanbul.label',
  },
  {
    src: '/brand/clips/02-teyze.mp4',
    placeKey: 'wallpaper.kitchen.place',
    labelKey: 'wallpaper.kitchen.label',
  },
  {
    src: '/brand/clips/03-balloon.mp4',
    placeKey: 'wallpaper.cappadocia.place',
    labelKey: 'wallpaper.cappadocia.label',
  },
]

/** Her klip görünür kalma süresi (sn) — geçiş süresi hariç */
export const CLIP_DWELL_SECONDS = 11
