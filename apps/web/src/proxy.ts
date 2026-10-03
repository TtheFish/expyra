import { NextResponse, type NextRequest } from 'next/server'
import {
  SESSION_COOKIE_PATH,
  accessCookieName,
  clearedCookieOptions,
  refreshCookieName,
  sessionCookieOptions,
} from '@/features/auth/cookies'
import { RETURN_TO_PARAM } from '@/features/auth/return-to'
import { isRoutableLanguage, path, resolvePage, type PageId } from '@/lib/routes'

/**
 * Next 16'da bu dosyanın adı `proxy` — `middleware` kullanımdan kaldırıldı.
 *
 * 1. İyimser route guard (çerez var mı). 2. Token yenileme. 3. `x-pathname` +
 * UI dil çerezi — dil seçici JS'siz `<a>` ile çalıştığı için tercih URL'den.
 */

const LANG_COOKIE = 'expyra_lang'
const LANG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

/** Oturum ister görünen yollar. Kısa tutuluyor: liste büyüdükçe yanlış negatif riski artar. */
/**
 * Korumalı sayfalar SAYFA KİMLİĞİ ile tanımlı, yol dizesiyle değil: aynı sayfa
 * her dilde farklı yolda (`/tr/deneyimlerim`, `/en/my-experiences`). Dize
 * listesi tutulsaydı yeni dil eklendiğinde koruma sessizce delinirdi.
 *
 * **`becomeHost` bilerek BURADA DEĞİL** — ve eklenmemeli. O sayfa oturumsuz
 * ziyaretçiye ne vaat ettiğimizi anlatan tek ekran; giriş kapısının arkasına
 * konursa host adayı sayfayı hiç görmeden giriş formuna düşer. VISION §8'e göre
 * projenin en büyük riski arz tarafı (host bulmak), yani tam olarak o ziyaretçi.
 * Sayfa kişisel veri göstermiyor: oturumsuz görünümü tamamen tanıtım, oturumlu
 * görünümü ise sayfanın kendi içinde çözülüyor (`become-a-host/page.tsx`).
 * Blok 5'in gerçek host ekranları (`/host/deneyim/...`) bu listeye girecek.
 *
 * Buradaki kontrol İYİMSER (çerez var mı) ve tek başına yetmez: korumalı sayfa
 * oturumu ayrıca kendisi doğrular (`getVerifiedUser`). Proxy'nin işi, oturumsuz
 * ziyaretçiyi render'a girmeden giriş ekranına almak ve token'ı tazelemek.
 */
const PROTECTED_PAGES: PageId[] = ['myExperiences', 'account', 'ticketDetail']

type AuthTokens = {
  accessToken: string
  accessTokenExpiresAtUtc: string
  refreshToken: string
  refreshTokenExpiresAtUtc: string
}

type Rotation =
  | { kind: 'rotated'; tokens: AuthTokens }
  /** 401/403 — oturum gerçekten ölü, çerezler silinir. */
  | { kind: 'rejected' }
  /** Ağ hatası / 5xx — çerezlere DOKUNULMAZ, token bir sonraki isteğe kalsın. */
  | { kind: 'unavailable' }

/**
 * Her yanıta ortak: dil seçiciye `x-pathname` (sorgu dahil) + UI dil çerezi.
 * Dil linkleri JS'siz çalıştığı için tercih URL'den türetilir.
 */
function continueRequest(request: NextRequest): NextResponse {
  const requestHeaders = new Headers(request.headers)
  const pathAndQuery = `${request.nextUrl.pathname}${request.nextUrl.search}`
  requestHeaders.set('x-pathname', pathAndQuery)

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })

  const segment = request.nextUrl.pathname.split('/').filter(Boolean)[0]
  if (segment && isRoutableLanguage(segment)) {
    response.cookies.set(LANG_COOKIE, segment, {
      path: '/',
      maxAge: LANG_COOKIE_MAX_AGE,
      sameSite: 'lax',
    })
  }

  return response
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const accessName = accessCookieName()
  const refreshName = refreshCookieName()

  const accessToken = request.cookies.get(accessName)?.value
  if (accessToken) {
    return continueRequest(request)
  }

  const refreshToken = request.cookies.get(refreshName)?.value
  if (!refreshToken) {
    return guard(request)
  }

  if (isPrefetch(request)) {
    return continueRequest(request)
  }

  const rotation = await rotate(request, refreshToken)

  if (rotation.kind === 'rotated') {
    const { tokens } = rotation

    // Aşağıdaki render'ın taze access token'ı görmesi için İSTEK çerezleri de
    // güncelleniyor; yalnız yanıta yazmak bu isteği kimliksiz bırakırdı.
    request.cookies.set(accessName, tokens.accessToken)
    request.cookies.set(refreshName, tokens.refreshToken)

    const response = continueRequest(request)

    response.cookies.set(
      accessName,
      tokens.accessToken,
      sessionCookieOptions(tokens.accessTokenExpiresAtUtc),
    )
    response.cookies.set(
      refreshName,
      tokens.refreshToken,
      sessionCookieOptions(tokens.refreshTokenExpiresAtUtc),
    )

    return response
  }

  if (rotation.kind === 'unavailable') {
    // API geçici olarak ulaşılamıyor. Çerezi silmek, her API kesintisinde tüm
    // kullanıcıları çıkış yaptırmak demek olurdu.
    return continueRequest(request)
  }

  const response = guard(request)
  const cleared = clearedCookieOptions(SESSION_COOKIE_PATH)
  response.cookies.set(accessName, '', cleared)
  response.cookies.set(refreshName, '', cleared)

  return response
}

function guard(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl

  const resolved = resolvePage(pathname)

  if (!resolved || !PROTECTED_PAGES.includes(resolved.page)) {
    return continueRequest(request)
  }

  // Giriş ekranı kullanıcının bulunduğu dilde açılıyor: korumalı sayfaya
  // İngilizce yoldan gelen kullanıcıyı Türkçe girişe atmak dilini sıfırlar.
  const target = new URL(path(resolved.language, 'signIn'), request.nextUrl)
  // `searchParams.set` kodlamayı kendisi yapıyor; elle birleştirmek açık
  // yönlendirme yüzeyi açar. Değer ayrıca `safeReturnTo`'dan da geçecek.
  target.searchParams.set(RETURN_TO_PARAM, `${pathname}${search}`)

  return NextResponse.redirect(target)
}

/**
 * `sec-purpose`/`purpose` iç Flight başlığı değil, bu yüzden proxy'de okunabiliyor.
 * `next-router-prefetch` çoğu durumda silinmiş gelir — yine de bakıyoruz, bedava.
 */
function isPrefetch(request: NextRequest): boolean {
  return (
    request.headers.get('next-router-prefetch') !== null ||
    request.headers.get('purpose') === 'prefetch' ||
    (request.headers.get('sec-purpose') ?? '').includes('prefetch')
  )
}

async function rotate(request: NextRequest, refreshToken: string): Promise<Rotation> {
  // Ortam değişkeni FONKSİYON İÇİNDE okunuyor: modül seviyesinde okunursa
  // `next build` değişkeni tanımlı olmayan CI makinesinde patlar.
  const base = process.env.EXPYRA_API_URL?.trim()
  if (!base) {
    console.error('proxy: EXPYRA_API_URL tanımlı değil, oturum yenilenemiyor.')
    return { kind: 'unavailable' }
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    headers['X-Expyra-Client-Ip'] = forwardedFor.split(',')[0]?.trim() ?? ''
  }

  try {
    const response = await fetch(`${base.replace(/\/+$/, '')}/api/auth/refresh`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    })

    if (response.status === 401 || response.status === 403) {
      return { kind: 'rejected' }
    }

    if (!response.ok) {
      console.error('auth.refresh.failed', response.status)
      return { kind: 'unavailable' }
    }

    return { kind: 'rotated', tokens: (await response.json()) as AuthTokens }
  } catch (error) {
    // Yutma değil: hata Error seviyesinde görünür kalıyor. Proxy her istekte
    // çalıştığı için burada fırlatmak tüm siteyi 500'e düşürürdü.
    console.error('auth.refresh.unreachable', error)
    return { kind: 'unavailable' }
  }
}

export const config = {
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
      // Prefetch isteklerinde proxy hiç çalışmıyor — token yenilemenin paralel
      // prefetch'lerle yarışmasının tek kesin çözümü bu (bkz. dosya başı).
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
