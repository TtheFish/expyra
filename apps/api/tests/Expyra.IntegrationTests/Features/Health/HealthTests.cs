using System.Net;
using System.Text.Json;
using Shouldly;
using Expyra.IntegrationTests.Common;

namespace Expyra.IntegrationTests.Features.Health;

/// <summary>
/// <c>/api/health</c> tel sözleşmesi + sürüm damgası (issue #46).
///
/// <para>CI, derlemeye verdiği SHA'yı <c>EXPYRA_EXPECTED_COMMIT</c> ile teste de
/// veriyor: test, damganın derlemeden yanıta kadar kaybolmadan geldiğini kanıtlıyor.
/// Yerelde değişken yok ve test yalnız alanın dolu olduğunu sınıyor — yerel
/// derlemede commit <c>"dev"</c>.</para>
/// </summary>
[Collection(ApiCollection.Name)]
public sealed class HealthTests(ApiFactory factory)
{
    private const string HealthPath = "/api/health";

    [Fact]
    public async Task Health_SurumVeCommitDoner()
    {
        var client = factory.CreateClient();

        using var response = await client.GetAsync(new Uri(HealthPath, UriKind.Relative));

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        // Alan adları TELDEKİ hâliyle sınanıyor: deploy betiği `jq .commit` okuyor,
        // C# kaydının adı değil.
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var root = body.RootElement;

        root.GetProperty("status").GetString().ShouldBe("healthy");
        root.GetProperty("version").GetString().ShouldNotBeNullOrWhiteSpace();

        var commit = root.GetProperty("commit").GetString();
        commit.ShouldNotBeNullOrWhiteSpace();

        var expected = Environment.GetEnvironmentVariable("EXPYRA_EXPECTED_COMMIT");
        if (!string.IsNullOrWhiteSpace(expected))
        {
            commit.ShouldBe(expected.Trim());
        }

        // Alan her zaman var; değeri yalnız CI derlemesinde dolu.
        root.TryGetProperty("builtAtUtc", out _).ShouldBeTrue();
    }
}
