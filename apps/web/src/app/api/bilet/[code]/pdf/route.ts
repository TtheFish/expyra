import { findTicket } from '@/lib/ticket'
import { buildTicketPdf } from '@/lib/ticket-pdf'

/** PDF dosya sistemine ve font'a eriştiği için Node çalışma zamanı gerekiyor. */
export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params
  const ticket = findTicket(code)

  if (!ticket) {
    return Response.json({ title: 'Bilet bulunamadı.' }, { status: 404 })
  }

  const pdf = await buildTicketPdf(ticket)

  return new Response(pdf as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="expyra-bilet-${ticket.code}.pdf"`,
      // Bilet kişiye özel — ara katmanlarda önbelleğe alınmamalı
      'Cache-Control': 'private, no-store',
    },
  })
}
