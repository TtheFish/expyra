import 'server-only'

import { readWwdrCertPem } from '@/lib/wallet/pass-assets'

/**
 * Apple / Google Wallet kimlik bilgileri.
 *
 * Sır REPOYA YAZILMAZ (`CLAUDE.md` #4). `apps/web/.env.local` veya host
 * ortam değişkeni. Tanımsızsa uçlar 503 döner; bilet görüntüleme sayfası
 * yine çalışır — ekleme yalnız kimlikler varken telefona iner.
 */

export type AppleWalletConfig = {
  passTypeIdentifier: string
  teamIdentifier: string
  organizationName: string
  /** PEM (-----BEGIN CERTIFICATE-----) */
  signerCertPem: string
  /** PEM private key */
  signerKeyPem: string
  /** WWDR ara sertifika PEM (Apple’ın herkese açık G4’ü) */
  wwdrPem: string
  signerKeyPassphrase?: string
}

export type GoogleWalletConfig = {
  /** `issuerId.objectSuffix` biçiminde sınıf kimliği kökü */
  issuerId: string
  /** Service account e-posta (`client_email`) */
  clientEmail: string
  /** PEM private key (`private_key`) */
  privateKeyPem: string
  /** Google Wallet’ta kayıtlı sınıfın sonek kimliği (oluşturma opsiyonel) */
  classSuffix: string
}

export function appleWalletConfig(): AppleWalletConfig | null {
  const passTypeIdentifier = process.env.EXPYRA_APPLE_PASS_TYPE_ID?.trim()
  const teamIdentifier = process.env.EXPYRA_APPLE_TEAM_ID?.trim()
  const signerCertPem = process.env.EXPYRA_APPLE_PASS_CERT_PEM?.trim()
  const signerKeyPem = process.env.EXPYRA_APPLE_PASS_KEY_PEM?.trim()

  if (!passTypeIdentifier || !teamIdentifier || !signerCertPem || !signerKeyPem) {
    return null
  }

  // Dosya, kimlikler tanımlıyken okunur: tanımsızken uç 503 dönmeli — dağıtımda
  // eksik bir dosya yüzünden 500 değil.
  const wwdrPem =
    process.env.EXPYRA_APPLE_WWDR_PEM?.trim() ||
    // Apple’ın herkese açık WWDR G4 ara sertifikası — sır değil, modelle gelir.
    readWwdrCertPem()

  return {
    passTypeIdentifier,
    teamIdentifier,
    organizationName: process.env.EXPYRA_APPLE_ORG_NAME?.trim() || 'Expyra',
    signerCertPem: normalizePem(signerCertPem),
    signerKeyPem: normalizePem(signerKeyPem),
    wwdrPem: normalizePem(wwdrPem),
    signerKeyPassphrase: process.env.EXPYRA_APPLE_PASS_KEY_PASSPHRASE?.trim() || undefined,
  }
}

export function googleWalletConfig(): GoogleWalletConfig | null {
  const issuerId = process.env.EXPYRA_GOOGLE_WALLET_ISSUER_ID?.trim()
  const clientEmail = process.env.EXPYRA_GOOGLE_WALLET_CLIENT_EMAIL?.trim()
  const privateKeyPem = process.env.EXPYRA_GOOGLE_WALLET_PRIVATE_KEY?.trim()
  const classSuffix = process.env.EXPYRA_GOOGLE_WALLET_CLASS_SUFFIX?.trim() || 'expyra_ticket'

  if (!issuerId || !clientEmail || !privateKeyPem) {
    return null
  }

  return {
    issuerId,
    clientEmail,
    privateKeyPem: normalizePem(privateKeyPem),
    classSuffix,
  }
}

/** `.env` satırındaki `\n` kaçışlarını gerçek satır sonuna çevirir. */
function normalizePem(value: string): string {
  return value.includes('\\n') ? value.replace(/\\n/g, '\n') : value
}

/**
 * Google Wallet JWT'sinin `origins` alanı — "Kaydet" düğmesinin gömülü olduğu
 * sitenin kökü. Google listede olmayan bir kökten gelen kaydetmeyi reddediyor.
 *
 * Üretimde tanımsızsa HATA: `localhost`'a düşmek, Google Wallet'ın canlıda
 * sessizce kırılması demekti (#48). Geri düşüş yalnız geliştirme içindir.
 */
export function webOrigin(): string {
  const raw = process.env.EXPYRA_WEB_ORIGIN?.trim()

  if (!raw) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'EXPYRA_WEB_ORIGIN tanımlı değil; Google Wallet kaydetme bağlantısı üretilemez. ' +
          'Sitenin kökünü yaz (örn. https://expyra.com) — apps/web/.env.example.',
      )
    }
    return 'http://localhost:3000'
  }

  return new URL(raw).origin
}
