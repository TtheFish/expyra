using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Expyra.Domain.Experiences;
using Expyra.Domain.Languages;

namespace Expyra.Infrastructure.Persistence.Configurations;

internal sealed class ExperienceItineraryStepConfiguration : IEntityTypeConfiguration<ExperienceItineraryStep>
{
    public void Configure(EntityTypeBuilder<ExperienceItineraryStep> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        builder.ToTable("experience_itinerary_step");

        builder.HasKey(x => new { x.ExperienceId, x.Language, x.SortOrder });

        builder.Property(x => x.ExperienceId)
            .HasColumnName("experience_id");

        builder.Property(x => x.Language)
            .HasColumnName("language")
            .HasMaxLength(LanguageCode.MaxLength);

        builder.Property(x => x.SortOrder)
            .HasColumnName("sort_order");

        builder.Property(x => x.Title)
            .HasColumnName("title")
            .HasMaxLength(ExperienceItineraryStep.MaxTitleLength)
            .IsRequired();

        builder.Property(x => x.Body)
            .HasColumnName("body")
            .HasMaxLength(ExperienceItineraryStep.MaxBodyLength);

        builder.HasOne<Experience>()
            .WithMany()
            .HasForeignKey(x => x.ExperienceId)
            .HasConstraintName("fk_experience_itinerary_step_experience")
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<Language>()
            .WithMany()
            .HasForeignKey(x => x.Language)
            .HasPrincipalKey(x => x.Code)
            .HasConstraintName("fk_experience_itinerary_step_language")
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => x.Language)
            .HasDatabaseName("ix_experience_itinerary_step_language");
    }
}
