using Microsoft.EntityFrameworkCore;
using Stc.Api.Auth;
using Stc.Domain.Entities;
using Stc.Domain.Enums;
using Stc.Infrastructure;

namespace Stc.Api.Endpoints;

public static class OrdenesEndpoints
{
    public static void MapOrdenesEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/ordenes").RequireAuthorization("Staff");

        group.MapGet("/", async (Guid? clienteId, EstadoOrden? estado, StcDbContext db, CancellationToken ct) =>
        {
            var query = db.OrdenesTrabajo.AsNoTracking().AsQueryable();
            if (clienteId is not null) query = query.Where(o => o.ClienteId == clienteId);
            if (estado is not null) query = query.Where(o => o.Estado == estado);

            var ordenes = await query
                .OrderByDescending(o => o.FechaSolicitud)
                .Select(o => new OrdenResponse(o.Id, o.ClienteId, o.SitioId, o.ActivoId, o.TecnicoId, o.TipoServicio, o.Descripcion, o.Estado, o.Prioridad, o.FechaSolicitud, o.FechaProgramada))
                .ToListAsync(ct);

            return Results.Ok(ordenes);
        });

        group.MapGet("/{id:guid}", async (Guid id, StcDbContext db, CancellationToken ct) =>
        {
            var orden = await db.OrdenesTrabajo
                .AsNoTracking()
                .Where(o => o.Id == id)
                .Select(o => new OrdenResponse(o.Id, o.ClienteId, o.SitioId, o.ActivoId, o.TecnicoId, o.TipoServicio, o.Descripcion, o.Estado, o.Prioridad, o.FechaSolicitud, o.FechaProgramada))
                .SingleOrDefaultAsync(ct);

            return orden is null ? Results.NotFound() : Results.Ok(orden);
        });

        group.MapPost("/", async (CrearOrdenRequest request, StcDbContext db, CancellationToken ct) =>
        {
            var orden = new OrdenTrabajo
            {
                Id = Guid.NewGuid(),
                ClienteId = request.ClienteId,
                SitioId = request.SitioId,
                ActivoId = request.ActivoId,
                TecnicoId = request.TecnicoId,
                TipoServicio = request.TipoServicio,
                Descripcion = request.Descripcion,
                Prioridad = request.Prioridad,
                FechaProgramada = request.FechaProgramada,
                FechaSolicitud = DateTimeOffset.UtcNow,
            };

            db.OrdenesTrabajo.Add(orden);
            await db.SaveChangesAsync(ct);

            return Results.Created($"/ordenes/{orden.Id}",
                new OrdenResponse(orden.Id, orden.ClienteId, orden.SitioId, orden.ActivoId, orden.TecnicoId, orden.TipoServicio, orden.Descripcion, orden.Estado, orden.Prioridad, orden.FechaSolicitud, orden.FechaProgramada));
        });

        // Caso especial (no cubierto por una policy generica, ver RLS original):
        // el update lo puede hacer el admin o el tecnico asignado a esa orden puntual.
        group.MapPut("/{id:guid}", async (Guid id, ActualizarOrdenRequest request, HttpContext http, StcDbContext db, CancellationToken ct) =>
        {
            var orden = await db.OrdenesTrabajo.FindAsync([id], ct);
            if (orden is null) return Results.NotFound();

            var esAdmin = http.User.IsAdmin();
            var esTecnicoAsignado = orden.TecnicoId == http.User.GetUsuarioId();
            if (!esAdmin && !esTecnicoAsignado) return Results.Forbid();

            orden.Estado = request.Estado;
            orden.TecnicoId = request.TecnicoId;
            orden.FechaProgramada = request.FechaProgramada;
            orden.FechaResolucion = request.FechaResolucion;
            orden.NotasResolucion = request.NotasResolucion;

            await db.SaveChangesAsync(ct);

            return Results.Ok(new OrdenResponse(orden.Id, orden.ClienteId, orden.SitioId, orden.ActivoId, orden.TecnicoId, orden.TipoServicio, orden.Descripcion, orden.Estado, orden.Prioridad, orden.FechaSolicitud, orden.FechaProgramada));
        });

        group.MapDelete("/{id:guid}", async (Guid id, StcDbContext db, CancellationToken ct) =>
        {
            var filas = await db.OrdenesTrabajo.Where(o => o.Id == id).ExecuteDeleteAsync(ct);
            return filas == 0 ? Results.NotFound() : Results.NoContent();
        }).RequireAuthorization("Admin");
    }
}

public record OrdenResponse(
    Guid Id, Guid ClienteId, Guid? SitioId, Guid? ActivoId, Guid? TecnicoId,
    TipoServicio TipoServicio, string Descripcion, EstadoOrden Estado, PrioridadOrden Prioridad,
    DateTimeOffset FechaSolicitud, DateTimeOffset? FechaProgramada);

public record CrearOrdenRequest(
    Guid ClienteId, Guid? SitioId, Guid? ActivoId, Guid? TecnicoId,
    TipoServicio TipoServicio, string Descripcion, PrioridadOrden Prioridad, DateTimeOffset? FechaProgramada);

public record ActualizarOrdenRequest(
    EstadoOrden Estado, Guid? TecnicoId, DateTimeOffset? FechaProgramada,
    DateTimeOffset? FechaResolucion, string? NotasResolucion);
