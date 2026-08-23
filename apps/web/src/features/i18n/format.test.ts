import { describe, expect, it } from 'vitest'
import { formatMinorMoney, formatWallClock, interpolate } from './format'

/**
 * Para ve saat biçimlendirmesi.
 *
 * Bu iki fonksiyon SESSİZ bozulan sınıfta: yanlış üs tutarı yüz kat kaydırıyor,
 * yanlış ayrıştırma saati bir saat kaydırıyor ve ikisi de ekranda "makul"
 * görünüyor. Test etmenin sebebi bu — bir hata mesajı değil, yanlış bir sayı.
 */

describe('formatMinorMoney', () => {
  it('üssü olan para biriminde küsuratı GÖSTERİYOR', () => {
    // 45,00 € — küsurat atılırsa 45,50 ile 45,00 ekranda aynı görünürdü ve
    // aradaki fark ödenecek paranın kendisi.
    expect(formatMinorMoney('tr', 4500, 'EUR', 2)).toContain('45,00')
    expect(formatMinorMoney('tr', 4550, 'EUR', 2)).toContain('45,50')
  })

  it('üssü SIFIR olan para biriminde ondalık BASMIYOR', () => {
    // JPY'nin küsuratı yok. Sabit "2 hane" varsayan bir formatlayıcı 100 yeni
    // 1,00 yen gösterirdi.
    const yen = formatMinorMoney('tr', 100, 'JPY', 0)

    expect(yen).toContain('100')
    expect(yen).not.toContain(',00')
  })

  it('üssü ÜÇ olan para biriminde üç hane basıyor', () => {
    // KWD: 1 dinar = 1000 fils. İki haneye yuvarlamak her satırda fils kaybı.
    expect(formatMinorMoney('tr', 1234, 'KWD', 3)).toContain('1,234')
  })

  it('locale sembolün yerini değiştiriyor, tutarı değil', () => {
    const tr = formatMinorMoney('tr', 4500, 'EUR', 2)
    const en = formatMinorMoney('en', 4500, 'EUR', 2)

    expect(tr).not.toBe(en)
    expect(tr).toContain('45,00')
    expect(en).toContain('45.00')
  })
})

describe('formatWallClock', () => {
  it('duvar saatini OLDUĞU GİBİ gösteriyor', () => {
    // Testi koşan makinenin saat dilimi ne olursa olsun 14:00 çıkmalı. Fonksiyon
    // `new Date()` kullansaydı bu satır CI'da (UTC) ve burada (UTC+3) farklı
    // sonuç verirdi — tam olarak engellenmek istenen hata.
    const text = formatWallClock('tr', '2026-10-13T14:00', {
      hour: '2-digit',
      minute: '2-digit',
    })

    expect(text).toBe('14:00')
  })

  it('yaz saati geçişinin İKİ yanında da yazılan saati koruyor', () => {
    // Prag 25 Ekim 2026'da saatleri geri alıyor. Sunucu iki gün için de "10:00"
    // gönderiyor (UTC farklı) ve ekranda ikisi de 10:00 görünmeli.
    const options = { hour: '2-digit', minute: '2-digit' } as const

    expect(formatWallClock('tr', '2026-10-18T10:00', options)).toBe('10:00')
    expect(formatWallClock('tr', '2026-10-25T10:00', options)).toBe('10:00')
  })

  it('gün ve ay biçimi locale ile değişiyor', () => {
    const options = { day: 'numeric', month: 'short' } as const

    const tr = formatWallClock('tr', '2026-10-13T14:00', options)
    const en = formatWallClock('en', '2026-10-13T14:00', options)

    expect(tr).toContain('13')
    expect(en).toContain('13')
    expect(tr).not.toBe(en)
  })

  it('saat dilimi EKLİ bir damgayı REDDEDIYOR', () => {
    // Sessizce kabul etseydi `new Date()`e düşen eski davranışa geri dönerdik ve
    // saat kayması yeniden görünmez olurdu (CLAUDE.md #1).
    expect(() => formatWallClock('tr', '2026-10-13T14:00:00Z', { hour: '2-digit' })).toThrow()
    expect(() => formatWallClock('tr', '2026-10-13T14:00+02:00', { hour: '2-digit' })).toThrow()
  })
})

describe('interpolate', () => {
  it('sayıyı locale ile biçimliyor', () => {
    // Çağıranın `formatNumber` yazmayı unuttuğu her yer Arapça/Hintçe arayüzde
    // ASCII rakam basardı.
    expect(interpolate('tr', '{n} kişi', { n: 1234 })).toBe('1.234 kişi')
    expect(interpolate('en', '{n} people', { n: 1234 })).toBe('1,234 people')
  })

  it('karşılığı olmayan yer tutucuyu OLDUĞU GİBİ bırakıyor', () => {
    // Boş string basmak eksik çeviriyi görünmez yapardı.
    expect(interpolate('tr', 'Merhaba {ad}', {})).toBe('Merhaba {ad}')
  })
})
