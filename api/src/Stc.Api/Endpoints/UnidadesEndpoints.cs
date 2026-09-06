using Microsoft.EntityFrameworkCore;
using Stc.Api.Services;
using Stc.Domain.Entities;
using Stc.Infrastructure;

namespace Stc.Api.Endpoints;

public static class UnidadesEndpoints
{
    public static void MapUnidadesEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/unidades").RequireAuthorization("Activo");

        group.MapGet("/", async (Guid? sitioId, Guid? clienteId, StcDbContext db, CancellationToken ct) =>
        {
            var query = db.Unidades.AsNoTracking().AsQueryable();
            if (sitioId is not null) query = query.Where(u => u.SitioId == sitioId);
            // Trae de una sola vez las unidades de todos los sitios de un cliente,
            // en vez de que el frontend tenga que iterar sitio por sitio. A diferencia
            // de Activo (que desnormaliza ClienteId directo en la fila para este mismo
            // tipo de filtro), Unidad no tiene esa columna -- agregarla implicaria una
            // migracion de schema para un filtro puntual. Se resuelve con un join por
            // navegacion en su lugar; sostenido por el indice idx_sitios_cliente
            // (supabase/migrations/20260724195455_schema.sql), sin costo de scan.
            if (clienteId is not null) query = query.Where(u => u.Sitio.ClienteId == clienteId);

            var unidades = await query
                .OrderBy(u => u.Identificador)
                .Select(u => new UnidadResponse(u.Id, u.SitioId, u.Identificador, u.Piso, u.Notas))
                .ToListAsync(ct);

            return Results.Ok(unidades);
        });

        group.MapGet("/{id:guid}", async (Guid id, StcDbContext db, CancellationToken ct) =>
        {
            var unidad = await db.Unidades
                .AsNoTracking()
                .Where(u => u.Id == id)
                .Select(u => new UnidadResponse(u.Id, u.SitioId, u.Identificador, u.Piso, u.Notas))
                .SingleOrDefaultAsync(ct);

            return unidad is null ? Results.NotFound() : Results.Ok(unidad);
        });

        group.MapPost("/", async (CrearUnidadRequest request, StcDbContext db, CancellationToken ct) =>
        {
            var unidad = new Unidad
            {
                Id = Guid.NewGuid(),
                SitioId = request.SitioId,
                Identificador = request.Identificador,
                Piso = request.Piso,
                Notas = request.Notas,
            };

            db.Unidades.Add(unidad);
            var conflicto = await db.TrySaveChangesAsync(ct);
            if (conflicto is not null) return conflicto;

            return Results.Created($"/unidades/{unidad.Id}",
                new UnidadResponse(unidad.Id, unidad.SitioId, unidad.Identificador, unidad.Piso, unidad.Notas));
        });

        group.MapPut("/{id:guid}", async (Guid id, ActualizarUnidadRequest request, StcDbContext db, CancellationToken ct) =>
        {
            var unidad = await db.Unidades.FindAsync([id], ct);
            if (unidad is null) return Results.NotFound();

            if (BajaLogicaValidator.EsTransicionABaja(unidad.Notas, request.Notas))
            {
                var rechazo = await BajaLogicaValidator.ValidarBajaUnidadAsync(db, id, ct);
                if (rechazo is not null) return rechazo;
            }

            unidad.Identificador = request.Identificador;
            unidad.Piso = request.Piso;
            unidad.Notas = request.Notas;

            var conflicto = await db.TrySaveChangesAsync(ct);
            if (conflicto is not null) return conflicto;

            return Results.Ok(new UnidadResponse(unidad.Id, unidad.SitioId, unidad.Identificador, unidad.Piso, unidad.Notas));
        });
    }
}

public record UnidadResponse(Guid Id, Guid SitioId, string Identificador, string? Piso, string? Notas);
public record CrearUnidadRequest(Guid SitioId, string Identificador, string? Piso, string? Notas);
public record ActualizarUnidadRequest(string Identificador, string? Piso, string? Notas);
