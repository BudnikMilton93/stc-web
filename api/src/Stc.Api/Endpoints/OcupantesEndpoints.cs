using Microsoft.EntityFrameworkCore;
using Stc.Domain.Entities;
using Stc.Infrastructure;

namespace Stc.Api.Endpoints;

public static class OcupantesEndpoints
{
    public static void MapOcupantesEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/ocupantes").RequireAuthorization("Staff");

        group.MapGet("/", async (Guid? unidadId, StcDbContext db, CancellationToken ct) =>
        {
            var query = db.Ocupantes.AsNoTracking().AsQueryable();
            if (unidadId is not null) query = query.Where(o => o.UnidadId == unidadId);

            var ocupantes = await query
                .OrderBy(o => o.Nombre)
                .Select(o => new OcupanteResponse(o.Id, o.UnidadId, o.Nombre, o.Telefono, o.Email, o.EsTitular, o.Notas))
                .ToListAsync(ct);

            return Results.Ok(ocupantes);
        });

        group.MapGet("/{id:guid}", async (Guid id, StcDbContext db, CancellationToken ct) =>
        {
            var ocupante = await db.Ocupantes
                .AsNoTracking()
                .Where(o => o.Id == id)
                .Select(o => new OcupanteResponse(o.Id, o.UnidadId, o.Nombre, o.Telefono, o.Email, o.EsTitular, o.Notas))
                .SingleOrDefaultAsync(ct);

            return ocupante is null ? Results.NotFound() : Results.Ok(ocupante);
        });

        group.MapPost("/", async (CrearOcupanteRequest request, StcDbContext db, CancellationToken ct) =>
        {
            var ocupante = new Ocupante
            {
                Id = Guid.NewGuid(),
                UnidadId = request.UnidadId,
                Nombre = request.Nombre,
                Telefono = request.Telefono,
                Email = request.Email,
                EsTitular = request.EsTitular,
                Notas = request.Notas,
            };

            db.Ocupantes.Add(ocupante);
            await db.SaveChangesAsync(ct);

            return Results.Created($"/ocupantes/{ocupante.Id}",
                new OcupanteResponse(ocupante.Id, ocupante.UnidadId, ocupante.Nombre, ocupante.Telefono, ocupante.Email, ocupante.EsTitular, ocupante.Notas));
        });

        group.MapPut("/{id:guid}", async (Guid id, ActualizarOcupanteRequest request, StcDbContext db, CancellationToken ct) =>
        {
            var ocupante = await db.Ocupantes.FindAsync([id], ct);
            if (ocupante is null) return Results.NotFound();

            ocupante.Nombre = request.Nombre;
            ocupante.Telefono = request.Telefono;
            ocupante.Email = request.Email;
            ocupante.EsTitular = request.EsTitular;
            ocupante.Notas = request.Notas;

            await db.SaveChangesAsync(ct);

            return Results.Ok(new OcupanteResponse(ocupante.Id, ocupante.UnidadId, ocupante.Nombre, ocupante.Telefono, ocupante.Email, ocupante.EsTitular, ocupante.Notas));
        });

        group.MapDelete("/{id:guid}", async (Guid id, StcDbContext db, CancellationToken ct) =>
        {
            var filas = await db.Ocupantes.Where(o => o.Id == id).ExecuteDeleteAsync(ct);
            return filas == 0 ? Results.NotFound() : Results.NoContent();
        }).RequireAuthorization("Admin");
    }
}

public record OcupanteResponse(Guid Id, Guid UnidadId, string Nombre, string? Telefono, string? Email, bool EsTitular, string? Notas);
public record CrearOcupanteRequest(Guid UnidadId, string Nombre, string? Telefono, string? Email, bool EsTitular, string? Notas);
public record ActualizarOcupanteRequest(string Nombre, string? Telefono, string? Email, bool EsTitular, string? Notas);
