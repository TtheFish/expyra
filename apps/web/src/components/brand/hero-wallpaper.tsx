/**
 * Ana sayfa duvar kağıdı — gün batımı sahil / şehir atmosferi + yavaş ken-burns.
 * prefers-reduced-motion: sabit kare.
 */
export function HeroWallpaper() {
  return (
    <div className="hero-wallpaper" aria-hidden="true">
      <div className="hero-wallpaper-media">
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative full-bleed bg */}
        <img
          src="/brand/wallpaper-dusk.jpg"
          alt=""
          className="hero-wallpaper-image"
        />
      </div>
      <div className="hero-wallpaper-veil" />
      <div className="hero-wallpaper-glow" />
    </div>
  )
}
