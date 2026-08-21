using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Expyra.Domain.Places;

namespace Expyra.Infrastructure.Persistence.Configurations;

internal sealed class CountryConfiguration : IEntityTypeConfiguration<Country>
{
    public void Configure(EntityTypeBuilder<Country> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        builder.ToTable("country");

        builder.HasKey(x => x.Code);

        // varchar(2), char(2) DEĞİL: bpchar sağdan boşluk dolduruyor ve karşılaştırmada
        // "boşluk anlamsızdır" kuralı uyguluyor — parametreyle eşleşme sürprizleri üretir.
        builder.Property(x => x.Code)
            .HasColumnName("code")
            .HasMaxLength(CountryCode.Length)
            .IsRequired();

        builder.Property(x => x.EnglishName)
            .HasColumnName("english_name")
            .HasMaxLength(100)
            .IsRequired();

        // HasData YOK — Language'ın aksine. 250 ülke + binlerce şehir migration dosyasını
        // şişirir ve her düzeltme yeni bir migration doğurur; seed ayrı ve idempotent bir
        // komut (ReferenceDataSeeder).
        //
        // english_name üzerinde index de YOK: 250 satırı sıralamak için index gerekmiyor
        // (docs/DATABASE.md — "sorgusu olmayan index yazma").
    }
}
