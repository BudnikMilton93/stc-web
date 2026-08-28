using Microsoft.EntityFrameworkCore;
using Stc.Domain.Entities;
using Stc.Infrastructure;

namespace Stc.Api.Endpoints;

public static class UnidadesEndpoints
{
    public static void MapUnidadesEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/unidades").RequireAuthorization("Staff");

        group.MapGet("/", async (Guid? sitioId, StcDbContext db, CancellationToken ct) =>
        {
            var query = db.Unidades.AsNoTracking().AsQueryable();
            if (sitioId is not null) query = query.Where(u => u.SitioId == sitioId);

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
            await db.SaveChangesAsync(ct);

            return Results.Created($"/unidades/{unidad.Id}",
                new UnidadResponse(unidad.Id, unidad.SitioId, unidad.Identificador, unidad.Piso, unidad.Notas));
        });

        group.MapPut("/{id:guid}", async (Guid id, ActualizarUnidadRequest request, StcDbContext db, CancellationToken ct) =>
        {
            var unidad = await db.Unidades.FindAsync([id], ct);
            if (unidad is null) return Results.NotFound();

            unidad.Identificador = request.Identificador;
            unidad.Piso = request.Piso;
            unidad.Notas = request.Notas;

            await db.SaveChangesAsync(ct);

            return Results.Ok(new UnidadResponse(unidad.Id, unidad.SitioId, unidad.Identificador, unidad.Piso, unidad.Notas));
        });

        group.MapDelete("/{id:guid}", async (Guid id, StcDbContext db, CancellationToken ct) =>
        {
            var filas = await db.Unidades.Where(u => u.Id == id).ExecuteDeleteAsync(ct);
            return filas == 0 ? Results.NotFound() : Results.NoContent();
        }).RequireAuthorization("Admin");
    }
}

public record UnidadResponse(Guid Id, Guid SitioId, string Identificador, string? Piso, string? Notas);
public record CrearUnidadRequest(Guid SitioId, string Identificador, string? Piso, string? Notas);
public record ActualizarUnidadRequest(string Identificador, string? Piso, string? Notas);
