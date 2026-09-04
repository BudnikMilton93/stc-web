using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Stc.Domain.Entities;
using Stc.Domain.Enums;
using Stc.Infrastructure;

namespace Stc.Api.Tests.Infrastructure;

/// <summary>
/// Helpers para sembrar datos directo en la base del contenedor (bypaseando la
/// API) y para armar HttpClients autenticados como un usuario en particular.
/// </summary>
public static class TestDataFactory
{
    public static HttpClient CreateAnonymousClient(this StcApiFactory factory) => factory.CreateClient();

    /// <summary>
    /// Cliente HTTP que se autentica como si el JWT tuviese "sub" = authId.
    /// CurrentUserEnrichmentMiddleware busca ese authId en 'usuarios' para
    /// agregar los claims activo/usuario_id reales.
    /// </summary>
    public static HttpClient CreateClientAs(this StcApiFactory factory, Guid authId)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("Authorization", $"Bearer {authId}");
        return client;
    }

    public static async Task<Usuario> SeedUsuarioAsync(
        this StcApiFactory factory,
        bool activo = true,
        Guid? authId = null)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<StcDbContext>();

        var usuario = new Usuario
        {
            Id = Guid.NewGuid(),
            AuthId = authId ?? Guid.NewGuid(),
            Nombre = $"Usuario {Guid.NewGuid():N}",
            Email = $"{Guid.NewGuid():N}@stc-test.local",
            Activo = activo,
        };

        db.Usuarios.Add(usuario);
        await db.SaveChangesAsync();

        return usuario;
    }

    public static async Task<Cliente> SeedClienteAsync(this StcApiFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<StcDbContext>();

        var cliente = new Cliente
        {
            Id = Guid.NewGuid(),
            Tipo = TipoCliente.Persona,
            Nombre = $"Cliente {Guid.NewGuid():N}",
        };

        db.Clientes.Add(cliente);
        await db.SaveChangesAsync();

        return cliente;
    }

    public static async Task<OrdenTrabajo> SeedOrdenAsync(
        this StcApiFactory factory, Guid clienteId, Guid? tecnicoId = null)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<StcDbContext>();

        var orden = new OrdenTrabajo
        {
            Id = Guid.NewGuid(),
            ClienteId = clienteId,
            TecnicoId = tecnicoId,
            TipoServicio = TipoServicio.Instalacion,
            Descripcion = "Orden de prueba",
            Estado = EstadoOrden.Pendiente,
            Prioridad = PrioridadOrden.Normal,
            FechaSolicitud = DateTimeOffset.UtcNow,
        };

        db.OrdenesTrabajo.Add(orden);
        await db.SaveChangesAsync();

        return orden;
    }

    public static async Task<Sitio> SeedSitioAsync(this StcApiFactory factory, Guid clienteId)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<StcDbContext>();

        var sitio = new Sitio
        {
            Id = Guid.NewGuid(),
            ClienteId = clienteId,
            Nombre = $"Sitio {Guid.NewGuid():N}",
            Tipo = TipoSitio.Edificio,
            Direccion = "Direccion de prueba 123",
        };

        db.Sitios.Add(sitio);
        await db.SaveChangesAsync();

        return sitio;
    }

    public static async Task<Unidad> SeedUnidadAsync(this StcApiFactory factory, Guid sitioId)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<StcDbContext>();

        var unidad = new Unidad
        {
            Id = Guid.NewGuid(),
            SitioId = sitioId,
            Identificador = $"Unidad {Guid.NewGuid():N}",
        };

        db.Unidades.Add(unidad);
        await db.SaveChangesAsync();

        return unidad;
    }

    public static async Task<Ocupante> SeedOcupanteAsync(this StcApiFactory factory, Guid unidadId)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<StcDbContext>();

        var ocupante = new Ocupante
        {
            Id = Guid.NewGuid(),
            UnidadId = unidadId,
            Nombre = $"Ocupante {Guid.NewGuid():N}",
        };

        db.Ocupantes.Add(ocupante);
        await db.SaveChangesAsync();

        return ocupante;
    }

    public static async Task<Activo> SeedActivoAsync(
        this StcApiFactory factory,
        Guid clienteId,
        Guid? sitioId = null,
        Guid? unidadId = null,
        Guid? ocupanteId = null,
        TipoActivo tipo = TipoActivo.Camara)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<StcDbContext>();

        var activo = new Activo
        {
            Id = Guid.NewGuid(),
            ClienteId = clienteId,
            SitioId = sitioId,
            UnidadId = unidadId,
            OcupanteId = ocupanteId,
            Tipo = tipo,
        };

        db.Activos.Add(activo);
        await db.SaveChangesAsync();

        return activo;
    }

    public static async Task<Activo?> FindActivoAsync(this StcApiFactory factory, Guid activoId)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<StcDbContext>();

        return await db.Activos.AsNoTracking().SingleOrDefaultAsync(a => a.Id == activoId);
    }

    public static async Task<Insumo> SeedInsumoAsync(this StcApiFactory factory, decimal stockActual = 0)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<StcDbContext>();

        var insumo = new Insumo
        {
            Id = Guid.NewGuid(),
            Nombre = $"Insumo {Guid.NewGuid():N}",
            Unidad = "unidad",
            StockActual = stockActual,
            StockMinimo = 0,
        };

        db.Insumos.Add(insumo);
        await db.SaveChangesAsync();

        return insumo;
    }

    public static async Task<decimal> GetStockActualAsync(this StcApiFactory factory, Guid insumoId)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<StcDbContext>();

        return await db.Insumos.AsNoTracking().Where(i => i.Id == insumoId).Select(i => i.StockActual).SingleAsync();
    }

    public static async Task<OrdenTrabajo?> FindOrdenAsync(this StcApiFactory factory, Guid ordenId)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<StcDbContext>();

        return await db.OrdenesTrabajo.AsNoTracking().SingleOrDefaultAsync(o => o.Id == ordenId);
    }
}
