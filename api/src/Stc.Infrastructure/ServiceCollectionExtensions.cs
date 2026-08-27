using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using Stc.Domain.Enums;

namespace Stc.Infrastructure;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, string connectionString)
    {
        var dataSourceBuilder = new NpgsqlDataSourceBuilder(connectionString);

        // Mapea los enums nativos de Postgres (create type ... as enum) a los enums de C#.
        // El traductor snake_case por defecto convierte, por ej., CerraduraMagnetica -> cerradura_magnetica,
        // que coincide con los valores definidos en supabase/migrations.
        dataSourceBuilder.MapEnum<TipoCliente>("tipo_cliente");
        dataSourceBuilder.MapEnum<TipoSitio>("tipo_sitio");
        dataSourceBuilder.MapEnum<TipoActivo>("tipo_activo");
        dataSourceBuilder.MapEnum<EstadoActivo>("estado_activo");
        dataSourceBuilder.MapEnum<TipoServicio>("tipo_servicio");
        dataSourceBuilder.MapEnum<EstadoOrden>("estado_orden");
        dataSourceBuilder.MapEnum<PrioridadOrden>("prioridad_orden");
        dataSourceBuilder.MapEnum<EstadoLead>("estado_lead");
        dataSourceBuilder.MapEnum<RolUsuario>("rol_usuario");

        var dataSource = dataSourceBuilder.Build();
        services.AddSingleton(dataSource);

        services.AddDbContext<StcDbContext>((sp, options) =>
        {
            options
                .UseNpgsql(sp.GetRequiredService<NpgsqlDataSource>(), o =>
                {
                    o.MapEnum<TipoCliente>("tipo_cliente");
                    o.MapEnum<TipoSitio>("tipo_sitio");
                    o.MapEnum<TipoActivo>("tipo_activo");
                    o.MapEnum<EstadoActivo>("estado_activo");
                    o.MapEnum<TipoServicio>("tipo_servicio");
                    o.MapEnum<EstadoOrden>("estado_orden");
                    o.MapEnum<PrioridadOrden>("prioridad_orden");
                    o.MapEnum<EstadoLead>("estado_lead");
                    o.MapEnum<RolUsuario>("rol_usuario");
                })
                .UseSnakeCaseNamingConvention();
        });

        return services;
    }
}
