using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Expyra.Domain.Common;
using Expyra.Domain.Experiences;
using Expyra.Domain.Pricing;

namespace Expyra.Infrastructure.Persistence.Configurations;

internal sealed class ExperiencePriceConfiguration : IEntityTypeConfiguration<ExperiencePrice>
{
    public void Configure(EntityTypeBuilder<ExperiencePrice> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        builder.ToTable("experience_price");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();

        builder.Property(x => x.ExperienceId).HasColumnName("experience_id").IsRequired();

        builder.Property(x => x.CurrencyCode)
            .HasColumnName("currency_code")
            .HasMaxLength(CurrencyCode.Length)
            .IsRequired();

        builder.Property(x => x.CreatedAtUtc).HasColumnName("created_at_utc").IsRequired();
        builder.Property(x => x.UpdatedAtUtc).HasColumnName("updated_at_utc");

        builder.HasOne<Experience>()
            .WithMany()
            .HasForeignKey(x => x.ExperienceId)
            .OnDelete(DeleteBehavior.Cascade);

        // Restrict: kayıt defterinden bir para birimi silinirse fiyatlar sessizce
        // sahipsiz kalmasın.
        builder.HasOne<Currency>()
            .WithMany()
            .HasForeignKey(x => x.CurrencyCode)
            .HasPrincipalKey(x => x.Code)
            .OnDelete(DeleteBehavior.Restrict);

        // 1:1 garantisi ŞEMADA, kodda değil: "deneyim başına bir fiyat sayfası"
        // kuralı iki eşzamanlı istekte kodla korunamaz.
        builder.HasIndex(x => x.ExperienceId)
            .HasDatabaseName("ux_experience_price_experience")
            .IsUnique();

        builder.HasIndex(x => x.CurrencyCode)
            .HasDatabaseName("ix_experience_price_currency");
    }
}

internal sealed class PriceRuleConfiguration : IEntityTypeConfiguration<PriceRule>
{
    public void Configure(EntityTypeBuilder<PriceRule> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        builder.ToTable("price_rule", table => table.HasCheckConstraint(
            "ck_price_rule_amount_range",
            // Negatif tutar Money genelinde GEÇERLİ (iade, Blok 13) — bu kısıt
            // gövdesel değil BU sütuna özel. Tavan bir ürün kapısı değil taşma
            // korkuluğu (PricingRules.MaxUnitAmountMinor notu).
            string.Create(CultureInfo.InvariantCulture,
                $"unit_amount_minor >= 0 AND unit_amount_minor <= {PricingRules.MaxUnitAmountMinor}")));

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();

        builder.Property(x => x.ExperiencePriceId).HasColumnName("experience_price_id").IsRequired();

        builder.Property(x => x.GuestType)
            .HasColumnName("guest_type")
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(x => x.CreatedAtUtc).HasColumnName("created_at_utc").IsRequired();
        builder.Property(x => x.UpdatedAtUtc).HasColumnName("updated_at_utc");

        // Money owned type: sahip tablonun İKİ sütununa açılıyor. Ayrı tablo YASAK
        // (join istemez), tek sütunda serileştirme YASAK (SQL'de toplanamaz) —
        // talimat Money.cs sınıf notunda.
        builder.OwnsOne(x => x.UnitPrice, money =>
        {
            money.Property(x => x.AmountMinor).HasColumnName("unit_amount_minor").IsRequired();

            money.Property(x => x.Currency)
                .HasColumnName("unit_currency_code")
                .HasMaxLength(CurrencyCode.Length)
                .IsRequired();

            money.HasOne<Currency>()
                .WithMany()
                .HasForeignKey(x => x.Currency)
                .HasPrincipalKey(x => x.Code)
                .HasConstraintName("fk_price_rule_currency")
                .OnDelete(DeleteBehavior.Restrict);

            money.HasIndex(x => x.Currency).HasDatabaseName("ix_price_rule_currency");
        });

        // IsRequired() ŞART: atlanırsa EF owned navigation'ı "optional dependent"
        // sayar ve tüm sütunlar dolu olsa bile bir gün null materyalize eder
        // (Money.cs sınıf notunun açık uyarısı).
        builder.Navigation(x => x.UnitPrice).IsRequired();

        // Cascade: kural, sayfası olmadan anlamsız.
        builder.HasOne<ExperiencePrice>()
            .WithMany()
            .HasForeignKey(x => x.ExperiencePriceId)
            .OnDelete(DeleteBehavior.Cascade);

        // Kademe başına TEK fiyat. Mevsimsel fiyat kapsam dışı bırakıldığı için
        // tarih boyutu yok; eklendiği gün bu index'e bir sütun daha girer ve
        // mevcut satırlar "temel kural" olarak kalır.
        builder.HasIndex(x => new { x.ExperiencePriceId, x.GuestType })
            .HasDatabaseName("ux_price_rule_tier")
            .IsUnique();
    }
}

internal sealed class ExchangeRateSnapshotConfiguration : IEntityTypeConfiguration<ExchangeRateSnapshot>
{
    public void Configure(EntityTypeBuilder<ExchangeRateSnapshot> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        // "Gelecek tarihli olamaz" kısıtı CHECK olarak YAZILAMAZ: now() Postgres'te
        // STABLE ve CHECK içinde kullanılamıyor. Kontrol yazma yolunda.
        builder.ToTable("exchange_rate_snapshot");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();

        builder.Property(x => x.PivotCurrencyCode)
            .HasColumnName("pivot_currency_code")
            .HasMaxLength(CurrencyCode.Length)
            .IsRequired();

        builder.Property(x => x.CapturedAtUtc).HasColumnName("captured_at_utc").IsRequired();

        builder.Property(x => x.Source)
            .HasColumnName("source")
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(x => x.CreatedAtUtc).HasColumnName("created_at_utc").IsRequired();

        builder.HasOne<Currency>()
            .WithMany()
            .HasForeignKey(x => x.PivotCurrencyCode)
            .HasPrincipalKey(x => x.Code)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.PivotCurrencyCode, x.CapturedAtUtc })
            .HasDatabaseName("ux_exchange_rate_snapshot_pivot_captured")
            .IsUnique();

        // "En yeni" tek okuma kalıbı. `id` tie-break: aynı mikrosaniyede iki
        // snapshot yazılırsa hangisinin kazandığı belirsiz kalmasın.
        builder.HasIndex(x => new { x.CapturedAtUtc, x.Id })
            .HasDatabaseName("ix_exchange_rate_snapshot_newest")
            .IsDescending(true, true);
    }
}

internal sealed class ExchangeRateConfiguration : IEntityTypeConfiguration<ExchangeRate>
{
    public void Configure(EntityTypeBuilder<ExchangeRate> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        builder.ToTable("exchange_rate", table => table.HasCheckConstraint(
            "ck_exchange_rate_positive",
            "rate_per_pivot > 0"));

        // BİLEŞİK anahtar ve bu güvenli: tablo yalnız ekleniyor, hiçbir satırı
        // güncellenmiyor ya da kilitlenmiyor. FindForUpdateAsync bu tiple ÇALIŞMAZ.
        builder.HasKey(x => new { x.SnapshotId, x.CurrencyCode });

        builder.Property(x => x.SnapshotId).HasColumnName("snapshot_id").IsRequired();

        builder.Property(x => x.CurrencyCode)
            .HasColumnName("currency_code")
            .HasMaxLength(CurrencyCode.Length)
            .IsRequired();

        // ORAN, tutar değil — kabul kriteri 2 ("her tutar minör birim + kod")
        // TUTARLARI bağlıyor. Bu cümle burada duruyor çünkü aksi halde biri
        // "decimal kalmış" diye düzeltmeye kalkar. 24,12: 12 ondalık, zayıf para
        // birimlerinde (IDR, VND) anlamlı hane bırakmak için.
        builder.Property(x => x.RatePerPivot)
            .HasColumnName("rate_per_pivot")
            .HasColumnType("numeric(24,12)")
            .IsRequired();

        builder.HasOne<ExchangeRateSnapshot>()
            .WithMany()
            .HasForeignKey(x => x.SnapshotId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<Currency>()
            .WithMany()
            .HasForeignKey(x => x.CurrencyCode)
            .HasPrincipalKey(x => x.Code)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
