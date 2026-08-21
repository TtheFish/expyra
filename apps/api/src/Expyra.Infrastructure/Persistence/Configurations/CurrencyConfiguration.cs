using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Expyra.Domain.Common;
using Expyra.Domain.Pricing;

namespace Expyra.Infrastructure.Persistence.Configurations;

internal sealed class CurrencyConfiguration : IEntityTypeConfiguration<Currency>
{
    public void Configure(EntityTypeBuilder<Currency> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        // CHECK kısıtı: minör birim üssü ISO 4217'de 0-4 arası. Bozuk bir satır
        // (ör. JPY'ye 2 yazılması) para hesabını 100 kat kaydırır ve hiçbir yerde
        // hata vermez — bu yüzden garantiyi veritabanına koyuyoruz, koda değil.
        // Üst sınır CurrencyCode.MaxMinorUnits (4) ile aynı; SQL metnine sabit yazıldı
        // çünkü migration dosyasına giden şey bu metnin kendisi, sabitin değeri değil.
        builder.ToTable("currency", table => table.HasCheckConstraint(
            "ck_currency_minor_units",
            "minor_units >= 0 AND minor_units <= 4"));

        builder.HasKey(x => x.Code);

        builder.Property(x => x.Code)
            .HasColumnName("code")
            .HasMaxLength(CurrencyCode.Length)
            .IsRequired();

        builder.Property(x => x.EnglishName)
            .HasColumnName("english_name")
            .HasMaxLength(80)
            .IsRequired();

        builder.Property(x => x.MinorUnits)
            .HasColumnName("minor_units")
            .IsRequired();

        // Semboller çok baytlı olabiliyor (₺, ﷼, د.إ) — genişlik karakter cinsinden.
        builder.Property(x => x.Symbol)
            .HasColumnName("symbol")
            .HasMaxLength(8);
    }
}
