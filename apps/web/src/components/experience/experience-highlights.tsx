import type { ReactNode } from 'react'
import type { GuestExperienceDetail } from '@/features/experiences/api'
import type { Translate } from '@/features/i18n/dictionary'
import { formatExperienceDuration } from '@/components/experience/experience-card'
import { localNameOf } from '@/lib/languages'

/**
 * Airbnb tarzı "özet satırları": solda emoji/avatar, sağda başlık + alt satır.
 * Kağıt üstünde flat ikon değil emoji — tasarımın sıcak tonuna uyuyor.
 */

export function ExperienceHighlights({
  experience,
  cityName,
  hostAvatar,
  t,
  lang,
}: {
  experience: GuestExperienceDetail
  cityName: string
  hostAvatar: ReactNode
  t: Translate
  lang: string
}) {
  const hostName = experience.host.displayName ?? t('experience.detail.host.anonymous')
  const spoken =
    experience.spokenLanguages.length > 0
      ? experience.spokenLanguages.map((code) => localNameOf(code, lang) ?? code).join(' · ')
      : null

  const rows: {
    icon: ReactNode
    title: string
    subtitle: string | null
    subtitleLang?: string
  }[] = [
    {
      icon: hostAvatar,
      title: t('experience.detail.highlights.host', { ad: hostName }),
      subtitle: experience.host.headline ?? experience.text.title,
    },
  ]

  if (experience.meetingPoint?.address) {
    rows.push({
      icon: <HighlightEmoji>📍</HighlightEmoji>,
      title: experience.meetingPoint.address,
      subtitle: cityName,
    })
  }

  rows.push({
    icon: <HighlightEmoji>⏱️</HighlightEmoji>,
    title: t('experience.detail.highlights.duration', {
      sure: formatExperienceDuration(t, experience.durationMinutes),
    }),
    subtitle: spoken
      ? t('experience.detail.highlights.spoken', { diller: spoken })
      : t('experience.detail.highlights.capacity', { n: experience.capacity }),
  })

  if (experience.text.whatToBring) {
    rows.push({
      icon: <HighlightEmoji>📋</HighlightEmoji>,
      title: t('experience.detail.highlights.bring'),
      subtitle: experience.text.whatToBring,
      subtitleLang: experience.text.language,
    })
  } else if (experience.activityLevel === 'light') {
    rows.push({
      icon: <HighlightEmoji>🥾</HighlightEmoji>,
      title: t('experience.detail.know.activityLevel'),
      subtitle: t('experience.activity.light'),
    })
  } else if (experience.activityLevel === 'moderate') {
    rows.push({
      icon: <HighlightEmoji>🥾</HighlightEmoji>,
      title: t('experience.detail.know.activityLevel'),
      subtitle: t('experience.activity.moderate'),
    })
  } else if (experience.activityLevel === 'strenuous') {
    rows.push({
      icon: <HighlightEmoji>🥾</HighlightEmoji>,
      title: t('experience.detail.know.activityLevel'),
      subtitle: t('experience.activity.strenuous'),
    })
  }

  return (
    <ul className="mt-8 grid gap-5 border-t border-[var(--line)] pt-6">
      {rows.map((row) => (
        <li key={row.title} className="grid grid-cols-[2.75rem_1fr] items-start gap-4">
          <span className="flex size-11 items-center justify-center" aria-hidden="true">
            {row.icon}
          </span>
          <div className="min-w-0 pt-0.5">
            <p className="text-[0.9375rem] font-bold">{row.title}</p>
            {row.subtitle && (
              <p className="mt-0.5 text-sm leading-snug text-fg-muted" lang={row.subtitleLang}>
                {row.subtitle}
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}

function HighlightEmoji({ children }: { children: string }) {
  return (
    <span className="flex size-11 items-center justify-center rounded-[1rem] bg-[color-mix(in_oklch,var(--fg)_6%,transparent)] text-[1.35rem] leading-none">
      {children}
    </span>
  )
}
