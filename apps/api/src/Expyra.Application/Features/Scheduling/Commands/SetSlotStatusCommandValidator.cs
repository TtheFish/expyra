using FluentValidation;

namespace Expyra.Application.Features.Scheduling.Commands;

/// <summary>
/// <c>JsonStringEnumConverter</c> tam sayıyı da kabul ediyor; <c>"status": 7</c>
/// tanımsız bir enum değeri olarak handler'a ulaşmamalı.
/// </summary>
internal sealed class SetSlotStatusCommandValidator : AbstractValidator<SetSlotStatusCommand>
{
    public SetSlotStatusCommandValidator()
    {
        RuleFor(x => x.ExperienceId).NotEmpty();
        RuleFor(x => x.SlotId).NotEmpty();
        RuleFor(x => x.Status).IsInEnum();
    }
}
