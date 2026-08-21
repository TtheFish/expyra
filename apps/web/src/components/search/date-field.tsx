'use client'

import { useRef } from 'react'

/**
 * Tarih alanı — alanın herhangi bir yerine tıklayınca takvim açılır.
 *
 * Native `<input type="date">` tıklayınca yalnızca odaklanır; takvimi görmek için
 * sağdaki küçük ikonu bulmak gerekir. Arama çubuğunda diğer iki alan tek tıkla
 * çalışırken (metin yazılır, panel açılır) tarihin ikon avı istemesi tutarsız.
 *
 * `showPicker()` kullanıcı hareketi içinde çağrılmak zorunda — bu yüzden onClick.
 * Desteklemeyen tarayıcıda (bugün Safari) sessizce native davranışa düşer:
 * alan yine odaklanır ve klavyeyle doldurulabilir, hiçbir şey kaybolmaz.
 *
 * Etiket PROP: sözlük `server-only`, bu bileşen tarayıcıda (bkz. `site-header`).
 * Alanın İÇİNDEKİ tarih biçimini tarayıcı kendi diliyle çiziyor — `<input
 * type="date">` bunu bize bırakmıyor ve `lang` özniteliği de değiştirmiyor.
 * Forma giden değer her durumda `yyyy-aa-gg`, yani sunucu tarafı etkilenmiyor.
 */
export function DateField({
  defaultValue = '',
  label,
}: {
  defaultValue?: string
  label: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  const openPicker = () => {
    const input = inputRef.current
    if (!input || typeof input.showPicker !== 'function') return

    try {
      input.showPicker()
    } catch {
      // Kullanıcı hareketi dışında veya gizli alanda çağrılırsa fırlatır.
      // Yutulan bir hata değil: takvim açılmazsa alan hâlâ elle doldurulabilir,
      // yani kullanıcı için kaybedilen bir yetenek yok.
    }
  }

  return (
    <label className="search-field" htmlFor="search-tarih">
      <span className="search-field-label">{label}</span>
      {/*
        onClick label'da DEĞİL input'ta: label'a tıklandığında tarayıcı zaten
        input'a bir click iletiyor. İkisine birden bağlarsak showPicker iki kez
        çağrılır ve bazı tarayıcılarda ikinci çağrı takvimi kapatır.
      */}
      <input
        ref={inputRef}
        id="search-tarih"
        name="tarih"
        type="date"
        defaultValue={defaultValue}
        onClick={openPicker}
        className="search-field-input"
      />
    </label>
  )
}
