namespace Expyra.Domain.Common;

/// <summary>
/// Tüm entity'lerin tabanı. Id'yi entity kendisi üretir (DB değil) —
/// böylece SaveChanges öncesi ilişkileri kurabiliriz ve testler DB'siz çalışır.
/// </summary>
public abstract class BaseEntity
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
}
