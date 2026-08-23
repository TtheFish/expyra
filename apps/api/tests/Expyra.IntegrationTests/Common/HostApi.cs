using System.Net;
using Shouldly;

namespace Expyra.IntegrationTests.Common;

/// <summary>
/// Host uçlarının test yardımcıları.
///
/// <para><c>MediaApi</c>'den ayrı çünkü orası adıyla görsel yükleme akışı; buradaki
/// tek iş "ilanı yayına hazır hâle getirmek" ve o iş her yeni yayın koşuluyla
/// büyüyor.</para>
/// </summary>
internal static class HostApi
{
    private const string BasePath = "/api/host/experiences";

    /// <summary>
    /// Yayın kapısını geçecek asgari fiyat: yalnız yetişkin kademesi.
    ///
    /// <para><b>Neden bu yardımcı var:</b> fiyat PLAN Blok 7'de yayın koşulu OLDU ve
    /// o gün yayın yapan on beş test birden kırıldı. Doğru düzeltme testleri
    /// gevşetmek değil, "yayına hazır ilan"ın tanımını güncellemekti — kapak koşulu
    /// eklendiğinde de aynı şey olmuştu (<c>CreatePublishableAsync</c> notu).</para>
    ///
    /// <para>Tutar EUR alt sınırının (50 minör birim) rahatça üstünde; testin
    /// ölçtüğü şey fiyatın kendisi değil, VARLIĞI.</para>
    /// </summary>
    internal static async Task SetMinimalPriceAsync(
        HttpClient client,
        string token,
        Guid experienceId,
        string currency = "EUR",
        long adultAmountMinor = 4500)
    {
        var response = await MediaApi.SendAsync(
            client,
            HttpMethod.Put,
            $"{BasePath}/{experienceId}/pricing",
            token,
            new
            {
                currency,
                rules = new[] { new { guestType = "adult", unitAmountMinor = adultAmountMinor } },
            });

        // Sessizce geçilseydi asıl test "fiyat yok" yüzünden kırılır ve sebebi
        // görünmezdi.
        response.StatusCode.ShouldBe(HttpStatusCode.OK);
    }
}
