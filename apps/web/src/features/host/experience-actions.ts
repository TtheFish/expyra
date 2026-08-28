'use server'

import { revalidatePath } from 'next/cache'
import { RedirectType, redirect } from 'next/navigation'
import { ApiError } from '@/features/auth/api'
import { RETURN_TO_PARAM } from '@/features/auth/return-to'
import { getSession } from '@/features/auth/session'
import type { SimpleMessageKey, Translate } from '@/features/i18n/dictionary'
import { UI_LANGUAGE_FIELD, uiLocaleOf, type UiLocale } from '@/features/i18n/locale'
import { getTranslator } from '@/features/i18n/translator'
import { resolveCity } from '@/features/places/api'
import { path } from '@/lib/routes'
import {
  ADULT_PRICE_FIELD,
  BLACKOUT_END_FIELD,
  BLACKOUT_ID_FIELD,
  BLACKOUT_START_FIELD,
  CAPACITY_FIELD,
  CATEGORY_FIELD,
  CHILD_PRICE_FIELD,
  CURRENCY_FIELD,
  CITY_FIELD,
  DESCRIPTION_FIELD,
  DURATION_FIELD,
  EXPERIENCE_ID_FIELD,
  INFANT_PRICE_FIELD,
  RECURRENCE_DAY_FIELD,
  RECURRENCE_ID_FIELD,
  RECURRENCE_START_FIELD,
  RECURRENCE_TIME_FIELD,
  SECTION_FIELD,
  SLOT_ID_FIELD,
  SLOT_STATUS_FIELD,
  isValidIsoDate,
  isValidTimeOfDay,
  parseMinorAmount,
  SPOKEN_LANGUAGE_FIELD,
  TAGS_FIELD,
  TEXT_LANGUAGE_FIELD,
  TITLE_FIELD,
  type ExperienceSection,
} from './experience-fields'
import {
  HostExperienceAccessError,
  archiveExperience,
  confirmMedia,
  createExperience,
  createMediaUpload,
  deleteMedia,
  createBlackout,
  createRecurrence,
  deleteBlackout,
  fetchCurrencies,
  fetchHostExperience,
  hostExperiencePath,
  publishExperience,
  reorderMedia,
  requirementMessageKey,
  setExperienceTranslation,
  setMediaCover,
  setPricing,
  setSlotStatus,
  stopRecurrence,
  updateExperience,
  type HostExperiencePatch,
  type MediaUpload,
} from './experiences-api'

/**
 * Deneyim sihirbazının sunucu eylemleri.
 *
 * `useActionState` sözleşmesi giriş ve hesap akışlarıyla aynı: eylem HAZIR METİN
 * döner, anahtar değil. Hangi API hatasının hangi cümleye karşılık geldiği bir
 * sunucu bilgisi ve burada kalıyor (`features/auth/actions.ts` kararı).
 *
 * **Metnin dili formdan geliyor** (`arayuz-dili`), çünkü sunucu eylemi hangi
 * sayfadan çağrıldığını bilmiyor: `params` yalnız render sırasında var ve
 * `expyra_lang` çerezi İÇERİK dili tercihini tutuyor (`ja` olabilir). Değer
 * `uiLocaleOf` ile kapalı kümeye daraltılıyor.
 *
 * ## Formda kimlik yok, kaynak kimliği var
 *
 * Hiçbir formda kullanıcı/host kimliği alanı YOK (CLAUDE.md #3): API rolü ve
 * sahipliği token'ın `sub`'undan çözüyor. Formlarda taşınan `deneyim` alanı bir
 * KAYNAK kimliği — başkasının ilanının id'si yazılsa bile API 404 dönüyor (403
 * değil, enumeration olmasın diye) ve o 404 aşağıda "bulunamadı"ya çevriliyor.
 *
 * ## Bölüm bölüm kaydetme
 *
 * Düzenleme ekranı tek bir dev form değil; her bölüm kendi formu ve kendi
 * `PATCH`'i. Bunu mümkün kılan şey ucun gerçek bir delta olması: verilmeyen alan
 * DEĞİŞMİYOR. Tek form olsaydı, "kapasiteyi düzelt" niyetiyle gönderilen istek
 * şehir alanını da taşımak zorunda kalır ve seçici boş bırakıldığında şehri
 * sessizce silerdi.
 */

/**
 * Bir bölüm formunun cevabı. Hesap formundaki `ProfileFormState` ile aynı şekil ve
 * aynı gerekçe: burada başarı da GÖRÜNÜR bir sonuç — kullanıcı aynı sayfada
 * kalıyor ve "kaydedildi mi" sorusunun cevabını görmek zorunda.
 *
 * `at` sunucu saatinden: aynı hata ikinci kez döndüğünde de yeni bir durum olsun.
 */
export type ExperienceFormState = {
  error: string | null
  success: string | null
  at: number
}

/**
 * Yeni taslak. Tek alan: ilanın yazılacağı dil.
 *
 * Başlık burada SORULMUYOR ve bu bilinçli: `POST` yalnız `originalLanguage`
 * kabul ediyor, başlık ayrı bir uca (`PUT .../translations/{lang}`) gidiyor. İkisini
 * tek eylemde zincirlemek, ilki başarılı ikincisi başarısız olduğunda ekranda
 * hata gösterirken sunucuda adsız bir taslak bırakırdı — kullanıcı "kaydedilmedi"
 * sanıp yeniden denediğinde ikinci taslak doğardı. Başlık, düzenleme ekranının
 * ilk bölümünde ve orada zaten çeviri sekmelerinin bir parçası.
 */
export async function createExperienceAction(
  _previous: ExperienceFormState,
  formData: FormData,
): Promise<ExperienceFormState> {
  const lang = uiLocaleOf(formData.get(UI_LANGUAGE_FIELD))
  const t = await getTranslator(lang)
  const here = path(lang, 'hostExperienceNew')

  const accessToken = await requireAccessToken()
  if (!accessToken) {
    redirect(signInHref(lang, here), RedirectType.replace)
  }

  const language = readField(formData, TEXT_LANGUAGE_FIELD)
  if (!language) {
    return fail(t, 'host.experience.error.language')
  }

  let createdId: string | null = null
  let access: HostExperienceAccessError | null = null

  try {
    const created = await createExperience(accessToken, language)
    createdId = created.id
  } catch (error) {
    if (error instanceof HostExperienceAccessError) {
      access = error
    } else if (error instanceof ApiError && error.status === 400) {
      // Tek 400 kaynağı dil alanı: ya biçim bozuk ya da o dilde içerik girişi kapalı.
      return fail(t, 'host.experience.error.language')
    } else {
      // Bilinmeyen hata YUTULMAZ (CLAUDE.md #1).
      throw error
    }
  }

  // `redirect` NEXT_REDIRECT fırlatıyor: `try` bloğunun DIŞINDA olmak zorunda,
  // aksi halde kendi catch'imiz yönlendirmeyi yutar.
  if (access) {
    redirect(accessHref(lang, access, here), RedirectType.replace)
  }

  if (!createdId) {
    // Buraya gelinemez: yukarıdaki dallardan biri ya döner ya yönlendirir. Sessiz
    // bir `return` yerine gürültülü patlama — kullanıcıya boş bir form göstermek
    // kaydın olup olmadığını belirsiz bırakırdı.
    throw new Error('host.experience.create: kimlik dönmedi.')
  }

  // Panel ilan sayısını gösteriyor; yalnız bu yolu tazelemek listeyi bayat bırakırdı.
  revalidatePath('/', 'layout')

  // `push`: kullanıcı geri tuşuyla "yeni deneyim" ekranına dönebilmeli — taslak
  // zaten açıldı, ikinci kez göndermesi ikinci bir taslak açardı ama bu onun
  // bilinçli kararı olur; `replace` ile geçmişi silmek gezinmeyi tuhaflaştırırdı.
  redirect(hostExperiencePath(lang, createdId), RedirectType.push)
}

/**
 * Dil-bağımsız alanlar. Hangi alanların gönderildiğini `bolum` işareti söylüyor;
 * gövdeye yalnız o alanlar yazılıyor, gerisi `undefined` kalıyor ve JSON'a hiç
 * girmiyor — yani sunucuda "dokunma" olarak okunuyor.
 */
export async function updateExperienceAction(
  _previous: ExperienceFormState,
  formData: FormData,
): Promise<ExperienceFormState> {
  const lang = uiLocaleOf(formData.get(UI_LANGUAGE_FIELD))
  const t = await getTranslator(lang)

  const experienceId = readField(formData, EXPERIENCE_ID_FIELD)
  if (!experienceId) {
    return fail(t, 'host.experience.error.notFound')
  }

  const here = hostExperiencePath(lang, experienceId)

  const accessToken = await requireAccessToken()
  if (!accessToken) {
    redirect(signInHref(lang, here), RedirectType.replace)
  }

  const section = sectionOf(formData.get(SECTION_FIELD))
  if (!section) {
    // İşareti olmayan form bir hata; sessizce "hiçbir şeyi güncelleme"ye çevirmek
    // kullanıcıya "kaydedildi" derdi (CLAUDE.md #1).
    console.error('host.experience.section.unknown', formData.get(SECTION_FIELD))
    return fail(t, 'host.experience.error.invalid')
  }

  let patch: HostExperiencePatch
  try {
    patch = await buildPatch(section, formData)
  } catch (error) {
    if (error instanceof SectionInputError) {
      return fail(t, error.messageKey)
    }
    throw error
  }

  let access: HostExperienceAccessError | null = null

  try {
    await updateExperience(accessToken, experienceId, patch)
  } catch (error) {
    if (error instanceof HostExperienceAccessError) {
      access = error
    } else {
      return writeFailure(t, error)
    }
  }

  if (access) {
    redirect(accessHref(lang, access, here), RedirectType.replace)
  }

  revalidatePath('/', 'layout')

  return succeed(t('host.experience.saved'))
}

/**
 * Bir dildeki başlık ve açıklama (upsert).
 *
 * `OriginalLanguage` zorunlu, diğer diller opsiyonel (docs/I18N.md §2) — ama bu
 * kural burada DEĞİL, yayın kapısında uygulanıyor. Bu uç her dil için aynı: host
 * isterse önce İngilizce yazıp Türkçe'yi sonra tamamlar.
 */
export async function setTranslationAction(
  _previous: ExperienceFormState,
  formData: FormData,
): Promise<ExperienceFormState> {
  const lang = uiLocaleOf(formData.get(UI_LANGUAGE_FIELD))
  const t = await getTranslator(lang)

  const experienceId = readField(formData, EXPERIENCE_ID_FIELD)
  if (!experienceId) {
    return fail(t, 'host.experience.error.notFound')
  }

  const here = hostExperiencePath(lang, experienceId)

  const accessToken = await requireAccessToken()
  if (!accessToken) {
    redirect(signInHref(lang, here), RedirectType.replace)
  }

  const textLanguage = readField(formData, TEXT_LANGUAGE_FIELD)
  if (!textLanguage) {
    return fail(t, 'host.experience.error.language')
  }

  const title = readField(formData, TITLE_FIELD)
  if (!title) {
    return fail(t, 'host.experience.error.title')
  }

  let access: HostExperienceAccessError | null = null

  try {
    await setExperienceTranslation(accessToken, experienceId, textLanguage, {
      title,
      // Açıklama İSTEĞE BAĞLI (validator da öyle): boş gönderim satırı silmiyor,
      // yalnız açıklamayı boşaltıyor.
      description: readField(formData, DESCRIPTION_FIELD),
    })
  } catch (error) {
    if (error instanceof HostExperienceAccessError) {
      access = error
    } else {
      return writeFailure(t, error)
    }
  }

  if (access) {
    redirect(accessHref(lang, access, here), RedirectType.replace)
  }

  revalidatePath('/', 'layout')

  return succeed(t('host.experience.saved'))
}

/**
 * Yayına alır.
 *
 * **Doğrulama sunucuda ve düğme kapatılmıyor.** Eksik ilanda "Yayınla" düğmesini
 * `disabled` yapmak akla yakın ama iki şeyi bozuyor: devre dışı bir düğme odak
 * almadığı için ekran okuyucu kullanıcısı NEDEN kapalı olduğunu okuyamıyor, ve
 * arayüzün kendi hesabı sunucununkinden ayrılabiliyor. Bunun yerine düğme hep
 * açık, kural tek yerde (sunucu), ve 409 geldiğinde eksikler `role="alert"`
 * içinde duyuruluyor. Sayfa ayrıca eksikleri baştan bir kontrol listesi olarak
 * gösteriyor — yani düğmeye basmadan da görülüyorlar.
 *
 * **Eksik listesi 409'un GÖVDESİNDEN okunmuyor.** API'nin ProblemDetails başlığı
 * Türkçe bir cümle ("eksik alanlar: translation, city") ve iki nedenle
 * ayrıştırılmıyor: kullanıcının dili Türkçe olmak zorunda değil, ve bir cümlenin
 * biçimi sözleşme değildir. Bunun yerine ilan yeniden okunuyor ve makine okunur
 * `missingPublishRequirements` alanı sözlüğe eşleniyor — aynı alan sayfadaki
 * kontrol listesini de besliyor, yani ekranda yazan ile sunucunun reddettiği
 * ayrışamıyor.
 */
export async function publishExperienceAction(
  _previous: ExperienceFormState,
  formData: FormData,
): Promise<ExperienceFormState> {
  const lang = uiLocaleOf(formData.get(UI_LANGUAGE_FIELD))
  const t = await getTranslator(lang)

  const experienceId = readField(formData, EXPERIENCE_ID_FIELD)
  if (!experienceId) {
    return fail(t, 'host.experience.error.notFound')
  }

  const here = hostExperiencePath(lang, experienceId)

  const accessToken = await requireAccessToken()
  if (!accessToken) {
    redirect(signInHref(lang, here), RedirectType.replace)
  }

  let access: HostExperienceAccessError | null = null
  let blocked = false

  try {
    await publishExperience(accessToken, experienceId)
  } catch (error) {
    if (error instanceof HostExperienceAccessError) {
      access = error
    } else if (error instanceof ApiError && error.status === 409) {
      blocked = true
    } else {
      return writeFailure(t, error)
    }
  }

  if (access) {
    redirect(accessHref(lang, access, here), RedirectType.replace)
  }

  if (blocked) {
    const message = await blockedMessage(t, lang, accessToken, experienceId)
    return { error: message, success: null, at: Date.now() }
  }

  revalidatePath('/', 'layout')

  return succeed(t('host.experience.published'))
}

/**
 * Raftan indirir. Doğrulama istemiyor ve idempotent — eksik bir taslak da
 * arşivlenebiliyor, çünkü arşiv bir silme değil "şu an görünmesin". Geri dönüşü
 * de var: yayın ucu arşivden yeniden yayına alıyor.
 */
export async function archiveExperienceAction(
  _previous: ExperienceFormState,
  formData: FormData,
): Promise<ExperienceFormState> {
  const lang = uiLocaleOf(formData.get(UI_LANGUAGE_FIELD))
  const t = await getTranslator(lang)

  const experienceId = readField(formData, EXPERIENCE_ID_FIELD)
  if (!experienceId) {
    return fail(t, 'host.experience.error.notFound')
  }

  const here = hostExperiencePath(lang, experienceId)

  const accessToken = await requireAccessToken()
  if (!accessToken) {
    redirect(signInHref(lang, here), RedirectType.replace)
  }

  let access: HostExperienceAccessError | null = null

  try {
    await archiveExperience(accessToken, experienceId)
  } catch (error) {
    if (error instanceof HostExperienceAccessError) {
      access = error
    } else {
      return writeFailure(t, error)
    }
  }

  if (access) {
    redirect(accessHref(lang, access, here), RedirectType.replace)
  }

  revalidatePath('/', 'layout')

  return succeed(t('host.experience.archived'))
}

// --- Yardımcılar -------------------------------------------------------------

/** Alan bazlı girdi hatası; mesajı eylem gövdesinde kullanıcının diline çevriliyor. */
class SectionInputError extends Error {
  readonly messageKey: SimpleMessageKey

  constructor(messageKey: SimpleMessageKey) {
    super(messageKey)
    this.name = 'SectionInputError'
    this.messageKey = messageKey
  }
}

/**
 * Bölümün alanlarını `PATCH` gövdesine çevirir.
 *
 * Skalerlerde **boş alan "dokunma" demek**: taslakta süre henüz girilmemişse
 * (`0`) input boş geliyor ve boş bir gönderim sunucuya 0 yazmaya çalışırdı —
 * doğrulama onu reddederdi. Boşu hiç göndermemek, "bu adımı sonra tamamlarım"
 * niyetini doğru karşılıyor.
 *
 * Koleksiyonlarda tam tersi: boş küme **gönderiliyor** ve "hepsini kaldır"
 * demek. İkisi arasındaki farkın kaynağı sunucunun sözleşmesi (`null` dokunma,
 * `[]` boşalt), arayüzün tercihi değil.
 */
async function buildPatch(
  section: ExperienceSection,
  formData: FormData,
): Promise<HostExperiencePatch> {
  if (section === 'temel') {
    return {
      durationMinutes: readCount(formData, DURATION_FIELD, 'host.experience.error.duration'),
      capacity: readCount(formData, CAPACITY_FIELD, 'host.experience.error.capacity'),
    }
  }

  if (section === 'sehir') {
    const key = readField(formData, CITY_FIELD)

    // Seçici doldurulmadan gönderildi. Sessizce geçmek "kaydedildi" derdi.
    if (!key) throw new SectionInputError('host.experience.error.city')

    /*
      Doğal anahtar (`cz-prague`) → uuid. Çevirme İSTEMCİDE yapılamıyor: seçicinin
      autocomplete ucu uuid taşımıyor (bilinçli — her tuş vuruşunda gereksiz veri).
      Bulunamayan anahtar burada duruyor: API'ye uydurma bir uuid göndermek 400
      üretir ve kullanıcı "şehri listeden seç" yerine genel bir hata görürdü.
    */
    const city = await resolveCity(key)
    if (!city) throw new SectionInputError('host.experience.error.city')

    // Saat dilimi GÖNDERİLMİYOR: sunucu onu seçilen şehirden türetiyor. İstemciden
    // alınsaydı gezginin tarayıcı saati Prag'daki bir turun saatini tanımlardı.
    return { cityId: city.id }
  }

  if (section === 'kategori') {
    const slug = readField(formData, CATEGORY_FIELD)
    if (!slug) throw new SectionInputError('host.experience.error.category')

    return { categorySlug: slug }
  }

  return {
    // `getAll` sırayı koruyor; tekrar eden değeri sunucu zaten teke indiriyor.
    spokenLanguages: readList(formData, SPOKEN_LANGUAGE_FIELD),
    tags: readTags(formData),
  }
}

const SECTIONS: readonly string[] = ['temel', 'sehir', 'kategori', 'listeler']

function sectionOf(value: unknown): ExperienceSection | null {
  return typeof value === 'string' && SECTIONS.includes(value)
    ? (value as ExperienceSection)
    : null
}

/**
 * Boş alan `undefined` (dokunma); dolu ama sayı olmayan alan HATA.
 *
 * "Sayı değilse yok say" demek, `abc` yazan kullanıcıya "kaydedildi" demek olurdu.
 * Üst sınır kontrolü YOK ve olmayacak: tavanlar Domain'de (`Experience.MaxCapacity`,
 * `MaxDurationMinutes`) ve burada kopyalanırsa bir gün ayrışırlar — sunucu 400
 * döndüğünde alanın kendi hata metni zaten gösteriliyor.
 *
 * **Kapasitede 0'ı sunucu kabul ediyor, arayüz etmiyor** ve bu bir ayrışma değil:
 * sunucuda 0 "taslakta henüz karar vermedim" demek ve alan zaten 0'dan doğuyor.
 * Formda 0 yazmak ile alanı boş bırakmak aynı niyet — ikisini ayrı iki yol yapmak,
 * kullanıcıya hiçbir farkı olmayan bir seçim sundurmak olurdu.
 */
function readCount(
  formData: FormData,
  field: string,
  messageKey: SimpleMessageKey,
): number | undefined {
  const raw = readField(formData, field)
  if (raw === null) return undefined

  const value = Number(raw)
  if (!Number.isInteger(value) || value <= 0) {
    throw new SectionInputError(messageKey)
  }

  return value
}

function readList(formData: FormData, field: string): string[] {
  return formData
    .getAll(field)
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
}

/**
 * Etiketler tek bir metin alanından geliyor, virgülle ayrılmış.
 *
 * Ayrı ayrı input yerine tek alan: etiket sayısı değişken ve satır ekleyip çıkaran
 * bir kontrol JS kapalıyken çalışmaz. Etiketin İÇİNDE virgül olması ("tarih, sanat"
 * tek etiket) desteklenmiyor ve bu kayıp bilinçli — etiket bir sözcük öbeği,
 * cümle değil.
 */
function readTags(formData: FormData): string[] {
  const raw = formData.get(TAGS_FIELD)
  if (typeof raw !== 'string') return []

  return raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
}

/**
 * Yayın reddinin gerekçesi. İlan yeniden okunuyor: 409'un gövdesi bir cümle,
 * `missingPublishRequirements` ise sözleşme.
 *
 * Yeniden okuma başarısız olursa (ya da eksik listesi bir yarış yüzünden boş
 * gelirse) genel bir cümleye düşülüyor — hatayı yutmak değil, ikinci bir hatayı
 * birincinin üzerine yığmamak: kullanıcının o an çözmesi gereken şey yayın
 * reddi, listeyi okuyamamamız değil. Okuma hatası `console.error` ile görünür.
 */
async function blockedMessage(
  t: Translate,
  lang: UiLocale,
  accessToken: string,
  experienceId: string,
): Promise<string> {
  let codes: string[] = []

  try {
    const current = await fetchHostExperience(accessToken, experienceId)
    codes = current?.missingPublishRequirements ?? []
  } catch (error) {
    console.error('host.experience.publish.missingLookupFailed', error)
  }

  if (codes.length === 0) {
    return t('host.experience.error.publishBlockedUnknown')
  }

  // Liste ayracı `Intl.ListFormat`'tan: "a, b ve c" (tr) ile "a, b and c" (en)
  // aynı veri, farklı dil. Elle ", " ile birleştirmek çeviriyi kodda dondururdu.
  const formatter = new Intl.ListFormat(lang, { style: 'long', type: 'conjunction' })
  const phrases = codes.map((code) => t(requirementMessageKey(code)))

  return t('host.experience.error.publishBlocked', { eksikler: formatter.format(phrases) })
}

/**
 * Yazma uçlarının ortak hata eşlemesi. Eşlenmeyen her şey YENİDEN FIRLATILIYOR
 * (CLAUDE.md #1): 500'ü "kaydedilemedi" diye göstermek gerçek arızayı kullanıcı
 * hatası gibi gösterir.
 */
function writeFailure(t: Translate, error: unknown): ExperienceFormState {
  if (error instanceof ApiError) {
    if (error.status === 404) {
      return fail(t, 'host.experience.error.notFound')
    }

    if (error.status === 409) {
      // İki 409 kaynağı var ve ikisi de aynı cevabı gerektiriyor: yayınlanmış bir
      // ilanın şehri değiştirilemiyor, ve yayındaki bir ilan yayın koşullarını
      // ihlal edecek şekilde kaydedilemiyor. Her ikisinin de çözümü önce arşivlemek.
      return fail(t, 'host.experience.error.publishedConflict')
    }

    if (error.status === 400) {
      return fail(t, fieldErrorKey(error))
    }
  }

  throw error
}

/**
 * 400'ün iki şekli var: `ValidationProblemDetails` (alan adı `errors` sözlüğünde)
 * ve düz `ProblemDetails` (kayıt defterinde olmayan şehir/kategori/dil). İkincisi
 * alan adı taşımıyor, o yüzden genel cümleye düşüyor.
 *
 * Mesajların kendisi kullanıcıya gösterilmiyor; değerli olan ANAHTAR — hangi
 * alanın reddedildiğini söylüyor (`ApiError.hasFieldError` kalıbı).
 */
function fieldErrorKey(error: ApiError): SimpleMessageKey {
  if (error.hasFieldError('durationMinutes')) return 'host.experience.error.duration'
  if (error.hasFieldError('capacity')) return 'host.experience.error.capacity'
  if (error.hasFieldError('categorySlug')) return 'host.experience.error.category'
  if (error.hasFieldError('spokenLanguages')) return 'host.experience.error.spokenLanguages'
  if (error.hasFieldError('tags')) return 'host.experience.error.tags'
  if (error.hasFieldError('title')) return 'host.experience.error.title'
  if (error.hasFieldError('description')) return 'host.experience.error.description'
  if (error.hasFieldError('language')) return 'host.experience.error.language'

  return 'host.experience.error.invalid'
}

/**
 * Oturum çerezi. `null` dönerse çağıran GİRİŞ ekranına yönlendiriyor — hata
 * kutusunda "giriş yapmalısın" yazmak, kullanıcıyı yapabileceği tek şeyin bir
 * tık uzağında bırakmadan bilgilendirmek olurdu.
 */
async function requireAccessToken(): Promise<string | null> {
  const session = await getSession()
  return session?.accessToken ?? null
}

/**
 * Erişim hatasının varış noktası:
 * - `signedOut` → giriş, dönüş adresiyle.
 * - `notHost` → "Host ol" ekranı. Rolü olmayan kullanıcıya hata göstermek yerine
 *   rolü kazanacağı yere göndermek, tek tıkla çözülebilen bir durumu tek tık
 *   yapıyor; o ekran ayrıca taze token yazıyor (rol claim'i eski token'da yok).
 */
function accessHref(lang: UiLocale, error: HostExperienceAccessError, returnTo: string): string {
  return error.reason === 'signedOut' ? signInHref(lang, returnTo) : path(lang, 'becomeHost')
}

function signInHref(lang: UiLocale, returnTo: string): string {
  const query = new URLSearchParams({ [RETURN_TO_PARAM]: returnTo })
  return `${path(lang, 'signIn')}?${query.toString()}`
}

function succeed(message: string): ExperienceFormState {
  return { error: null, success: message, at: Date.now() }
}

function fail(t: Translate, key: SimpleMessageKey): ExperienceFormState {
  return { error: t(key), success: null, at: Date.now() }
}

function readField(formData: FormData, name: string): string | null {
  const value = formData.get(name)
  if (typeof value !== 'string') return null

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}


// ---------------------------------------------------------------------------
// Görseller
//
// Bu eylemler FORM eylemi DEĞİL: yükleyici bir istemci bileşeni ve onları
// doğrudan çağırıyor. Sebebi akışın ortasında tarayıcının kendisinin olması —
// dosyayı depoya PUT eden taraf tarayıcı ve o adım hiçbir sunucudan geçmiyor
// (PLAN Blok 6 kabul kriteri 1). Bir `<form>` bunu ifade edemezdi.
//
// Bu yüzden dönüş tipi de `ExperienceFormState` değil: `at` damgası aynı hatayı
// yeniden göstermek içindi, burada çağıran her seferinde yeni bir sonuç alıyor.
// ---------------------------------------------------------------------------

/** Yükleme izni ya da hata — ikisi birden asla. */
export type MediaUploadResult = { upload: MediaUpload; error: null } | { upload: null; error: string }

export type MediaActionResult = { error: string | null }

/**
 * İmzalı yükleme adresi ister. Bayt HENÜZ YOK: yalnız tip ve boyut beyan ediliyor
 * ve ikisi de imzaya giriyor, yani beyandan büyük bir gövde depo tarafından
 * reddediliyor.
 */
export async function requestMediaUploadAction(
  language: string,
  experienceId: string,
  contentType: string,
  byteSize: number,
): Promise<MediaUploadResult> {
  const lang = uiLocaleOf(language)
  const t = await getTranslator(lang)

  const accessToken = await requireAccessToken()
  if (!accessToken) {
    redirect(signInHref(lang, hostExperiencePath(lang, experienceId)), RedirectType.replace)
  }

  try {
    const upload = await createMediaUpload(accessToken, experienceId, { contentType, byteSize })
    return { upload, error: null }
  } catch (error) {
    return { upload: null, error: await mediaFailure(t, lang, experienceId, error) }
  }
}

/**
 * Yüklemeyi doğrular. Asıl kontrol SUNUCUDA ve baytlara bakıyor: "image/png" diye
 * bildirilmiş bir SVG burada 409 alıyor.
 */
export async function confirmMediaAction(
  language: string,
  experienceId: string,
  mediaId: string,
): Promise<MediaActionResult> {
  return runMediaAction(language, experienceId, (token) =>
    confirmMedia(token, experienceId, mediaId))
}

/** Kapağı bu görsele taşır. Kapağı boşaltan bir eylem YOK — daima tam bir tane var. */
export async function setMediaCoverAction(
  language: string,
  experienceId: string,
  mediaId: string,
): Promise<MediaActionResult> {
  return runMediaAction(language, experienceId, (token) =>
    setMediaCover(token, experienceId, mediaId))
}

/** Görseli siler; depodaki nesne de gider. Yayındaki ilanın SON görseli 409. */
export async function deleteMediaAction(
  language: string,
  experienceId: string,
  mediaId: string,
): Promise<MediaActionResult> {
  return runMediaAction(language, experienceId, (token) =>
    deleteMedia(token, experienceId, mediaId))
}

/** Sırayı TOPTAN yazar. Kısmi liste 409 — sunucu ile istemcinin sırası ayrışmasın. */
export async function reorderMediaAction(
  language: string,
  experienceId: string,
  mediaIds: string[],
): Promise<MediaActionResult> {
  return runMediaAction(language, experienceId, (token) =>
    reorderMedia(token, experienceId, mediaIds))
}

/**
 * Dört medya eyleminin ortak gövdesi: token al, çağır, sayfayı tazele.
 *
 * `revalidatePath` ŞART: yükleyici sunucudan gelen galeriyi çiziyor ve eksik
 * yayın koşulları rozeti de aynı yanıttan besleniyor. Tazelenmezse host, kapak
 * yüklediği hâlde "kapak görseli eksik" yazısını görmeye devam ederdi.
 */
async function runMediaAction(
  language: string,
  experienceId: string,
  call: (accessToken: string) => Promise<unknown>,
): Promise<MediaActionResult> {
  const lang = uiLocaleOf(language)
  const t = await getTranslator(lang)

  const accessToken = await requireAccessToken()
  if (!accessToken) {
    redirect(signInHref(lang, hostExperiencePath(lang, experienceId)), RedirectType.replace)
  }

  try {
    await call(accessToken)
  } catch (error) {
    return { error: await mediaFailure(t, lang, experienceId, error) }
  }

  revalidatePath('/', 'layout')

  return { error: null }
}

/**
 * Medya uçlarının hata eşlemesi. Yazma uçlarından AYRI çünkü 409'un anlamı burada
 * başka: orada "önce arşivle", burada "dosya kabul edilmedi" ya da "son görseli
 * silemezsin". Aynı cümleyi kullanmak host'a yanlış çözümü söylerdi.
 *
 * Eşlenmeyen her şey YENİDEN FIRLATILIYOR (CLAUDE.md #1).
 */
async function mediaFailure(
  t: Translate,
  lang: UiLocale,
  experienceId: string,
  error: unknown,
): Promise<string> {
  if (error instanceof HostExperienceAccessError) {
    redirect(accessHref(lang, error, hostExperiencePath(lang, experienceId)), RedirectType.replace)
  }

  if (error instanceof ApiError) {
    // Sunucunun MESAJI kullanılmıyor: Türkçe ve arayüz iki dilde. Dal seçimi
    // makine-okunur koda göre (`AppException.Code`), metin sözlükten.
    const byCode = error.code ? MEDIA_ERROR_KEYS[error.code] : undefined
    if (byCode) {
      return t(byCode)
    }

    // Kodu olmayan durumlar. 409 buraya yalnız kod eklenmemiş yeni bir çakışma
    // eklenirse düşer — genel cümle, sessizce yanlış cümleden iyi.
    if (error.status === 409) return t('host.media.error.rejected')
    if (error.status === 404) return t('host.experience.error.notFound')
    if (error.status === 400) return t('host.media.error.unsupported')
  }

  throw error
}

/**
 * Sunucu kodu → arayüz metni. Kodlar `Expyra.Application.Features.Media.MediaConflict`
 * sabitleriyle birebir; eşlenmeyen kod genel cümleye düşüyor, gizlenmiyor.
 */
const MEDIA_ERROR_KEYS: Record<string, SimpleMessageKey> = {
  'media-not-uploaded': 'host.media.error.notUploaded',
  'media-not-an-image': 'host.media.error.notAnImage',
  'media-content-type-mismatch': 'host.media.error.mismatch',
  'media-too-small': 'host.media.error.tooSmall',
  'media-too-large': 'host.media.error.tooLarge',
  'media-limit-reached': 'host.media.error.limit',
  'media-last-of-published': 'host.media.error.lastOfPublished',
}

// ---------------------------------------------------------------------------
// Fiyat (PLAN Blok 7)
// ---------------------------------------------------------------------------

/**
 * Fiyatı kaydeder.
 *
 * <b>`updateExperienceAction`'a bir `bolum` olarak EKLENMEDİ</b> ve sebebi
 * sözleşme: o eylem `PATCH /api/host/experiences/{id}` ucuna gidiyor ve gerçek
 * bir delta gönderiyor. Fiyat ise ayrı bir uca (`PUT .../pricing`) ve TAM
 * DEĞİŞTİRME ile gidiyor — gövdede olmayan kademe siliniyor. İki farklı
 * sözleşmeyi tek eylemin `buildPatch`'ine sıkıştırmak, "boş alan = dokunma" ile
 * "boş alan = sil" kurallarını aynı fonksiyonda yan yana koymak olurdu.
 *
 * `ExperienceFormState` aynı, yani `ExperienceForm` bileşeni değişmeden
 * çalışıyor.
 */
export async function updatePricingAction(
  _previous: ExperienceFormState,
  formData: FormData,
): Promise<ExperienceFormState> {
  const lang = uiLocaleOf(formData.get(UI_LANGUAGE_FIELD))
  const t = await getTranslator(lang)

  const experienceId = readField(formData, EXPERIENCE_ID_FIELD)
  if (!experienceId) {
    return fail(t, 'host.experience.error.notFound')
  }

  const here = hostExperiencePath(lang, experienceId)

  const accessToken = await requireAccessToken()
  if (!accessToken) {
    redirect(signInHref(lang, here), RedirectType.replace)
  }

  const currency = readField(formData, CURRENCY_FIELD)
  if (!currency) {
    return fail(t, 'host.pricing.error.currency')
  }

  // Üs KAYIT DEFTERİNDEN, istemciden değil: form "2 ondalık" varsayarsa JPY'de
  // 100 kat, KWD'de 10 kat yanlış tutar kaydedilir ve hiçbir yerde hata vermez.
  let minorUnits: number
  try {
    const currencies = await fetchCurrencies()
    const match = currencies.find((item) => item.code === currency)

    if (!match) return fail(t, 'host.pricing.error.currency')

    minorUnits = match.minorUnits
  } catch (error) {
    if (error instanceof HostExperienceAccessError) {
      redirect(accessHref(lang, error, here), RedirectType.replace)
    }
    throw error
  }

  const rules: { guestType: string; unitAmountMinor: number }[] = []

  // Yetişkin ZORUNLU: kartta ve listede gösterilen "kişi başı" tutar o ve
  // sunucu da onsuz kabul etmiyor. Diğer ikisi boş bırakılabilir — boş "bu
  // kademe sunulmuyor" demek, "bedava" değil (bedava = 0 yazmak).
  const adult = parseMinorAmount(formData.get(ADULT_PRICE_FIELD)?.toString() ?? '', minorUnits)
  if (adult === null) {
    return fail(t, 'host.pricing.error.adult')
  }

  rules.push({ guestType: 'adult', unitAmountMinor: adult })

  for (const [field, guestType, errorKey] of [
    [CHILD_PRICE_FIELD, 'child', 'host.pricing.error.child'],
    [INFANT_PRICE_FIELD, 'infant', 'host.pricing.error.infant'],
  ] as const) {
    const raw = formData.get(field)?.toString().trim() ?? ''
    if (raw.length === 0) continue

    const amount = parseMinorAmount(raw, minorUnits)
    if (amount === null) {
      return fail(t, errorKey)
    }

    rules.push({ guestType, unitAmountMinor: amount })
  }

  let access: HostExperienceAccessError | null = null

  try {
    await setPricing(accessToken, experienceId, { currency, rules })
  } catch (error) {
    if (error instanceof HostExperienceAccessError) {
      access = error
    } else {
      return pricingFailure(t, error)
    }
  }

  if (access) {
    redirect(accessHref(lang, access, here), RedirectType.replace)
  }

  revalidatePath('/', 'layout')

  return succeed(t('host.pricing.saved'))
}

/**
 * Fiyat ucunun hatalarını ekrana çevirir.
 *
 * <c>writeFailure</c>'dan AYRI çünkü 409'un anlamı farklı: orada "yayındaki ilan
 * bu alanı kaybedemez", burada "para birimi kilitli". İkisine aynı cümleyi
 * göstermek host'u yanlış çözüme (alanı doldurmaya) yönlendirirdi.
 */
function pricingFailure(t: Translate, error: unknown): ExperienceFormState {
  if (error instanceof ApiError) {
    if (error.status === 404) return fail(t, 'host.experience.error.notFound')

    // Tek 409 kaynağı para birimi kilidi; çözümü arşivlemek.
    if (error.status === 409) return fail(t, 'host.pricing.error.currencyLocked')

    // 400: ödeme sağlayıcısının alt/üst sınırı ya da gövde doğrulaması. Sunucunun
    // cümlesi GÖSTERİLMİYOR (dili kullanıcının dili olmak zorunda değil); sınırın
    // sayısal değeri de gösterilmiyor çünkü para birimine göre değişiyor ve
    // arayüzde bir tablo tutmak ikinci bir doğruluk kaynağı olurdu.
    if (error.status === 400) return fail(t, 'host.pricing.error.range')
  }

  throw error
}

// ---------------------------------------------------------------------------
// Takvim (PLAN Blok 7)
// ---------------------------------------------------------------------------
//
// Beş küçük eylem, tek büyük eylem DEĞİL. Hepsi farklı uca gidiyor ve farklı
// hata dallarına sahip: kural çakışması 409 "aynı gün ve saatte zaten kural
// var" derken, seans kapatma 409'u "geçmiş seans değiştirilemez" diyor. Tek
// eylemde toplansalardı ekran ikisine de aynı cümleyi gösterirdi.

/**
 * Takvim uçlarının ortak iskeleti: dil → çevirmen → ilan kimliği → token.
 *
 * Beş eylemin ilk on satırı birebir aynıydı; kopyalanan bir `redirect` unutmak
 * oturumu düşmüş host'a boş bir hata göstermek demekti.
 */
async function scheduleContext(formData: FormData): Promise<
  | { ok: true; lang: UiLocale; t: Translate; experienceId: string; accessToken: string; here: string }
  | { ok: false; state: ExperienceFormState }
> {
  const lang = uiLocaleOf(formData.get(UI_LANGUAGE_FIELD))
  const t = await getTranslator(lang)

  const experienceId = readField(formData, EXPERIENCE_ID_FIELD)
  if (!experienceId) {
    return { ok: false, state: fail(t, 'host.experience.error.notFound') }
  }

  const here = hostExperiencePath(lang, experienceId)
  const accessToken = await requireAccessToken()

  if (!accessToken) {
    redirect(signInHref(lang, here), RedirectType.replace)
  }

  return { ok: true, lang, t, experienceId, accessToken, here }
}

/**
 * Takvim uçlarının hatalarını ekrana çevirir.
 *
 * 409'un METNİ burada seçilemiyor çünkü tek bir uçta birden çok sebep var
 * (çakışan kural, kapalı aralık, geçmiş seans, satılmış koltuk). Sunucu
 * makine-okunur bir kod gönderiyor (`AppException.Code`) ve dal ona bakıyor —
 * ProblemDetails'in Türkçe cümlesine değil, çünkü o cümlenin dili kullanıcının
 * dili olmak zorunda değil.
 */
function scheduleFailure(t: Translate, error: unknown): ExperienceFormState {
  if (error instanceof ApiError) {
    if (error.status === 404) return fail(t, 'host.experience.error.notFound')

    if (error.status === 409 || error.status === 400) {
      return fail(t, scheduleConflictKey(error.code))
    }
  }

  throw error
}

function scheduleConflictKey(code: string | null): SimpleMessageKey {
  switch (code) {
    case 'schedule-not-schedulable':
      return 'host.schedule.error.notSchedulable'
    case 'recurrence-duplicate':
      return 'host.schedule.error.duplicateRule'
    case 'recurrence-limit':
      return 'host.schedule.error.ruleLimit'
    case 'slot-dst-gap':
      return 'host.schedule.error.dstGap'
    case 'slot-in-past':
      return 'host.schedule.error.past'
    case 'slot-exists':
      return 'host.schedule.error.slotExists'
    case 'slot-blacked-out':
      return 'host.schedule.error.blackedOut'
    case 'slot-generated':
      return 'host.schedule.error.generated'
    case 'slot-has-bookings':
      return 'host.schedule.error.hasBookings'
    case 'blackout-limit':
      return 'host.schedule.error.blackoutLimit'
    case 'schedule-horizon-too-far':
      return 'host.schedule.error.horizon'
    default:
      // Bilinmeyen kod GİZLENMİYOR: log'a düşüyor ki yeni bir sunucu kodu
      // eklendiğinde ekranda genel bir cümle görüp sebebini arayan olmasın.
      if (code) console.error('host.schedule.unknownCode', code)
      return 'host.schedule.error.generic'
  }
}

/** Haftalık kural açar; sunucu aynı istekte ufka kadar seans üretiyor. */
export async function createRecurrenceAction(
  _previous: ExperienceFormState,
  formData: FormData,
): Promise<ExperienceFormState> {
  const context = await scheduleContext(formData)
  if (!context.ok) return context.state

  const { t, experienceId, accessToken, lang, here } = context

  const days = formData
    .getAll(RECURRENCE_DAY_FIELD)
    .filter((value): value is string => typeof value === 'string')

  if (days.length === 0) {
    return fail(t, 'host.schedule.error.noDay')
  }

  const time = readField(formData, RECURRENCE_TIME_FIELD) ?? ''
  if (!isValidTimeOfDay(time)) {
    return fail(t, 'host.schedule.error.time')
  }

  // Başlangıç tarihi boşsa BUGÜN: host "her salı" derken çoğu zaman "bu haftadan
  // itibaren" demek istiyor ve zorunlu bir tarih alanı gereksiz bir adım olurdu.
  const start = readField(formData, RECURRENCE_START_FIELD)
  if (start !== null && !isValidIsoDate(start)) {
    return fail(t, 'host.schedule.error.date')
  }

  let access: HostExperienceAccessError | null = null

  try {
    await createRecurrence(accessToken, experienceId, {
      daysOfWeek: days,
      startTimeLocal: time,
      startsOnLocal: start ?? todayIso(),
    })
  } catch (error) {
    if (error instanceof HostExperienceAccessError) {
      access = error
    } else {
      return scheduleFailure(t, error)
    }
  }

  if (access) redirect(accessHref(lang, access, here), RedirectType.replace)

  revalidatePath('/', 'layout')

  return succeed(t('host.schedule.ruleSaved'))
}

/** Kuralı durdurur; ondan doğmuş gelecek seanslar kapanıyor. */
export async function stopRecurrenceAction(
  _previous: ExperienceFormState,
  formData: FormData,
): Promise<ExperienceFormState> {
  const context = await scheduleContext(formData)
  if (!context.ok) return context.state

  const { t, experienceId, accessToken, lang, here } = context

  const recurrenceId = readField(formData, RECURRENCE_ID_FIELD)
  if (!recurrenceId) return fail(t, 'host.schedule.error.generic')

  let access: HostExperienceAccessError | null = null

  try {
    await stopRecurrence(accessToken, experienceId, recurrenceId)
  } catch (error) {
    if (error instanceof HostExperienceAccessError) {
      access = error
    } else {
      return scheduleFailure(t, error)
    }
  }

  if (access) redirect(accessHref(lang, access, here), RedirectType.replace)

  revalidatePath('/', 'layout')

  return succeed(t('host.schedule.ruleStopped'))
}

/** Tek seansı açar ya da kapatır. */
export async function setSlotStatusAction(
  _previous: ExperienceFormState,
  formData: FormData,
): Promise<ExperienceFormState> {
  const context = await scheduleContext(formData)
  if (!context.ok) return context.state

  const { t, experienceId, accessToken, lang, here } = context

  const slotId = readField(formData, SLOT_ID_FIELD)
  const status = readField(formData, SLOT_STATUS_FIELD)

  if (!slotId || (status !== 'open' && status !== 'closed')) {
    return fail(t, 'host.schedule.error.generic')
  }

  let access: HostExperienceAccessError | null = null

  try {
    await setSlotStatus(accessToken, experienceId, slotId, status)
  } catch (error) {
    if (error instanceof HostExperienceAccessError) {
      access = error
    } else {
      return scheduleFailure(t, error)
    }
  }

  if (access) redirect(accessHref(lang, access, here), RedirectType.replace)

  revalidatePath('/', 'layout')

  return succeed(t(status === 'open' ? 'host.schedule.slotOpened' : 'host.schedule.slotClosed'))
}

/** "Şu tarihlerde yokum." Aralığa düşen açık ve satılmamış seanslar kapanıyor. */
export async function createBlackoutAction(
  _previous: ExperienceFormState,
  formData: FormData,
): Promise<ExperienceFormState> {
  const context = await scheduleContext(formData)
  if (!context.ok) return context.state

  const { t, experienceId, accessToken, lang, here } = context

  const start = readField(formData, BLACKOUT_START_FIELD) ?? ''
  // Bitiş boşsa TEK GÜN: "yarın yokum" en sık durum ve iki alan doldurtmak
  // gereksiz bir adım.
  const end = readField(formData, BLACKOUT_END_FIELD) ?? start

  if (!isValidIsoDate(start) || !isValidIsoDate(end)) {
    return fail(t, 'host.schedule.error.date')
  }

  if (end < start) {
    return fail(t, 'host.schedule.error.range')
  }

  let access: HostExperienceAccessError | null = null

  try {
    await createBlackout(accessToken, experienceId, { startsOnLocal: start, endsOnLocal: end })
  } catch (error) {
    if (error instanceof HostExperienceAccessError) {
      access = error
    } else {
      return scheduleFailure(t, error)
    }
  }

  if (access) redirect(accessHref(lang, access, here), RedirectType.replace)

  revalidatePath('/', 'layout')

  return succeed(t('host.schedule.blackoutSaved'))
}

/** Aralığı kaldırır; YALNIZ onun kapattığı seanslar geri açılıyor. */
export async function deleteBlackoutAction(
  _previous: ExperienceFormState,
  formData: FormData,
): Promise<ExperienceFormState> {
  const context = await scheduleContext(formData)
  if (!context.ok) return context.state

  const { t, experienceId, accessToken, lang, here } = context

  const blackoutId = readField(formData, BLACKOUT_ID_FIELD)
  if (!blackoutId) return fail(t, 'host.schedule.error.generic')

  let access: HostExperienceAccessError | null = null

  try {
    await deleteBlackout(accessToken, experienceId, blackoutId)
  } catch (error) {
    if (error instanceof HostExperienceAccessError) {
      access = error
    } else {
      return scheduleFailure(t, error)
    }
  }

  if (access) redirect(accessHref(lang, access, here), RedirectType.replace)

  revalidatePath('/', 'layout')

  return succeed(t('host.schedule.blackoutRemoved'))
}

/**
 * Bugünün ISO tarihi, SUNUCUNUN saat diliminde.
 *
 * Deneyimin saat diliminde değil ve bu bir kusur değil bilinçli bir eşik: bu
 * değer yalnız "başlangıç tarihi boş bırakıldı" durumunda kullanılıyor ve
 * sunucu üretimi zaten deneyimin saat dilimindeki bugünden başlatıyor. En kötü
 * ihtimalle bir gün erken bir başlangıç tarihi yazılıyor, o da üretimi
 * etkilemiyor.
 */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}
