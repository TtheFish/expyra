using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Expyra.Domain.Common;
using Expyra.Domain.Places;

namespace Expyra.Infrastructure.Persistence.Configurations;

internal sealed class CityAliasConfiguration : IEntityTypeConfiguration<CityAlias>
{
    public void Configure(EntityTypeBuilder<CityAlias> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        builder.ToTable("city_alias");

        // Bileşik doğal anahtar: aynı şehir için aynı katlanmış metin iki kez giremez.
        // Surrogate Id verilseydi tekrarı ayrıca bir unique index ile engellemek
        // gerekirdi — aynı garantiyi bir sütun daha ödeyerek almak.
        builder.HasKey(x => new { x.CityId, x.NormalizedName });

        builder.Property(x => x.CityId).HasColumnName("city_id");

        builder.Property(x => x.NormalizedName)
            .HasColumnName("normalized_name")
            .HasMaxLength(SearchText.MaxLength)
            // "C" collation = byte sırası. İKİ nedenle şart:
            //   1) LIKE 'önek%' ancak C collation'da (ya da *_pattern_ops opclass'ıyla)
            //      düz btree index kullanabilir; dil bazlı collation'da index atlanır ve
            //      autocomplete her tuşta tam tarama yapar.
            //   2) Metin zaten SearchText.Fold'dan geçmiş — dil bazlı sıralama kurallarının
            //      uygulanacağı bir şey kalmadı; C hem doğru hem hızlı.
            .UseCollation("C")
            .IsRequired();

        builder.Property(x => x.DisplayName)
            .HasColumnName("display_name")
            .HasMaxLength(SearchText.MaxLength)
            .IsRequired();

        builder.HasOne(x => x.City)
            .WithMany(x => x.Aliases)
            .HasForeignKey(x => x.CityId)
            .HasConstraintName("fk_city_alias_city")
            // Cascade: alias türetilmiş veri, şehir gidince tek başına anlamı yok.
            .OnDelete(DeleteBehavior.Cascade);

        // Aramanın TAMAMI bu index'in üzerinde duruyor: birincil anahtar
        // (city_id, normalized_name) önek taramasına yaramaz, çünkü sorgu city_id
        // bilmiyor — aranan şeyin kendisi o. Bu, "sorgusu olmayan index yazma"
        // kuralının istisnası değil, tam tersi: kabul kriteri 1 ve 2 buna bağlı.
        builder.HasIndex(x => x.NormalizedName)
            .HasDatabaseName("ix_city_alias_normalized");
    }
}
