using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace Tajriba.WebApi.Common;

/// <summary>
/// Controller'lar İNCE olur: request'i command/query'ye çevir, Mediator'a ver, dön.
/// İş kuralı controller'a YAZILMAZ — handler'a yazılır (orası test edilebilir).
/// </summary>
[ApiController]
[Produces("application/json")]
public abstract class ApiControllerBase(ISender mediator) : ControllerBase
{
    protected ISender Mediator { get; } = mediator;
}
