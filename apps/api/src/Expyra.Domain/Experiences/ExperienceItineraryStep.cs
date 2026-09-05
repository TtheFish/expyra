namespace Expyra.Domain.Experiences;

/// <summary>
/// Programın bir adımı (Airbnb "What you'll do"): "Hipodrom'da başlıyoruz",
/// "Yeraltı Sarnıcı", "Kapalıçarşı".
///
/// <para><b>Dil, anahtarın parçası.</b> Adım metni içerik (host'un cümlesi), yani
/// docs/I18N.md §2'ye göre her dilde ayrı satır. Adım SAYISI diller arasında
/// eşleşmek zorunda değil — Çekçe listeyi kısaltıp İngilizce'yi uzun tutmak host'un
/// kararı. Misafir tarafı <see cref="ExperienceTextFallback"/> zinciriyle TEK dilin
/// listesini seçiyor; dilleri karıştırmıyor.</para>
///
/// <para><b>Sıra, kimlik.</b> Birincil anahtar (deneyim, dil, sıra): satırın ayrı bir
/// uuid'si yok çünkü liste her kayıtta TOPTAN yazılıyor (medya sıralamasıyla aynı
/// sözleşme) ve kısmi güncelleme ucu yok — tek tek satır adreslenmiyor.</para>
/// </summary>
public sealed class ExperienceItineraryStep
{
    public const int MaxTitleLength = 120;

    public const int MaxBodyLength = 600;

    /// <summary>
    /// Adım tavanı. 20 adımlık bir program artık bir "deneyim" değil, gezi
    /// kataloğudur; sınır liste sayfasının okunabilirliğini koruyor.
    /// </summary>
    public const int MaxSteps = 20;

    public Guid ExperienceId { get; set; }

    public required string Language { get; set; }

    /// <summary>0 tabanlı; listedeki konum. Boşluk bırakılmaz (0..n-1).</summary>
    public int SortOrder { get; set; }

    public required string Title { get; set; }

    public string? Body { get; set; }
}
