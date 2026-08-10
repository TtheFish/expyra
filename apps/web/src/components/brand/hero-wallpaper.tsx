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
 * Site-wide playlist wallpaper (layout'ta yaşar → tab değişince kaybolmaz).
 * Video varsayılan açık; prefers-reduced-motion sadece parallax'ı keser.
 */
export function HeroWallpaper() {
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

  const clip = WALLPAPER_CLIPS[index]!
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
    const sync = () => setReduceParallax(media.matches)
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

    void start()

    return () => {
      clearTimer()
      busyRef.current = false
      warmPromiseRef.current = null
    }
  }, [])

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
    <div className="hero-wallpaper" aria-hidden="true">
      <div className="hero-wallpaper-media">
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

      <div className="hero-wallpaper-parallax" />
      <div className="hero-wallpaper-veil" />
      <div className="hero-wallpaper-glow" />

      <div className={`hero-wallpaper-caption ${labelVisible ? 'is-visible' : ''}`}>
        <p className="hero-wallpaper-place">{clip.place}</p>
        <p className="hero-wallpaper-label">{clip.label}</p>
      </div>
    </div>
  )
}
