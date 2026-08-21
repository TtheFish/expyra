using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Expyra.Domain.Places;

namespace Expyra.Infrastructure.Persistence.Configurations;

internal sealed class CityConfiguration : IEntityTypeConfiguration<City>
{
    public void Configure(EntityTypeBuilder<City> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        builder.ToTable("city");

        builder.HasKey(x => x.Id);

        // Id'yi BaseEntity üretiyor (Guid v7). ValueGeneratedNever olmazsa EF anahtarı
        // "store generated" sayar; seed, alias satırlarını aynı SaveChanges içinde
        // yazıyor ve geçici bir anahtar değeri FK'yi yanlış bağlar (UserConfiguration
        // aynı gerekçe).
        builder.Property(x => x.Id)
            .HasColumnName("id")
            .ValueGeneratedNever();

        builder.Property(x => x.CountryCode)
            .HasColumnName("country_code")
            .HasMaxLength(CountryCode.Length)
            .IsRequired();

        builder.Property(x => x.Slug)
            .HasColumnName("slug")
            .HasMaxLength(City.MaxNameLength)
            // Slug zaten katlanmış ASCII: "C" collation hem doğru karşılaştırma hem de
            // ülke+slug aramasında byte sırası demek (bkz. SearchText).
            .UseCollation("C")
            .IsRequired();

        builder.Property(x => x.Name)
            .HasColumnName("name")
            .HasMaxLength(City.MaxNameLength)
            .IsRequired();

        builder.Property(x => x.EnglishName)
            .HasColumnName("english_name")
            .HasMaxLength(City.MaxNameLength)
            .IsRequired();

        builder.Property(x => x.TimeZoneId)
            .HasColumnName("time_zone_id")
            .HasMaxLength(City.MaxTimeZoneIdLength)
            .IsRequired();

        builder.Property(x => x.Latitude).HasColumnName("latitude");
        builder.Property(x => x.Longitude).HasColumnName("longitude");

        builder.HasOne(x => x.Country)
            .WithMany(x => x.Cities)
            .HasForeignKey(x => x.CountryCode)
            .HasConstraintName("fk_city_country")
            // Restrict: bir ülke satırını silmek altındaki şehirleri (ve onlara bağlı
            // deneyimleri) sessizce götürmemeli. Ülke silmek zaten olmayacak bir iş.
            .OnDelete(DeleteBehavior.Restrict);

        // Doğal anahtar. İki işi birden yapıyor:
        //   1) Seed idempotent — aynı şehir ikinci kez yazılamaz (Id yeniden üretilmiyor).
        //   2) `?country=CZ` filtresi bu index'in önekinden yararlanıyor.
        builder.HasIndex(x => new { x.CountryCode, x.Slug })
            .IsUnique()
            .HasDatabaseName("ux_city_country_slug");

        // Koordinat üzerinde coğrafi index YOK: bu blokta yakınlık sorgusu yok
        // (PLAN "harita ve coğrafi yakınlık Blok 8"). O blok PostGIS mi earthdistance mı
        // sorusunu kendi verisiyle cevaplasın; şimdi atılan bir index yanlış olanı olur.
    }
}
