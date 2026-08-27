using Microsoft.EntityFrameworkCore;
using Stc.Domain.Entities;
using Stc.Domain.Enums;
using Stc.Infrastructure;

namespace Stc.Api.Endpoints;

public static class SitiosEndpoints
{
    public static void MapSitiosEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/sitios").RequireAuthorization("Staff");

        group.MapGet("/", async (Guid? clienteId, StcDbContext db, CancellationToken ct) =>
        {
            var query = db.Sitios.AsNoTracking().AsQueryable();
            if (clienteId is not null) query = query.Where(s => s.ClienteId == clienteId);

            var sitios = await query
                .OrderBy(s => s.Nombre)
                .Select(s => new SitioResponse(s.Id, s.ClienteId, s.Nombre, s.Tipo, s.Direccion, s.Ciudad))
                .ToListAsync(ct);

            return Results.Ok(sitios);
        });

        group.MapGet("/{id:guid}", async (Guid id, StcDbContext db, CancellationToken ct) =>
        {
            var sitio = await db.Sitios
                .AsNoTracking()
                .Where(s => s.Id == id)
                .Select(s => new SitioResponse(s.Id, s.ClienteId, s.Nombre, s.Tipo, s.Direccion, s.Ciudad))
                .SingleOrDefaultAsync(ct);

            return sitio is null ? Results.NotFound() : Results.Ok(sitio);
        });

        group.MapPost("/", async (CrearSitioRequest request, StcDbContext db, CancellationToken ct) =>
        {
            var sitio = new Sitio
            {
                Id = Guid.NewGuid(),
                ClienteId = request.ClienteId,
                Nombre = request.Nombre,
                Tipo = request.Tipo,
                Direccion = request.Direccion,
                Ciudad = request.Ciudad,
            };

            db.Sitios.Add(sitio);
            await db.SaveChangesAsync(ct);

            return Results.Created($"/sitios/{sitio.Id}",
                new SitioResponse(sitio.Id, sitio.ClienteId, sitio.Nombre, sitio.Tipo, sitio.Direccion, sitio.Ciudad));
        });

        group.MapPut("/{id:guid}", async (Guid id, ActualizarSitioRequest request, StcDbContext db, CancellationToken ct) =>
        {
            var sitio = await db.Sitios.FindAsync([id], ct);
            if (sitio is null) return Results.NotFound();

            sitio.Nombre = request.Nombre;
            sitio.Tipo = request.Tipo;
            sitio.Direccion = request.Direccion;
            sitio.Ciudad = request.Ciudad;

            await db.SaveChangesAsync(ct);

            return Results.Ok(new SitioResponse(sitio.Id, sitio.ClienteId, sitio.Nombre, sitio.Tipo, sitio.Direccion, sitio.Ciudad));
        });

        group.MapDelete("/{id:guid}", async (Guid id, StcDbContext db, CancellationToken ct) =>
        {
            var filas = await db.Sitios.Where(s => s.Id == id).ExecuteDeleteAsync(ct);
            return filas == 0 ? Results.NotFound() : Results.NoContent();
        }).RequireAuthorization("Admin");
    }
}

public record SitioResponse(Guid Id, Guid ClienteId, string Nombre, TipoSitio Tipo, string Direccion, string? Ciudad);
public record CrearSitioRequest(Guid ClienteId, string Nombre, TipoSitio Tipo, string Direccion, string? Ciudad);
public record ActualizarSitioRequest(string Nombre, TipoSitio Tipo, string Direccion, string? Ciudad);
