'use client'

import { useEffect, useRef, useState } from 'react'
import { CLIP_DWELL_SECONDS, WALLPAPER_CLIPS } from '@/lib/wallpaper-clips'

const MOTION_KEY = 'expyra:wallpaper-motion'

function waitCanPlay(video: HTMLVideoElement, timeoutMs = 12000): Promise<void> {
  if (video.readyState >= 4) return Promise.resolve()

  return new Promise((resolve) => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      video.removeEventListener('canplaythrough', finish)
      video.removeEventListener('loadeddata', finish)
      window.clearTimeout(timer)
      resolve()
    }
    const timer = window.setTimeout(finish, timeoutMs)
    video.addEventListener('canplaythrough', finish)
    video.addEventListener('loadeddata', finish)
    if (video.readyState >= 3) finish()
  })
}

/**
 * Site geneli video duvar kağıdı (layout'ta yaşar → sekme değişince kaybolmaz).
 *
 * ## Durdurulabilir olmak ZORUNDA
 *
 * Video kendiliğinden başlıyor, beş saniyeden uzun sürüyor ve içerikle birlikte
 * çiziliyor — WCAG 2.2.2 (Pause, Stop, Hide) bunun için bir kontrol istiyor ve bu
 * **Level A**, yani en düşük uyum seviyesinin bile şartı. Önceki hâlde ne kontrol
 * vardı ne de `prefers-reduced-motion` videoyu durduruyordu; o ayar yalnız
 * parallax'ı kesiyordu.
 *
 * Kontrol `aria-hidden` kapsayıcının DIŞINDA: içeride kalsaydı ekran okuyucu ve
 * klavye onu hiç görmezdi, yani "kontrol var" demek kâğıt üzerinde kalırdı.
 * Altyazı içeride kalıyor — dekoratif ve her sayfada duyurulması gürültü olurdu.
 *
 * ## Hareket tercihi videoyu da kesiyor
 *
 * `prefers-reduced-motion: reduce` artık oynatmayı hiç başlatmıyor; ekranda poster
 * karesi kalıyor. Kullanıcı isterse düğmeyle başlatabiliyor — tercih bir yasak
 * değil, varsayılan.
 *
 * ## Metinler prop olarak geliyor
 *
 * Altyazılar sabit Türkçeydi ve duvar kağıdı ortak layout'ta yaşadığı için `/en`
 * dahil her sayfada görünüyordu (CLAUDE.md: "metin hardcode edilmez").
 */
export function HeroWallpaper({ labels }: { labels: WallpaperLabels }) {
  const aRef = useRef<HTMLVideoElement>(null)
  const bRef = useRef<HTMLVideoElement>(null)
  const indexRef = useRef(0)
  const activeRef = useRef<0 | 1>(0)
  const timerRef = useRef<number | null>(null)
  const warmPromiseRef = useRef<Promise<void> | null>(null)
  const busyRef = useRef(false)

  const [active, setActive] = useState<0 | 1>(0)
  const [index, setIndex] = useState(0)
  const [labelVisible, setLabelVisible] = useState(true)
  const [reduceParallax, setReduceParallax] = useState(false)

  /**
   * Oynatma tercihi. `null` = henüz okunmadı (ilk render; sunucu `matchMedia`'yı
   * bilemez). Üç durumlu olmasının sebebi hidrasyon: ilk render'da "oynuyor"
   * varsaymak, hareket tercihi olan kullanıcıya bir kare de olsa video göstermek
   * olurdu.
   */
  const [playing, setPlaying] = useState<boolean | null>(null)

  const caption = labels.captions[index]
  const layerEl = (layer: 0 | 1) => (layer === 0 ? aRef.current : bRef.current)

  useEffect(() => {
    // ?motion=1 bir kez görülürse oturum boyunca video açık kalsın
    try {
      if (new URLSearchParams(window.location.search).get('motion') === '1') {
        sessionStorage.setItem(MOTION_KEY, '1')
      }
    } catch {
      /* ignore */
    }

    const media = window.matchMedia('(prefers-reduced-motion: reduce)')

    const sync = () => {
      setReduceParallax(media.matches)

      // Tercih DEĞİŞTİĞİNDE oynatma da değişiyor. Yalnız ilk okumada bakılsaydı,
      // ayarı sonradan açan kullanıcı sayfayı yenilemeden kurtulamazdı.
      setPlaying(!media.matches)
    }

    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    const clearTimer = () => {
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }

    const assignSrc = (video: HTMLVideoElement, src: string) => {
      if (video.getAttribute('data-src') === src) return false
      video.setAttribute('data-src', src)
      video.preload = 'auto'
      video.muted = true
      video.playsInline = true
      video.src = src
      video.load()
      return true
    }

    const warmNext = (fromIndex: number) => {
      const upcoming = (fromIndex + 1) % WALLPAPER_CLIPS.length
      const idleLayer: 0 | 1 = activeRef.current === 0 ? 1 : 0
      const video = layerEl(idleLayer)
      if (!video) {
        warmPromiseRef.current = Promise.resolve()
        return warmPromiseRef.current
      }

      assignSrc(video, WALLPAPER_CLIPS[upcoming]!.src)
      try {
        video.pause()
        if (video.currentTime !== 0) video.currentTime = 0
      } catch {
        /* ignore */
      }

      warmPromiseRef.current = waitCanPlay(video).then(async () => {
        try {
          await video.play()
          video.pause()
          if (video.currentTime > 0.05) video.currentTime = 0
        } catch {
          /* ignore */
        }
      })
      return warmPromiseRef.current
    }

    const scheduleNext = () => {
      clearTimer()
      timerRef.current = window.setTimeout(() => {
        void advance()
      }, CLIP_DWELL_SECONDS * 1000)
    }

    const advance = async () => {
      if (busyRef.current) return
      busyRef.current = true

      const upcoming = (indexRef.current + 1) % WALLPAPER_CLIPS.length
      const nextLayer: 0 | 1 = activeRef.current === 0 ? 1 : 0
      const prevLayer = activeRef.current
      const nextVideo = layerEl(nextLayer)
      const prevVideo = layerEl(prevLayer)

      if (!nextVideo) {
        busyRef.current = false
        scheduleNext()
        return
      }

      if (warmPromiseRef.current) {
        await warmPromiseRef.current
      } else {
        assignSrc(nextVideo, WALLPAPER_CLIPS[upcoming]!.src)
        await waitCanPlay(nextVideo)
      }

      setLabelVisible(false)

      try {
        if (Math.abs(nextVideo.currentTime) > 0.02) nextVideo.currentTime = 0
      } catch {
        /* ignore */
      }

      try {
        await nextVideo.play()
      } catch {
        /* autoplay */
      }

      await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))

      activeRef.current = nextLayer
      indexRef.current = upcoming
      setActive(nextLayer)
      setIndex(upcoming)

      window.setTimeout(() => setLabelVisible(true), 500)

      window.setTimeout(() => {
        if (prevVideo && prevVideo !== nextVideo) {
          prevVideo.pause()
        }
        void warmNext(upcoming)
        busyRef.current = false
        scheduleNext()
      }, 900)
    }

    const start = async () => {
      busyRef.current = true
      indexRef.current = 0
      activeRef.current = 0
      setIndex(0)
      setActive(0)

      const first = aRef.current
      if (!first) {
        busyRef.current = false
        return
      }

      assignSrc(first, WALLPAPER_CLIPS[0]!.src)
      await waitCanPlay(first)
      try {
        await first.play()
      } catch {
        /* ignore */
      }
      setLabelVisible(true)

      void warmNext(0)
      busyRef.current = false
      scheduleNext()
    }

    // Tercih okunmadan (null) ya da duraklatılmışken oynatma HİÇ başlamıyor.
    // Başlatıp sonra durdurmak, hareket tercihi olan kullanıcıya bir kare de olsa
    // hareket göstermek olurdu.
    if (playing !== true) {
      const pauseAll = () => {
        for (const video of [aRef.current, bRef.current]) {
          try {
            video?.pause()
          } catch {
            /* ignore */
          }
        }
      }

      clearTimer()
      pauseAll()
      return pauseAll
    }

    void start()

    return () => {
      clearTimer()
      busyRef.current = false
      warmPromiseRef.current = null
    }
  }, [playing])

  useEffect(() => {
    if (reduceParallax) return

    const onMove = (event: PointerEvent) => {
      const root = document.querySelector('.hero-wallpaper-media') as HTMLElement | null
      if (!root) return
      const x = event.clientX / window.innerWidth - 0.5
      const y = event.clientY / window.innerHeight - 0.5
      root.style.setProperty('--px', `${x * 10}px`)
      root.style.setProperty('--py', `${y * 8}px`)
    }

    const onLeave = () => {
      const root = document.querySelector('.hero-wallpaper-media') as HTMLElement | null
      if (!root) return
      root.style.setProperty('--px', '0px')
      root.style.setProperty('--py', '0px')
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerleave', onLeave)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerleave', onLeave)
    }
  }, [reduceParallax])

  return (
    // `aria-hidden` artık KAPSAYICIDA değil: durdurma düğmesi burada yaşıyor ve
    // içeride kalsaydı klavye ve ekran okuyucu onu hiç görmezdi — "kontrol var"
    // demek kâğıt üzerinde kalırdı (WCAG 2.2.2). Dekoratif katmanlar tek tek
    // gizleniyor.
    <div className="hero-wallpaper">
      <div className="hero-wallpaper-media" aria-hidden="true">
        <video
          ref={aRef}
          className={`hero-wallpaper-video ${active === 0 ? 'is-active' : ''}`}
          muted
          playsInline
          preload="auto"
          poster="/brand/wallpaper-dusk.jpg"
        />
        <video
          ref={bRef}
          className={`hero-wallpaper-video ${active === 1 ? 'is-active' : ''}`}
          muted
          playsInline
          preload="auto"
        />
      </div>

      <div className="hero-wallpaper-parallax" aria-hidden="true" />
      <div className="hero-wallpaper-veil" aria-hidden="true" />
      <div className="hero-wallpaper-glow" aria-hidden="true" />

      {/* Altyazı dekoratif: adı ekran okuyucuya duyurulsa her sayfada gürültü olurdu. */}
      <div
        aria-hidden="true"
        className={`hero-wallpaper-caption ${labelVisible ? 'is-visible' : ''}`}
      >
        <p className="hero-wallpaper-place">{caption?.place}</p>
        <p className="hero-wallpaper-label">{caption?.label}</p>
      </div>

      {/*
        WCAG 2.2.2 kontrolü. Küçük ve köşede ama GİZLİ DEĞİL: `sr-only` bir düğme
        fare kullanıcısına hiçbir şey sunmazdı ve kriter "mekanizma" istiyor,
        "ekran okuyucu mekanizması" değil.

        Odaklanınca büyüyor (`focus-visible`) — klavyeyle gezen kullanıcı nerede
        olduğunu görsün.
      */}
      <button
        type="button"
        onClick={() => setPlaying((current) => current !== true)}
        className="hero-wallpaper-toggle"
      >
        <span className="sr-only">{playing === true ? labels.pause : labels.play}</span>
        <span aria-hidden="true">{playing === true ? '❚❚' : '▶'}</span>
      </button>
    </div>
  )
}

/**
 * Duvar kağıdının metinleri. Sözlük `server-only`, bu bileşen istemci — metinler
 * sunucuda çözülüp prop olarak iniyor (`media-uploader.tsx` ile aynı karar).
 *
 * `captions` DİZİ ve sırası `WALLPAPER_CLIPS` ile aynı: hangi klibin çizileceğini
 * sunucu bilmiyor (döngü istemcide dönüyor), o yüzden üçünün metnini de gönderip
 * bileşen indeksliyor. Üç kısa dizge — tarayıcıya inen yük ihmal edilebilir.
 */
export type WallpaperLabels = {
  captions: { place: string; label: string }[]
  pause: string
  play: string
}
