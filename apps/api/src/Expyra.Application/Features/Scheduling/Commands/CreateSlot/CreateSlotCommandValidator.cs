using FluentValidation;

namespace Expyra.Application.Features.Scheduling.Commands.CreateSlot;

internal sealed class CreateSlotCommandValidator : AbstractValidator<CreateSlotCommand>
{
    public CreateSlotCommandValidator()
    {
        RuleFor(x => x.ExperienceId).NotEmpty();

        // Tam sayı olarak gelen tanımsız değer (JsonStringEnumConverter izin veriyor).
        RuleFor(x => x.DstOverlap).IsInEnum();
    }
}
