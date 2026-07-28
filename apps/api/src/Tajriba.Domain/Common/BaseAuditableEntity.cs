namespace Tajriba.Domain.Common;

/// <summary>
/// Zaman damgası tutulan entity'ler için. Alanlar AppDbContext.SaveChangesAsync
/// içinde otomatik doldurulur — handler'da elle set ETME.
/// </summary>
public abstract class BaseAuditableEntity : BaseEntity
{
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset? UpdatedAtUtc { get; set; }
}
