import { ApiError } from '@/features/auth/api'
import { fetchQuote } from '@/features/experiences/api'
import {
  ADULTS_PARAM,
  CHILDREN_PARAM,
  CURRENCY_PARAM,
  INFANTS_PARAM,
  SLOT_PARAM,
} from '@/features/experiences/booking-params'

/**
 * Canlı fiyat özeti için BFF — tarayıcı .NET API'yi görmez (yerler autocomplete
 * ile aynı gerekçe). Hesap yine sunucuda; istemci yalnız sonucu çizer.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params
  const query = new URL(request.url).searchParams

  const slotId = query.get(SLOT_PARAM)
  if (!slotId) {
    return Response.json({ title: 'seans gerekli' }, { status: 400 })
  }

  const adults = Number(query.get(ADULTS_PARAM) ?? '0')
  const children = Number(query.get(CHILDREN_PARAM) ?? '0')
  const infants = Number(query.get(INFANTS_PARAM) ?? '0')
  const currency = query.get(CURRENCY_PARAM)

  try {
    const quote = await fetchQuote({
      slug,
      slotId,
      adults,
      children,
      infants,
      currency: currency && currency.length > 0 ? currency : null,
    })

    return Response.json(quote, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json({ title: error.message }, { status: error.status })
    }
    throw error
  }
}
