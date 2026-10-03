using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Expyra.Application.Common.Auth;
using Expyra.Application.Common.Interfaces;
using Expyra.Infrastructure.Auth;
using Expyra.Infrastructure.Build;
using Expyra.Infrastructure.Email;
using Expyra.Infrastructure.Persistence;
using Expyra.Infrastructure.Pricing;
using Expyra.Infrastructure.Storage;
using Expyra.Infrastructure.Time;

namespace Expyra.Infrastructure;

public static class DependencyInjection
{
    /// <summary>OTP pepper'ı ve JWT imza anahtarı için alt sınır. HS256'da anahtar hash çıktısından kısa olamaz (RFC 8725 §3.5).</summary>
    private const int MinimumKeyBytes = 32;

    private const string OtpHashKeyPath = "Auth:Otp:HashKey";

    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(configuration);

        var connectionString = configuration.GetConnectionString("Default")
            ?? throw new InvalidOperationException(
                "ConnectionStrings:Default tanımlı değil. `dotnet user-secrets set` ile ver.");

        services.AddSingleton<IDateTimeProvider, DateTimeProvider>();
        services.AddSingleton<IBuildInfo, AssemblyBuildInfo>();

        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(connectionString, npgsql =>
            {
                npgsql.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName);
                npgsql.CommandTimeout(30);

                // EnableRetryOnFailure BİLİNÇLİ OLARAK YOK. Yeniden deneyen execution
                // strategy, kullanıcının kendi açtığı transaction'la çalışmıyor: EF, açık
                // transaction varken çalışan HER sorguda InvalidOperationException
                // fırlatıyor ve kimlik akışının beş handler'ının dördü transaction açıyor.
                // Tek uyumlu kullanım, transaction'ın tamamını
                // Database.CreateExecutionStrategy().ExecuteAsync(...) içine sarmak —
                // ama bu iş birimleri idempotent değil (kod üretiyor, mail gönderiyor);
                // yarısı işlenmiş bir birimi sessizce tekrar oynatmaktansa geçici hatada
                // yüksek sesle patlamak doğrusu. Faz 5.2 kapasite düşümünde tekrar bakılır.
            }));

        // EnableSensitiveDataLogging AÇILMAZ: appsettings.Development.json zaten
        // EF komutlarını Information seviyesinde basıyor. Açılırsa advisory lock
        // anahtarındaki e-posta, kod özeti ve refresh token özeti düz metin olarak
        // konsola akar (Riskler §8).

        services.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<AppDbContext>());

        // Ödeme sağlayıcısının para kısıtları. Açılışta bir kez okunuyor: dosya
        // değişmiyor ve her istekte JSON ayrıştırmak boşa iş. Eksik ya da bozuk
        // dosyada AÇILIŞTA patlıyor — çalışma anında sessizce sınırsız bir tavana
        // düşmektense (CLAUDE.md #1).
        services.AddSingleton(PaymentCurrencyRulesLoader.Load());

        AddIdentity(services, configuration);

        return services;
    }

    /// <summary>
    /// Sahte e-posta göndericisi. <c>Program.cs</c>'te YALNIZ
    /// <c>builder.Environment.IsDevelopment()</c> altında çağrılır; yapılandırma bayrağı
    /// (<c>Email:Provider=filesystem</c>) yerine ortam kapısı seçildi çünkü bayrak
    /// yanlış bir ortam değişkeniyle üretime sızabilir.
    /// </summary>
    public static IServiceCollection AddDevelopmentEmailSender(this IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        // Tek örnek İKİ arayüzle kayıtlı: posta kutusu göndericinin BELLEĞİNDE yaşıyor,
        // iki ayrı örnek olsaydı dev ucu boş bir kutuya bakardı (AddDevelopmentObjectStorage
        // ile aynı durum).
        services.Replace(ServiceDescriptor.Singleton<FileSystemEmailSender, FileSystemEmailSender>());

        // Replace, Add'in üzerine yazdığına güvenmekten iyi: kayıt sırası değişirse
        // "son kazanır" davranışı sessizce ters döner.
        services.Replace(ServiceDescriptor.Singleton<IEmailSender>(sp
            => sp.GetRequiredService<FileSystemEmailSender>()));

        services.Replace(ServiceDescriptor.Singleton<ILocalMailbox>(sp
            => sp.GetRequiredService<FileSystemEmailSender>()));

        return services;
    }

    /// <summary>
    /// Diske yazan sahte nesne deposu. <see cref="AddDevelopmentEmailSender"/> ile aynı
    /// gerekçelerle ortam kapısının arkasında.
    ///
    /// <para>Tek örnek İKİ arayüzle kayıtlı: imza anahtarı örneğin içinde yaşıyor, iki
    /// ayrı örnek olsaydı yükleme ucu, adresi üreten örneğin imzasını doğrulayamazdı.</para>
    /// </summary>
    public static IServiceCollection AddDevelopmentObjectStorage(this IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        services.Replace(ServiceDescriptor.Singleton<FileSystemObjectStorage>(sp
            => new FileSystemObjectStorage(
                sp.GetRequiredService<StorageOptions>(),
                sp.GetRequiredService<IDateTimeProvider>(),
                sp.GetRequiredService<ILogger<FileSystemObjectStorage>>())));

        services.Replace(ServiceDescriptor.Singleton<IObjectStorage>(sp
            => sp.GetRequiredService<FileSystemObjectStorage>()));

        services.Replace(ServiceDescriptor.Singleton<ILocalUploadSink>(sp
            => sp.GetRequiredService<FileSystemObjectStorage>()));

        return services;
    }

    private static void AddIdentity(IServiceCollection services, IConfiguration configuration)
    {
        var authOptions = ReadAuthOptions(configuration);
        services.AddSingleton(authOptions);

        var jwtOptions = JwtOptions.FromConfiguration(configuration);
        services.AddSingleton(jwtOptions);

        // Sırlar AÇILIŞTA okunuyor: eksik ya da kısa anahtarda uygulama hiç ayağa
        // kalkmaz, varsayılana DÜŞMEZ. Repoya gömülü bir imza anahtarı, anahtarın
        // hiç olmamasıyla aynı şeydir (CLAUDE.md #4).
        var signingKey = RequireKeyBytes(configuration, JwtOptions.SigningKeyPath);
        var otpHashKey = RequireKeyBytes(configuration, OtpHashKeyPath);

        services.AddSingleton<ILoginCodeGenerator, LoginCodeGenerator>();

        // Pepper options nesnesine konmuyor, doğrudan servise veriliyor: DI'a kayıtlı
        // bir options nesnesi bir gün bir teşhis ucunda serileştirilir.
        services.AddSingleton<ILoginCodeHasher>(new LoginCodeHasher(otpHashKey));

        services.AddSingleton<ITokenService>(sp => new JwtTokenService(
            jwtOptions, signingKey, sp.GetRequiredService<IDateTimeProvider>()));

        services.AddSingleton<ILoginCodeEmailComposer, LoginCodeEmailComposer>();

        services.AddSingleton(EmailOptions.FromConfiguration(configuration));
        services.AddSingleton<IEmailSender, UnconfiguredEmailSender>();

        services.AddSingleton(StorageOptions.FromConfiguration(configuration));
        services.AddSingleton<IObjectStorage, UnconfiguredObjectStorage>();
    }

    private static AuthOptions ReadAuthOptions(IConfiguration configuration)
    {
        var defaults = new AuthOptions();

        var options = new AuthOptions
        {
            Digits = Positive("Auth:Otp:Digits", defaults.Digits),
            CodeLifetimeSeconds = Positive("Auth:Otp:CodeLifetimeSeconds", defaults.CodeLifetimeSeconds),
            MaxAttempts = Positive("Auth:Otp:MaxAttempts", defaults.MaxAttempts),
            ResendIntervalTier1Seconds = Positive(
                "Auth:Otp:ResendIntervalTier1Seconds", defaults.ResendIntervalTier1Seconds),
            ResendIntervalTier2Seconds = Positive(
                "Auth:Otp:ResendIntervalTier2Seconds", defaults.ResendIntervalTier2Seconds),
            ResendIntervalTier3Seconds = Positive(
                "Auth:Otp:ResendIntervalTier3Seconds", defaults.ResendIntervalTier3Seconds),
            MaxCodesPerEmailPerHour = Positive(
                "Auth:Otp:MaxCodesPerEmailPerHour", defaults.MaxCodesPerEmailPerHour),
            MaxCodesPerEmailPerDay = Positive(
                "Auth:Otp:MaxCodesPerEmailPerDay", defaults.MaxCodesPerEmailPerDay),
            MaxCodesPerIpPerHour = Positive("Auth:Otp:MaxCodesPerIpPerHour", defaults.MaxCodesPerIpPerHour),
            MaxCodesPerIpPerDay = Positive("Auth:Otp:MaxCodesPerIpPerDay", defaults.MaxCodesPerIpPerDay),

            // Yenileme grace'i Otp bölümünde DEĞİL: OTP'yle ilgisi yok, oturum
            // yenilemenin parametresi. Tek kaynağı AuthOptions (JwtOptions'ta yok).
            RefreshGraceSeconds = Positive("Auth:RefreshGraceSeconds", defaults.RefreshGraceSeconds),

            FallbackLanguage = configuration["Auth:FallbackLanguage"] is { Length: > 0 } fallback
                ? fallback
                : defaults.FallbackLanguage,
        };

        // Kaçış valfi 8 haneye kadar açık; jeneratörün sınırlarını ÇALIŞMA ANINDA değil
        // burada doğruluyoruz ki yanlış değer ilk kod isteğinde değil açılışta görünsün.
        if (options.Digits is < 4 or > 9)
        {
            throw new InvalidOperationException("Auth:Otp:Digits 4 ile 9 arasında olmalı.");
        }

        return options;

        int Positive(string path, int fallbackValue)
        {
            var raw = configuration[path];
            if (string.IsNullOrWhiteSpace(raw))
            {
                return fallbackValue;
            }

            if (!int.TryParse(raw, NumberStyles.Integer, CultureInfo.InvariantCulture, out var value)
                || value <= 0)
            {
                throw new InvalidOperationException($"{path} pozitif bir tam sayı olmalı; '{raw}' okundu.");
            }

            return value;
        }
    }

    private static byte[] RequireKeyBytes(IConfiguration configuration, string path)
    {
        var value = configuration[path];

        if (string.IsNullOrWhiteSpace(value))
        {
            throw new InvalidOperationException(
                $"{path} tanımlı değil. 32 baytlık rastgele bir değeri base64 olarak ver: " +
                $"`dotnet user-secrets set \"{path}\" \"<base64>\"`. Varsayılan anahtar YOK.");
        }

        // base64 çözümü girdiden asla uzun olmaz; tampon bu yüzden güvenli.
        var buffer = new byte[value.Length];

        if (!Convert.TryFromBase64String(value, buffer, out var written))
        {
            throw new InvalidOperationException($"{path} geçerli bir base64 değeri değil.");
        }

        if (written < MinimumKeyBytes)
        {
            throw new InvalidOperationException(string.Create(
                CultureInfo.InvariantCulture,
                $"{path} {written} bayt çözüldü; en az {MinimumKeyBytes} bayt olmalı."));
        }

        return buffer[..written];
    }

    /// <summary>
    /// Faz 1'de gerçek gönderici YOK (SMTP + outbox Faz 7.4). Kaydı boş bırakmak yerine
    /// buraya konuyor: aksi halde hata "IEmailSender çözülemedi" olarak çıkar ve nedenini
    /// söylemez. Development'ta <see cref="AddDevelopmentEmailSender"/> üzerine yazar.
    /// </summary>
    private sealed class UnconfiguredEmailSender : IEmailSender
    {
        public Task SendAsync(EmailMessage message, CancellationToken cancellationToken)
            => throw new InvalidOperationException(
                "Yapılandırılmış bir e-posta göndericisi yok. Development'ta " +
                "AddDevelopmentEmailSender() çağrılmalı; gerçek gönderici Faz 7.4'te geliyor.");
    }

    /// <summary>
    /// Gerçek nesne deposu (S3/R2) hesap açılana kadar yok — PLAN Blok 6 bunu dış
    /// bağımlılık olarak işaretliyor. <see cref="UnconfiguredEmailSender"/> ile aynı
    /// gerekçe: sessizce çözülemeyen bir servis yerine ne yapılması gerektiğini söyleyen
    /// bir istisna.
    /// </summary>
    private sealed class UnconfiguredObjectStorage : IObjectStorage
    {
        public Task<PresignedUpload> CreateUploadAsync(
            PresignedUploadRequest request,
            CancellationToken cancellationToken) => throw Missing();

        public Task<StoredObject?> HeadAsync(string key, CancellationToken cancellationToken)
            => throw Missing();

        public Task<Stream?> OpenReadAsync(string key, int? maxBytes, CancellationToken cancellationToken)
            => throw Missing();

        public Task DeleteAsync(string key, CancellationToken cancellationToken) => throw Missing();

        public Uri PublicUrl(string key) => throw Missing();

        private static InvalidOperationException Missing()
            => new("Yapılandırılmış bir nesne deposu yok. Development'ta "
                + "AddDevelopmentObjectStorage() çağrılmalı; S3ObjectStorage hesap açılınca geliyor.");
    }
}
