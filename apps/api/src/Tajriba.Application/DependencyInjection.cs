using System.Reflection;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using Tajriba.Application.Common.Behaviors;

namespace Tajriba.Application;

public static class DependencyInjection
{
    /// <summary>
    /// Handler ve validator'lar assembly taramasıyla bulunur.
    /// Yeni feature eklerken buraya HİÇBİR ŞEY yazmana gerek yok.
    /// </summary>
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        var assembly = Assembly.GetExecutingAssembly();

        services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssembly(assembly);
            cfg.AddOpenBehavior(typeof(ValidationBehavior<,>));
        });

        services.AddValidatorsFromAssembly(assembly, includeInternalTypes: true);

        return services;
    }
}
