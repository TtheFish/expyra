'use client'

import { useActionState } from 'react'
import { GlassButton } from '@/components/ui/glass-button'
import { activateHostAction, type HostFormState } from './actions'
import { t } from './messages'

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
 */

const INITIAL: HostFormState = { error: null, at: 0 }

const ERROR_ID = 'host-aktivasyon-hata'

export function ActivateHostForm({ lang }: { lang: string }) {
  const [state, formAction, pending] = useActionState<HostFormState, FormData>(
    activateHostAction,
    INITIAL,
  )

  return (
    <form action={formAction}>
      {/* Yönlendirme hedefinin dili; eylem bunu `isRoutableLanguage` ile doğruluyor. */}
      <input type="hidden" name="dil" value={lang} />

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
        {pending ? t('host.invite.pending') : t('host.invite.cta')}
      </GlassButton>
    </form>
  )
}
