using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Expyra.Domain.Catalog;
using Expyra.Domain.Experiences;
using Expyra.Domain.Identity;
using Expyra.Domain.Languages;
using Expyra.Domain.Places;
using Expyra.Domain.Pricing;
using Expyra.Domain.Users;

namespace Expyra.Application.Common.Interfaces;

/// <summary>
/// Handler'ların gördüğü DbContext yüzeyi.
/// Yeni bir entity eklerken: buraya DbSet ekle + AppDbContext'te karşılığını yaz.
/// </summary>
public interface IAppDbContext
{
    /// <summary>Dil kayıt defteri — sistemin desteklediği diller (docs/I18N.md).</summary>
    DbSet<Language> Languages { get; }

    /// <summary>Ülke kayıt defteri (ISO 3166-1 alpha-2). Yerelleştirilmiş ad TUTMAZ — bkz. Country.</summary>
    DbSet<Country> Countries { get; }

    /// <summary>Şehir kayıt defteri. Serbest metin şehir alanının yerini aldı.</summary>
    DbSet<City> Cities { get; }

    /// <summary>Şehrin aranabilir yazımları (Prag/Prague/Praha) — aramanın dayandığı tablo.</summary>
    DbSet<CityAlias> CityAliases { get; }

    /// <summary>Para birimi kayıt defteri (ISO 4217). Asıl işi MinorUnits — bkz. Currency.</summary>
    DbSet<Currency> Currencies { get; }

    /// <summary>Deneyim kategorileri. Yalnız slug tutar; adlar Blok 3'ün sözlüğünde.</summary>
    DbSet<Category> Categories { get; }

    /// <summary>
    /// Deneyim ilanları. <b>Başlık ve açıklama BURADA DEĞİL</b> — bkz.
    /// <see cref="ExperienceTranslations"/> (docs/I18N.md §2).
    /// </summary>
    DbSet<Experience> Experiences { get; }

    /// <summary>
    /// İlan metinleri, dil başına bir satır. Bileşik anahtar → <c>FindForUpdateAsync</c>
    /// bu tiple ÇALIŞMAZ; kilit <c>experience</c> satırında alınır.
    /// </summary>
    DbSet<ExperienceTranslation> ExperienceTranslations { get; }

    /// <summary>
    /// Deneyim sırasında KONUŞULAN diller — ilan metninin dili değil (docs/I18N.md §3).
    /// Dizi değil join tablosu: sebebi <see cref="ExperienceSpokenLanguage"/>'da.
    /// </summary>
    DbSet<ExperienceSpokenLanguage> ExperienceSpokenLanguages { get; }

    /// <summary>Host'un yazdığı serbest etiketler. Kategori değil — o kapalı liste.</summary>
    DbSet<ExperienceTag> ExperienceTags { get; }

    /// <summary>
    /// İlan görselleri. Satır BAYT TAŞIMAZ, yalnız depo anahtarı ve ölçü tutar;
    /// misafire gösterilenler <see cref="MediaStatus.Active"/> olanlar.
    /// </summary>
    DbSet<ExperienceMedia> ExperienceMedia { get; }

    /// <summary>Kullanıcı hesapları. Tablo adı app_user — "user" Postgres'te ayrılmış kelime.</summary>
    DbSet<User> Users { get; }

    /// <summary>Tek kullanımlık giriş kodları. Satırlar kullanıcı OLMADAN da doğabilir.</summary>
    DbSet<LoginCode> LoginCodes { get; }

    DbSet<RefreshToken> RefreshTokens { get; }

    /// <summary>Faz 1.9'da (Google/Apple) dolar. Tablo şimdi kuruluyor.</summary>
    DbSet<ExternalLogin> ExternalLogins { get; }

    DbSet<TEntity> Set<TEntity>() where TEntity : class;

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Birden fazla satırı atomik değiştiren işlemler (ör. rezervasyon + kapasite düşümü)
    /// bunu KULLANMAK ZORUNDA. Tek SaveChanges yetmiyorsa transaction aç.
    /// </summary>
    Task<IDbContextTransaction> BeginTransactionAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Satırı SELECT ... FOR UPDATE ile kilitleyerek çeker. "Oku-değiştir-yaz" akışları
    /// bunu KULLANMAK ZORUNDA (CLAUDE.md #5). Transaction içinde çağrılır.
    /// Tablo adı EF modelinden gelir, kullanıcı girdisinden değil.
    ///
    /// <para>Dönen entity TAKİP EDİLİR (AsNoTracking DEĞİL): çağıranlar döndürülen
    /// nesneyi değiştirip SaveChangesAsync çağırıyor.</para>
    ///
    /// <para>Neden xmin concurrency token değil: kaybeden taraf DbUpdateConcurrencyException
    /// alır ve 500'e düşer. FOR UPDATE kaybedeni sıraya sokar; kilidi aldığında satırı
    /// Consumed görür ve temiz bir 400 alır.</para>
    /// </summary>
    Task<TEntity?> FindForUpdateAsync<TEntity>(Guid id, CancellationToken cancellationToken)
        where TEntity : class;

    /// <summary>
    /// Aynı anahtar için eşzamanlı yazmaları SIRAYA SOKAR (pg_advisory_xact_lock).
    /// Transaction bitince otomatik bırakılır — exception yakalamaya gerek yok.
    /// AÇIK BİR TRANSACTION İÇİNDE çağrılmak zorunda: xact varyantı kilidi
    /// transaction'a bağlar, transaction yoksa kilit anında düşer.
    /// </summary>
    Task AcquireAdvisoryLockAsync(string key, CancellationToken cancellationToken);

    /// <summary>Sağlık kontrolü için. Handler içinde DbContext'e cast etmek YASAK.</summary>
    Task<bool> CanConnectAsync(CancellationToken cancellationToken = default);
}
