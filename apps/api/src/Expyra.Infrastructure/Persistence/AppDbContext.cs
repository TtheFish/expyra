using System.Collections.Concurrent;
using System.Reflection;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Storage;
using Expyra.Application.Common.Interfaces;
using Expyra.Domain.Catalog;
using Expyra.Domain.Common;
using Expyra.Domain.Experiences;
using Expyra.Domain.Identity;
using Expyra.Domain.Languages;
using Expyra.Domain.Places;
using Expyra.Domain.Pricing;
using Expyra.Domain.Scheduling;
using Expyra.Domain.Users;

namespace Expyra.Infrastructure.Persistence;

public sealed class AppDbContext(
    DbContextOptions<AppDbContext> options,
    IDateTimeProvider dateTimeProvider)
    : DbContext(options), IAppDbContext
{
    /// <summary>
    /// Satır kilidi cümlesi entity tipi başına bir kez kuruluyor: kaynağı değişmeyen
    /// EF model metadata'sı, dolayısıyla her istekte yeniden üretmek boşa iş. Statik
    /// olması güvenli çünkü tüm AppDbContext örnekleri aynı modeli paylaşıyor.
    /// </summary>
    private static readonly ConcurrentDictionary<Type, RowLock> RowLocks = new();

    public DbSet<Language> Languages => Set<Language>();

    public DbSet<Country> Countries => Set<Country>();

    public DbSet<City> Cities => Set<City>();

    public DbSet<CityAlias> CityAliases => Set<CityAlias>();

    public DbSet<Currency> Currencies => Set<Currency>();

    public DbSet<Category> Categories => Set<Category>();

    public DbSet<Experience> Experiences => Set<Experience>();

    public DbSet<ExperienceTranslation> ExperienceTranslations => Set<ExperienceTranslation>();

    public DbSet<ExperienceSpokenLanguage> ExperienceSpokenLanguages => Set<ExperienceSpokenLanguage>();

    public DbSet<ExperienceTag> ExperienceTags => Set<ExperienceTag>();

    public DbSet<ExperienceMedia> ExperienceMedia => Set<ExperienceMedia>();

    public DbSet<ExperienceItineraryStep> ExperienceItinerarySteps => Set<ExperienceItineraryStep>();

    public DbSet<AvailabilitySlot> AvailabilitySlots => Set<AvailabilitySlot>();

    public DbSet<RecurrenceTemplate> RecurrenceTemplates => Set<RecurrenceTemplate>();

    public DbSet<AvailabilityBlackout> AvailabilityBlackouts => Set<AvailabilityBlackout>();

    public DbSet<ExperiencePrice> ExperiencePrices => Set<ExperiencePrice>();

    public DbSet<PriceRule> PriceRules => Set<PriceRule>();

    public DbSet<ExchangeRateSnapshot> ExchangeRateSnapshots => Set<ExchangeRateSnapshot>();

    public DbSet<ExchangeRate> ExchangeRates => Set<ExchangeRate>();

    public DbSet<User> Users => Set<User>();

    public DbSet<HostProfile> HostProfiles => Set<HostProfile>();

    public DbSet<LoginCode> LoginCodes => Set<LoginCode>();

    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    public DbSet<ExternalLogin> ExternalLogins => Set<ExternalLogin>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        ArgumentNullException.ThrowIfNull(modelBuilder);

        // IEntityTypeConfiguration<T> yazan her sınıf otomatik bulunur.
        modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());

        // Postgres tarafında snake_case tercih ediyoruz; isimlendirmeyi
        // configuration sınıflarında açıkça veriyoruz (sürpriz mapping olmasın).
        base.OnModelCreating(modelBuilder);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        ApplyAuditTimestamps();
        return base.SaveChangesAsync(cancellationToken);
    }

    public Task<IDbContextTransaction> BeginTransactionAsync(CancellationToken cancellationToken = default)
        => Database.BeginTransactionAsync(cancellationToken);

    public async Task<TEntity?> FindForUpdateAsync<TEntity>(Guid id, CancellationToken cancellationToken)
        where TEntity : class
    {
        // FOR UPDATE kilidi transaction'a bağlıdır. Transaction yoksa kilit satır
        // okunur okunmaz düşer ve çağıran korunduğunu SANARAK devam eder — sessiz
        // yarış yerine yüksek sesli hata (CLAUDE.md #5).
        if (Database.CurrentTransaction is null)
        {
            throw new InvalidOperationException(
                "FindForUpdateAsync açık bir transaction içinde çağrılmalı; " +
                "aksi halde satır kilidi anında bırakılır.");
        }

        var rowLock = RowLocks.GetOrAdd(typeof(TEntity), static (type, context) => context.BuildRowLock(type), this);

        // Kilit ayrı bir cümle olarak alınıyor; entity FromSqlRaw ile ÇEKİLMİYOR.
        // Gerekçe: FromSqlRaw "SELECT *" ister ve sonuç kümesinin şeklini ham SQL'e
        // bağlar — sütun eklendiğinde/yeniden adlandırıldığında sessizce kırılır,
        // value converter ve shadow property'lerle hiç anlaşmaz. Burada ham cümle
        // hiçbir şey döndürmüyor; entity EF'in kendi tipli sorgusundan TAKİP EDİLEN
        // olarak geliyor. SQL metnine giren tek dinamik parça tablo/sütun adı ve o da
        // kullanıcı girdisinden değil EF modelinden okunup sağlayıcının kaçış
        // mantığıyla tırnaklanıyor; id parametre olarak gidiyor.
        await Database
            .ExecuteSqlRawAsync(rowLock.Statement, new object[] { id }, cancellationToken)
            .ConfigureAwait(false);

        var keyName = rowLock.KeyPropertyName;

        return await Set<TEntity>()
            .FirstOrDefaultAsync(entity => EF.Property<Guid>(entity, keyName) == id, cancellationToken)
            .ConfigureAwait(false);
    }

    public async Task AcquireAdvisoryLockAsync(string key, CancellationToken cancellationToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(key);

        if (Database.CurrentTransaction is null)
        {
            throw new InvalidOperationException(
                "AcquireAdvisoryLockAsync açık bir transaction içinde çağrılmalı; " +
                "xact kilidi transaction bitince bırakılır, transaction yoksa hiç tutulmaz.");
        }

        // Anahtarı SUNUCU hash'liyor (hashtext): .NET'te string.GetHashCode process
        // başına rastgele tohumlanır, iki API kopyası aynı e-posta için farklı kilit
        // numarası üretirdi ve kilit hiçbir şeyi sıraya sokmazdı. Çakışma (iki farklı
        // anahtarın aynı sayıya düşmesi) yalnız gereksiz bekleme üretir, bozulma değil.
        await Database
            .ExecuteSqlAsync($"SELECT pg_advisory_xact_lock(hashtext({key}))", cancellationToken)
            .ConfigureAwait(false);
    }

    public Task<bool> CanConnectAsync(CancellationToken cancellationToken = default)
        => Database.CanConnectAsync(cancellationToken);

    private RowLock BuildRowLock(Type entityClrType)
    {
        var entityType = Model.FindEntityType(entityClrType)
            ?? throw new InvalidOperationException($"{entityClrType.Name} EF modelinde tanımlı değil.");

        var tableName = entityType.GetTableName()
            ?? throw new InvalidOperationException($"{entityClrType.Name} bir tabloya eşlenmemiş.");

        var primaryKey = entityType.FindPrimaryKey();
        if (primaryKey is null || primaryKey.Properties.Count != 1)
        {
            throw new InvalidOperationException(
                $"{entityClrType.Name} tek sütunlu bir birincil anahtara sahip değil; satır kilidi alınamaz.");
        }

        var keyProperty = primaryKey.Properties[0];
        var schema = entityType.GetSchema();

        var keyColumn = keyProperty.GetColumnName(StoreObjectIdentifier.Table(tableName, schema))
            ?? throw new InvalidOperationException(
                $"{entityClrType.Name} birincil anahtarının sütun adı çözülemedi.");

        var sqlHelper = this.GetService<ISqlGenerationHelper>();

        // {0} EF tarafından gerçek bir DbParameter'a çevrilir — id metne hiç girmez.
        return new RowLock(
            string.Concat(
                "SELECT 1 FROM ",
                sqlHelper.DelimitIdentifier(tableName, schema),
                " WHERE ",
                sqlHelper.DelimitIdentifier(keyColumn),
                " = {0} FOR UPDATE"),
            keyProperty.Name);
    }

    private void ApplyAuditTimestamps()
    {
        var now = dateTimeProvider.UtcNow;

        foreach (var entry in ChangeTracker.Entries<BaseAuditableEntity>())
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    entry.Entity.CreatedAtUtc = now;
                    break;
                case EntityState.Modified:
                    entry.Entity.UpdatedAtUtc = now;
                    break;
                default:
                    break;
            }
        }
    }

    /// <param name="KeyPropertyName">
    /// CLR property adı — kilit alındıktan sonra entity'yi EF.Property ile yeniden
    /// çekmek için. Sütun adı değil: ikincisi LINQ tarafında işe yaramaz.
    /// </param>
    private sealed record RowLock(string Statement, string KeyPropertyName);
}
