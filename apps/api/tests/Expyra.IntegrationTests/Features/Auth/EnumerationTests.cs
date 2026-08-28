using System.Net;
using System.Text.Json;
using Shouldly;
using Expyra.IntegrationTests.Common;

namespace Expyra.IntegrationTests.Features.Auth;

/// <summary>
/// "Bu adres kayıtlı mı" sorusunun cevabı hiçbir kanaldan sızmamalı. Kod isteme yolu
/// <c>app_user</c> tablosuna HİÇ bakmıyor; bu testler o kararın gözlemlenebilir
/// sonucunu sabitliyor.
/// </summary>
[Collection(ApiCollection.Name)]
public sealed class EnumerationTests(ApiFactory factory)
{
    private static readonly string[] ExpectedFields =
        ["challengeId", "codeLength", "expiresAtUtc", "resendAvailableAtUtc"];

    [Fact]
    public async Task RequestCode_KayitliVeKayitsizAdres_AyniStatusVeAyniGovdeSekli()
    {
        var client = factory.CreateClient();

        var registered = AuthApi.NewEmail();
        await AuthApi.SignInAsync(factory, client, registered);

        var unknown = AuthApi.NewEmail();

        // Kayıtlı adres için ikinci kod: yeniden gönderme aralığı saatle değil saatin
        // kaydırılmasıyla aşılıyor, iki yanıt aynı koşullarda karşılaştırılsın diye.
        using (factory.Clock.Shift(TimeSpan.FromSeconds(61)))
        {
            var known = await AuthApi.PostRequestCodeAsync(client, registered);
            var fresh = await AuthApi.PostRequestCodeAsync(client, unknown);

            known.StatusCode.ShouldBe(HttpStatusCode.Accepted);
            fresh.StatusCode.ShouldBe(HttpStatusCode.Accepted);
            known.StatusCode.ShouldBe(fresh.StatusCode);

            var knownFields = await FieldNamesAsync(known);
            var freshFields = await FieldNamesAsync(fresh);

            knownFields.ShouldBe(ExpectedFields);
            freshFields.ShouldBe(ExpectedFields);
        }
    }

    [Fact]
    public async Task RequestCode_Yanit_HicbirAlandaKoduTasimiyor()
    {
        var client = factory.CreateClient();
        var email = AuthApi.NewEmail();

        var response = await AuthApi.PostRequestCodeAsync(client, email);
        var body = await response.Content.ReadAsStringAsync();

        var code = factory.Emails.CodeFor(email);

        using var document = JsonDocument.Parse(body);

        // Alan adlarını sabitlemek "kod alanı yok"tan daha güçlü: ileride eklenen
        // herhangi bir alan bu testi kırar ve bilinçli karar vermeye zorlar.
        document.RootElement.EnumerateObject()
            .Select(x => x.Name)
            .Order(StringComparer.Ordinal)
            .ShouldBe(ExpectedFields);

        // Kodun kendisi de hiçbir değerin içinde geçmiyor (challengeId'nin hex
        // basamakları arasında kaza eseri eşleşme olmadığını da doğruluyor).
        foreach (var property in document.RootElement.EnumerateObject())
        {
            property.Value.ToString().ShouldNotContain(code);
        }
    }

    [Fact]
    public async Task RequestCode_BozukAdres_400VeValidationProblemDetails()
    {
        var client = factory.CreateClient();

        var response = await AuthApi.PostRequestCodeAsync(client, "a@b");

        // Şekil hatası 400; "kayıtlı mı" sorusu ne validator'a ne handler'a giriyor.
        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);

        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());

        document.RootElement.TryGetProperty("errors", out var errors).ShouldBeTrue();
        errors.TryGetProperty("Email", out _).ShouldBeTrue();
    }

    private static async Task<IEnumerable<string>> FieldNamesAsync(HttpResponseMessage response)
    {
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());

        return [.. document.RootElement.EnumerateObject().Select(x => x.Name).Order(StringComparer.Ordinal)];
    }
}
