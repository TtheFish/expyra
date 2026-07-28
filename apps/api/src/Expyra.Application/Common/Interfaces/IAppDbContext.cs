using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace Expyra.Application.Common.Interfaces;

/// <summary>
/// Handler'ların gördüğü DbContext yüzeyi.
/// Yeni bir entity eklerken: buraya DbSet ekle + AppDbContext'te karşılığını yaz.
/// </summary>
public interface IAppDbContext
{
    DbSet<TEntity> Set<TEntity>() where TEntity : class;

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Birden fazla satırı atomik değiştiren işlemler (ör. rezervasyon + kapasite düşümü)
    /// bunu KULLANMAK ZORUNDA. Tek SaveChanges yetmiyorsa transaction aç.
    /// </summary>
    Task<IDbContextTransaction> BeginTransactionAsync(CancellationToken cancellationToken = default);

    /// <summary>Sağlık kontrolü için. Handler içinde DbContext'e cast etmek YASAK.</summary>
    Task<bool> CanConnectAsync(CancellationToken cancellationToken = default);
}
