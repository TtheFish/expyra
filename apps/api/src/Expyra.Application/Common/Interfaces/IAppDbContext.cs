using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Expyra.Domain.Identity;
using Expyra.Domain.Languages;
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
