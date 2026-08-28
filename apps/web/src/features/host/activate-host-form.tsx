'use client'

import { useActionState } from 'react'
import { GlassButton } from '@/components/ui/glass-button'
import { UI_LANGUAGE_FIELD } from '@/features/i18n/locale'
import { activateHostAction, type HostFormState } from './actions'

/**
 * "Host ol" düğmesi — `profile-form.tsx` ile aynı kalıp: `useActionState`,
 * bekleme sırasında değişen etiket, boşken de DOM'da duran hata kutusu.
 *
 * İstemci bileşeni olmasının tek nedeni bu geri bildirim. `role="alert"` ancak
 * metin SONRADAN değişirse seslendirilir; hatayı sayfa yeniden yüklenip hazır
 * gelen bir sorgu parametresiyle göstersek ekran okuyucu hiçbir şey duyurmazdı.
 *
 * Başarı için ayrı bir mesaj YOK: rol yazıldığı an sayfa panele dönüyor,
 * kullanıcının gördüğü değişikliğin kendisi onay.
 *
 * Düğme metni PROP, hata metni ise sunucu eyleminden HAZIR geliyor — sözlük
 * `server-only` ve bu bileşen tarayıcıda çalışıyor.
 */

const INITIAL: HostFormState = { error: null, at: 0 }

const ERROR_ID = 'host-aktivasyon-hata'

export type ActivateHostFormLabels = {
  cta: string
  pending: string
}

export function ActivateHostForm({ lang, labels }: { lang: string; labels: ActivateHostFormLabels }) {
  const [state, formAction, pending] = useActionState<HostFormState, FormData>(
    activateHostAction,
    INITIAL,
  )

  return (
    <form action={formAction}>
      {/* Yönlendirme hedefinin ve hata metninin dili; eylem bunu `uiLocaleOf`
          ile kapalı kümeye daraltıyor. */}
      <input type="hidden" name={UI_LANGUAGE_FIELD} value={lang} />

      {/*
        Hata kutusu BOŞKEN DE DOM'da: sonradan eklenen alert düğümünü bazı ekran
        okuyucular kaçırır, ayrıca sabit yükseklik kartın zıplamasını önler.
      */}
      <p id={ERROR_ID} className="auth-alert" role="alert">
        {state.error}
      </p>

      <GlassButton
        type="submit"
        variant="primary"
        size="lg"
        disabled={pending}
        aria-describedby={ERROR_ID}
      >
        {pending ? labels.pending : labels.cta}
      </GlassButton>
    </form>
  )
}
