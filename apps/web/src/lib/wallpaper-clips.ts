export type WallpaperClip = {
  src: string
  label: string
  place: string
}

/** Yerel deneyim: sokak lezzeti → ev yemeği → Kapadokya */
export const WALLPAPER_CLIPS: WallpaperClip[] = [
  {
    src: '/brand/clips/01-balik.mp4',
    place: 'İstanbul',
    label: 'Sokakta ızgara balık',
  },
  {
    src: '/brand/clips/02-teyze.mp4',
    place: 'Ev mutfağı',
    label: 'Teyze ile yemek',
  },
  {
    src: '/brand/clips/03-balloon.mp4',
    place: 'Kapadokya',
    label: 'Sıcak hava balonu',
  },
]

/** Her klip görünür kalma süresi (sn) — geçiş süresi hariç */
export const CLIP_DWELL_SECONDS = 11
