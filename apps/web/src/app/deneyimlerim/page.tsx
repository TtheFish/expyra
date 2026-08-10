import Link from 'next/link'
import { GlassButton } from '@/components/ui/glass-button'
import { GlassTicket } from '@/components/ticket/glass-ticket'
import { DEMO_TICKETS, qrSvg } from '@/lib/ticket'
import '../ticket.css'

/**
 * "Deneyimlerim" — gezginin biletleri.
 *
 * İki bölüm: yaklaşan (bilet canlı) ve geçmiş (bilet kullanılmış).
 * Faz 5'te gerçek rezervasyon verisine bağlanacak; şu an demo veri.
 */

export const metadata = {
  title: 'Deneyimlerim · Expyra',
}

export default async function MyExperiencesPage() {
  const tickets = await Promise.all(
    DEMO_TICKETS.map(async (ticket) => ({ ticket, qrMarkup: await qrSvg(ticket) })),
  )

  const upcoming = tickets.filter((t) => t.ticket.status === 'valid')
  const past = tickets.filter((t) => t.ticket.status !== 'valid')

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="relative z-10 px-4 pt-4">
        <div className="glass glass-edge glass-thick mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-3 pl-5">
          <Link href="/" className="font-semibold tracking-tight">Expyra</Link>
          <nav className="flex items-center gap-1" aria-label="Ana menü">
            <GlassButton variant="ghost" size="sm" href="/">Keşfet</GlassButton>
            <GlassButton variant="ghost" size="sm" href="/deneyimlerim" className="!text-fg">
              Deneyimlerim
            </GlassButton>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:py-16">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Deneyimlerim</h1>
        <p className="mt-2 text-fg-muted">
          Biletlerin burada. Girişte host QR kodu okutacak.
        </p>

        <section className="mt-10" aria-labelledby="yaklasan">
          <h2 id="yaklasan" className="mb-5 text-sm font-medium text-fg-muted">
            Yaklaşan · {upcoming.length}
          </h2>

          <div className="grid gap-6 sm:grid-cols-2">
            {upcoming.map(({ ticket, qrMarkup }) => (
              <div key={ticket.code}>
                <GlassTicket ticket={ticket} qrMarkup={qrMarkup} />
                <div className="mt-3 flex flex-wrap gap-2">
                  <GlassButton variant="primary" size="sm" href={`/api/bilet/${ticket.code}/pdf`}>
                    PDF indir
                  </GlassButton>
                  <GlassButton size="sm">Apple Cüzdan’a ekle</GlassButton>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14" aria-labelledby="gecmis">
          <h2 id="gecmis" className="mb-5 text-sm font-medium text-fg-muted">
            Geçmiş işlemler · {past.length}
          </h2>

          <div className="grid gap-6 sm:grid-cols-2">
            {past.map(({ ticket, qrMarkup }) => (
              <div key={ticket.code}>
                <GlassTicket ticket={ticket} qrMarkup={qrMarkup} />
                <div className="mt-3 flex flex-wrap gap-2">
                  <GlassButton size="sm" href={`/api/bilet/${ticket.code}/pdf`}>
                    PDF indir
                  </GlassButton>
                  <GlassButton size="sm">Değerlendir</GlassButton>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
