using System.Globalization;
using FluentValidation;
using Expyra.Domain.Scheduling;

namespace Expyra.Application.Features.Scheduling.Commands;

/// <summary>
/// İki kural da veritabanında kısıt olarak duruyor (<c>ck_availability_blackout_range</c>,
/// <c>note varchar(200)</c>). Validator olmadan ihlal 400 değil, DbUpdateException
/// üzerinden 500 olarak çıkıyordu (#44).
/// </summary>
internal sealed class CreateBlackoutCommandValidator : AbstractValidator<CreateBlackoutCommand>
{
    public CreateBlackoutCommandValidator()
    {
        RuleFor(x => x.ExperienceId).NotEmpty();

        RuleFor(x => x.EndsOnLocal)
            .GreaterThanOrEqualTo(x => x.StartsOnLocal)
            .WithMessage("Bitiş tarihi başlangıçtan önce olamaz.");

        // Not KIRPILMADAN yazılıyor; ölçü de kırpılmadan alınmalı, yoksa boşlukla
        // dolu bir not doğrulamayı geçip kolona sığmazdı.
        RuleFor(x => x.Note)
            .MaximumLength(AvailabilityBlackout.MaxNoteLength)
            .WithMessage(string.Create(
                CultureInfo.InvariantCulture,
                $"Not en fazla {AvailabilityBlackout.MaxNoteLength} karakter olabilir."))
            .When(x => x.Note is not null);
    }
}
