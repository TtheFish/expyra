# Apple / Google Wallet

Biletler telefona **gerçek** PassKit / Google Wallet nesnesi olarak iner.
Üretici web BFF’de (`apps/web/src/lib/wallet/`); Blok 12’de API’ye taşınacak —
iki imza yolu doğmasın diye.

Görüntüleme (`/tr/bilet/:code`) kimlik **istemez**. Ekleme uçları
(` /api/bilet/:code/apple|google`) oturum + aşağıdaki sırları ister.

## Apple Wallet (`.pkpass`)

1. [Apple Developer](https://developer.apple.com) → Identifiers → **Pass Type ID**
2. Certificates → Pass Type ID sertifikası + private key (`.p12` / PEM)
3. WWDR ara sertifika repoda gömülü (`AppleWWDRCAG4.pem`); üzerine yazmak istersen
   `EXPYRA_APPLE_WWDR_PEM`

`apps/web/.env.local`:

```bash
EXPYRA_APPLE_PASS_TYPE_ID=pass.com.expyra.ticket
EXPYRA_APPLE_TEAM_ID=XXXXXXXXXX
EXPYRA_APPLE_ORG_NAME=Expyra
EXPYRA_APPLE_PASS_CERT_PEM="-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"
EXPYRA_APPLE_PASS_KEY_PEM="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
# EXPYRA_APPLE_PASS_KEY_PASSPHRASE=
```

iPhone’da **Apple Cüzdan’a ekle** → `.pkpass` iner / Cüzdan açılır.

## Google Wallet

1. [Google Pay & Wallet Console](https://pay.google.com/business/console) → Issuer
2. Google Cloud’da Wallet API + service account (JWT imzalayan)
3. Service account’a Issuer erişimi ver

```bash
EXPYRA_GOOGLE_WALLET_ISSUER_ID=3388000000012345678
EXPYRA_GOOGLE_WALLET_CLIENT_EMAIL=wallet@…iam.gserviceaccount.com
EXPYRA_GOOGLE_WALLET_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
EXPYRA_GOOGLE_WALLET_CLASS_SUFFIX=expyra_ticket
```

**Google Cüzdan’a ekle** → imzalı JWT save URL’sine 302.

## Demo biletler

`lib/ticket.ts` → iki yaklaşan (`EXP-7K4M-92QD`, `EXP-4H9C-77MK`). Kimlikler
yokken düğmeler 503 mesajı gösterir; **Bileti görüntüle** ve PDF çalışır.
