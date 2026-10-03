using FluentValidation;

namespace Expyra.Application.Features.Scheduling.Commands;

internal sealed class DeleteBlackoutCommandValidator : AbstractValidator<DeleteBlackoutCommand>
{
    public DeleteBlackoutCommandValidator()
    {
        RuleFor(x => x.ExperienceId).NotEmpty();
        RuleFor(x => x.BlackoutId).NotEmpty();
    }
}
