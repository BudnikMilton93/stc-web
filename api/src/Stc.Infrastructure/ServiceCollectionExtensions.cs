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

        // Contra el pooler remoto de Supabase, cada conexion nueva paga un
        // handshake TCP+TLS a traves de internet (varios cientos de ms).
        // Con el Minimum Pool Size por defecto de Npgsql (0), el pool cierra
        // todas las conexiones tras un rato sin trafico (uso tipico de este
        // CRM interno, con huecos entre requests) y el siguiente request
        // vuelve a pagar ese handshake completo antes de poder ejecutar la
        // query. Mantener una conexion minima abierta evita ese costo en el
        // caso comun. Keepalive evita que un NAT/firewall intermedio corte
        // en silencio esa conexion inactiva, lo que forzaria a Npgsql a
        // detectar la conexion rota y reconectar (mismo costo, mas un
        // request fallido) antes de poder servir el request.
        //
        // Esto es un mitigante para la topologia actual (API y pooler de
        // Supabase remotos entre si), no la solucion de fondo -- ver item 12
        // en docs/roadmaps/00-fortalecimiento.md y "Proximos pasos" en
        // docs/arquitectura/02-Backend-API.md sobre donde hospedar la API.
        if (dataSourceBuilder.ConnectionStringBuilder.MinPoolSize == 0)
            dataSourceBuilder.ConnectionStringBuilder.MinPoolSize = 1;
        if (dataSourceBuilder.ConnectionStringBuilder.KeepAlive == 0)
            dataSourceBuilder.ConnectionStringBuilder.KeepAlive = 30;

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
                })
                .UseSnakeCaseNamingConvention();
        });

        return services;
    }
}
