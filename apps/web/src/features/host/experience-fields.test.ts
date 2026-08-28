import { describe, expect, it } from 'vitest'
import {
  isValidIsoDate,
  isValidTimeOfDay,
  parseMinorAmount,
  toMajorAmountInput,
} from './experience-fields'

/**
 * Fiyat ayrıştırma ve takvim girdisi doğrulaması.
 *
 * `parseMinorAmount` bu repodaki en sessiz hata adayı: yanlış bir çevrim host'un
 * fiyatını yüz kat kaydırır, hiçbir yerde hata vermez ve ancak ilk satışta
 * fark edilir.
 */

describe('parseMinorAmount', () => {
  it('tam sayıyı üsse göre ölçekliyor', () => {
    expect(parseMinorAmount('45', 2)).toBe(4500)
    expect(parseMinorAmount('100', 0)).toBe(100)
    expect(parseMinorAmount('1', 3)).toBe(1000)
  })

  it('ondalığı KAYAN NOKTA olmadan çeviriyor', () => {
    // Number('45.55') * 100 → 4554.999999999999. Dizge tabanlı çevrim bunu
    // yaşamıyor; bu test o farkı sabitliyor.
    expect(parseMinorAmount('45.55', 2)).toBe(4555)
    expect(parseMinorAmount('0.07', 2)).toBe(7)
    expect(parseMinorAmount('1.234', 3)).toBe(1234)
  })

  it('eksik haneyi sıfırla dolduruyor', () => {
    expect(parseMinorAmount('45.5', 2)).toBe(4550)
    expect(parseMinorAmount('45.5', 3)).toBe(45500)
  })

  it('fazla ama SIFIR olan haneyi kabul ediyor', () => {
    // "45.00" ile "45.000" aynı tutar; ikincisini reddetmek host'u şaşırtırdı.
    expect(parseMinorAmount('45.000', 2)).toBe(4500)
    expect(parseMinorAmount('100.0', 0)).toBe(100)
  })

  it('fazla ve SIFIR OLMAYAN haneyi REDDEDİYOR', () => {
    // Sessizce yuvarlamak, host'un yazmadığı bir fiyatı ona onaylatmak olurdu.
    expect(parseMinorAmount('45.555', 2)).toBeNull()
    expect(parseMinorAmount('100.5', 0)).toBeNull()
  })

  it('virgülü ondalık ayracı sayıyor', () => {
    // Yapıştırılan metin virgülle gelebiliyor.
    expect(parseMinorAmount('45,50', 2)).toBe(4550)
  })

  it('geçersiz girdide null dönüyor', () => {
    for (const raw of ['', '   ', 'abc', '-5', '4 5', '1e3', '45.', '.5']) {
      expect(parseMinorAmount(raw, 2), raw).toBeNull()
    }
  })

  it('sıfırı GEÇERLİ sayıyor', () => {
    // Ücretsiz bebek geçerli bir fiyat; boş alandan ayrı bir anlam taşıyor.
    expect(parseMinorAmount('0', 2)).toBe(0)
  })
})

describe('toMajorAmountInput', () => {
  it('parseMinorAmount ile GİDİP GELİYOR', () => {
    for (const [minor, units] of [
      [4500, 2],
      [4555, 2],
      [7, 2],
      [100, 0],
      [1234, 3],
      [0, 2],
    ] as const) {
      const text = toMajorAmountInput(minor, units)
      expect(parseMinorAmount(text, units), `${minor}@${units} → ${text}`).toBe(minor)
    }
  })

  it('üssü sıfır olanda ondalık YAZMIYOR', () => {
    expect(toMajorAmountInput(100, 0)).toBe('100')
  })

  it('küçük tutarda tam kısmı sıfırla dolduruyor', () => {
    expect(toMajorAmountInput(7, 2)).toBe('0.07')
  })

  it('biçim NÖTR: binlik ayracı yok', () => {
    // Bu bir `<input type="number">` değeri; locale biçimi onu geçersiz yapardı.
    expect(toMajorAmountInput(123456789, 2)).toBe('1234567.89')
  })
})

describe('isValidTimeOfDay', () => {
  it('dakika hassasiyetli saati kabul ediyor', () => {
    for (const value of ['00:00', '09:05', '14:00', '23:59']) {
      expect(isValidTimeOfDay(value), value).toBe(true)
    }
  })

  it('geçersiz saati reddediyor', () => {
    for (const value of ['24:00', '12:60', '9:00', '14:00:30', '', 'öğlen']) {
      expect(isValidTimeOfDay(value), value).toBe(false)
    }
  })
})

describe('isValidIsoDate', () => {
  it('gerçek günü kabul ediyor', () => {
    expect(isValidIsoDate('2026-10-13')).toBe(true)
    expect(isValidIsoDate('2024-02-29')).toBe(true)
  })

  it('TAKVİMSEL olarak var olmayan günü reddediyor', () => {
    // Yalnız desen kontrolü yapan bir doğrulayıcı bunları geçirirdi.
    expect(isValidIsoDate('2026-02-31')).toBe(false)
    expect(isValidIsoDate('2025-02-29')).toBe(false)
    expect(isValidIsoDate('2026-13-01')).toBe(false)
  })

  it('biçimi bozuk değeri reddediyor', () => {
    for (const value of ['13-10-2026', '2026/10/13', '2026-1-1', '']) {
      expect(isValidIsoDate(value), value).toBe(false)
    }
  })
})
