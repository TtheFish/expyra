using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Expyra.Application.Common.Interfaces;
using Expyra.Infrastructure.Persistence;
using Expyra.Infrastructure.Time;

namespace Expyra.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(configuration);

        var connectionString = configuration.GetConnectionString("Default")
            ?? throw new InvalidOperationException(
                "ConnectionStrings:Default tanımlı değil. `dotnet user-secrets set` ile ver.");

        services.AddSingleton<IDateTimeProvider, DateTimeProvider>();

        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(connectionString, npgsql =>
            {
                npgsql.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName);
                // Geçici ağ hatalarında tekrar dene. Uzun tutma — hata gizlemek değil,
                // kısa kesintiyi atlatmak için.
                npgsql.EnableRetryOnFailure(maxRetryCount: 3, maxRetryDelay: TimeSpan.FromSeconds(5), null);
                npgsql.CommandTimeout(30);
            }));

        services.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<AppDbContext>());

        return services;
    }
}
