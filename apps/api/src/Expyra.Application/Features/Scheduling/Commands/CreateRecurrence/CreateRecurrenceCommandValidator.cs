using FluentValidation;
using Expyra.Domain.Scheduling;

namespace Expyra.Application.Features.Scheduling.Commands.CreateRecurrence;

internal sealed class CreateRecurrenceCommandValidator : AbstractValidator<CreateRecurrenceCommand>
{
    public CreateRecurrenceCommandValidator()
    {
        RuleFor(x => x.ExperienceId).NotEmpty();

        RuleFor(x => x.DaysOfWeek)
            .NotEmpty()
            .WithMessage("En az bir gün seçilmeli.")
            .Must(days => days.Count <= ScheduleRules.MaxTemplatesPerExperience)
            .WithMessage($"En fazla {ScheduleRules.MaxTemplatesPerExperience} gün verilebilir.")
            // Tekrarlanan gün, aynı isteğin kendi içinde çakışması demek — index'e
            // çarpıp 500 üretmesindense burada 400.
            .Must(days => days.Distinct().Count() == days.Count)
            .WithMessage("Aynı gün birden fazla kez verilemez.");

        // JsonStringEnumConverter tam sayıyı da kabul ediyor: `9` gelirse
        // ck_recurrence_template_day_of_week'e çarpıp 500 olurdu (#44).
        RuleForEach(x => x.DaysOfWeek).IsInEnum();

        RuleFor(x => x.DstOverlap).IsInEnum();

        // Saniye ve altı REDDEDİLİYOR: seans başlangıcı dakika hassasiyetinde ve
        // "14:00:30" gibi bir değer, ekranda 14:00 görünüp veritabanında başka
        // olurdu.
        RuleFor(x => x.StartTimeLocal)
            .Must(time => time.Second == 0 && time.Millisecond == 0)
            .WithMessage("Başlangıç saati dakika hassasiyetinde olmalı.");

        RuleFor(x => x.EndsOnLocal)
            .GreaterThanOrEqualTo(x => x.StartsOnLocal)
            .When(x => x.EndsOnLocal.HasValue)
            .WithMessage("Bitiş tarihi başlangıçtan önce olamaz.");
    }
}
