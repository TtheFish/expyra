namespace Expyra.Domain.Experiences;

/// <summary>
/// Host'un deneyim SIRASINDA konuştuğu dil. Bileşik anahtar: (ExperienceId, Language).
///
/// <para><b>Neden ayrı tablo, <c>text[]</c> dizisi değil</b> (PLAN Blok 5'in açık kararı):
/// dizi sütununa <c>language.code</c> FK'sı konamaz. FK olmayınca "en" yerine "eng" yazan
/// bir satır sessizce kabul edilir ve Blok 8'in "İngilizce konuşulan deneyimler" filtresi
/// o ilanı sonuçtan eler — hata hiçbir yerde patlamaz, ilan yalnızca görünmez olur.
/// <c>app_user.roles</c> dizi olabiliyor çünkü orada kayıt defteri yok; burada var.</para>
///
/// <para><b>Çeviri diliyle KARIŞTIRILMAZ</b> (docs/I18N.md §3): ilan metninin dili
/// <see cref="ExperienceTranslation.Language"/>. İkisi aynı alana bindirilirse "İngilizce
/// konuşulan" filtresi, ilanı İngilizceye çevirmiş ama turu Çekçe anlatan host'u da
/// döndürür — gezgin için kritik olan tam da ikincisidir.</para>
/// </summary>
public sealed class ExperienceSpokenLanguage
{
    public Guid ExperienceId { get; set; }

    /// <summary>BCP-47, normalize. <c>language.code</c>'a FK.</summary>
    public required string Language { get; set; }
}
