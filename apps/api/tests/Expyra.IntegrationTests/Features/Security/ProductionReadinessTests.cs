using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Shouldly;
using Expyra.IntegrationTests.Common;

namespace Expyra.IntegrationTests.Features.Security;

/// <summary>
/// #42, #47: Development dışında eksik ayarla API AÇILMIYOR ve hangi ayarın eksik
/// olduğunu söylüyor.
///
/// <para><see cref="ApiFactory"/> KULLANILMIYOR: o, e-posta göndericisini test
/// sahtesiyle değiştiriyor ve kontrol o zaman sağlayıcıyı "gerçek" sanardı. Burada
/// uygulamanın kendi kayıtları olduğu gibi duruyor.</para>
/// </summary>
[Collection(ApiCollection.Name)]
public sealed class ProductionReadinessTests
{
    [Fact]
    public void Production_HicbirAyarYokken_EksikleriAdiylaSayarakAcilmaz()
    {
        var exception = Start(_ => { });

        exception.Message.ShouldContain("'Production'");
        exception.Message.ShouldContain("Email:Smtp:Host");
        exception.Message.ShouldContain("Storage:S3:Bucket");
        exception.Message.ShouldContain("Network:TrustedProxies");
        exception.Message.ShouldContain("AllowedHosts");

        // Boş CORS üretimde geçerli: tarayıcı API'yi hiç çağırmıyor (BFF).
        exception.Message.ShouldNotContain("Cors");
    }

    [Fact]
    public void Production_YildizliAllowedHosts_ReddedilirAmaDoluTrustedProxiesKabulEdilir()
    {
        var exception = Start(builder =>
        {
            builder.UseSetting("AllowedHosts", "*");
            builder.UseSetting("Network:TrustedProxies:0", "10.0.0.5");
        });

        exception.Message.ShouldContain("AllowedHosts");
        exception.Message.ShouldNotContain("Network:TrustedProxies");

        // Gerçek sağlayıcı henüz yok (#56): o yazılana kadar üretim açılamaz.
        exception.Message.ShouldContain("Email:Smtp:Host");
    }

    [Fact]
    public void Production_HostVeProxyVerildiginde_YalnizSaglayicilarEksikKalir()
    {
        var exception = Start(builder =>
        {
            builder.UseSetting("AllowedHosts", "api.expyra.test");
            builder.UseSetting("Network:TrustedProxies:0", "10.0.0.5");
        });

        exception.Message.ShouldNotContain("AllowedHosts");
        exception.Message.ShouldNotContain("Network:TrustedProxies");
        exception.Message.ShouldContain("Email:Smtp:Host");
        exception.Message.ShouldContain("Storage:S3:Bucket");
    }

    private static InvalidOperationException Start(Action<IWebHostBuilder> configure)
    {
        TestEnvironment.Ensure();

        using var baseHost = new WebApplicationFactory<Program>();
        using var host = baseHost.WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Production");
            configure(builder);
        });

        return Should.Throw<InvalidOperationException>(() => host.CreateClient());
    }
}
