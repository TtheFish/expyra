using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Expyra.Domain.Catalog;

namespace Expyra.Infrastructure.Persistence.Configurations;

internal sealed class CategoryConfiguration : IEntityTypeConfiguration<Category>
{
    public void Configure(EntityTypeBuilder<Category> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        builder.ToTable("category");

        builder.HasKey(x => x.Slug);

        builder.Property(x => x.Slug)
            .HasColumnName("slug")
            .HasMaxLength(Category.MaxSlugLength)
            .IsRequired();

        builder.Property(x => x.SortOrder)
            .HasColumnName("sort_order");

        builder.Property(x => x.IsActive)
            .HasColumnName("is_active")
            .HasDefaultValue(true);

        // Ad/açıklama sütunu YOK — kategori adları Blok 3'ün sözlüğünde
        // (bkz. Category sınıf notu). Index de yok: tablo 12 satır.
    }
}
