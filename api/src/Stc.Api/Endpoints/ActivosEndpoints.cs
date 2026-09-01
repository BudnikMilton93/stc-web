using Microsoft.EntityFrameworkCore;
using Stc.Domain.Entities;
using Stc.Domain.Enums;
using Stc.Infrastructure;

namespace Stc.Api.Endpoints;

public static class ActivosEndpoints
{
    public static void MapActivosEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/activos").RequireAuthorization("Activo");

        group.MapGet("/", async (Guid? clienteId, Guid? sitioId, Guid? unidadId, StcDbContext db, CancellationToken ct) =>
        {
            var query = db.Activos.AsNoTracking().AsQueryable();
            if (clienteId is not null) query = query.Where(a => a.ClienteId == clienteId);
            if (sitioId is not null) query = query.Where(a => a.SitioId == sitioId);
            if (unidadId is not null) query = query.Where(a => a.UnidadId == unidadId);

            var activos = await query
                .OrderByDescending(a => a.CreatedAt)
                .Select(a => new ActivoResponse(a.Id, a.ClienteId, a.SitioId, a.UnidadId, a.OcupanteId, a.Tipo, a.Marca, a.Modelo, a.NumeroSerie, a.FechaInstalacion, a.GarantiaHasta, a.Estado, a.Notas))
                .ToListAsync(ct);

            return Results.Ok(activos);
        });

        group.MapGet("/{id:guid}", async (Guid id, StcDbContext db, CancellationToken ct) =>
        {
            var activo = await db.Activos
                .AsNoTracking()
                .Where(a => a.Id == id)
                .Select(a => new ActivoResponse(a.Id, a.ClienteId, a.SitioId, a.UnidadId, a.OcupanteId, a.Tipo, a.Marca, a.Modelo, a.NumeroSerie, a.FechaInstalacion, a.GarantiaHasta, a.Estado, a.Notas))
                .SingleOrDefaultAsync(ct);

            return activo is null ? Results.NotFound() : Results.Ok(activo);
        });

        group.MapPost("/", async (CrearActivoRequest request, StcDbContext db, CancellationToken ct) =>
        {
            var activo = new Activo
            {
                Id = Guid.NewGuid(),
                ClienteId = request.ClienteId,
                SitioId = request.SitioId,
                UnidadId = request.UnidadId,
                OcupanteId = request.OcupanteId,
                Tipo = request.Tipo,
                Marca = request.Marca,
                Modelo = request.Modelo,
                NumeroSerie = request.NumeroSerie,
                FechaInstalacion = request.FechaInstalacion,
                GarantiaHasta = request.GarantiaHasta,
                Notas = request.Notas,
            };

            db.Activos.Add(activo);
            await db.SaveChangesAsync(ct);

            return Results.Created($"/activos/{activo.Id}",
                new ActivoResponse(activo.Id, activo.ClienteId, activo.SitioId, activo.UnidadId, activo.OcupanteId, activo.Tipo, activo.Marca, activo.Modelo, activo.NumeroSerie, activo.FechaInstalacion, activo.GarantiaHasta, activo.Estado, activo.Notas));
        });

        group.MapPut("/{id:guid}", async (Guid id, ActualizarActivoRequest request, StcDbContext db, CancellationToken ct) =>
        {
            var activo = await db.Activos.FindAsync([id], ct);
            if (activo is null) return Results.NotFound();

            activo.Tipo = request.Tipo;
            activo.OcupanteId = request.OcupanteId;
            activo.Marca = request.Marca;
            activo.Modelo = request.Modelo;
            activo.NumeroSerie = request.NumeroSerie;
            activo.Estado = request.Estado;
            activo.FechaInstalacion = request.FechaInstalacion;
            activo.GarantiaHasta = request.GarantiaHasta;
            activo.Notas = request.Notas;

            await db.SaveChangesAsync(ct);

            return Results.Ok(new ActivoResponse(activo.Id, activo.ClienteId, activo.SitioId, activo.UnidadId, activo.OcupanteId, activo.Tipo, activo.Marca, activo.Modelo, activo.NumeroSerie, activo.FechaInstalacion, activo.GarantiaHasta, activo.Estado, activo.Notas));
        });

        group.MapDelete("/{id:guid}", async (Guid id, StcDbContext db, CancellationToken ct) =>
        {
            var filas = await db.Activos.Where(a => a.Id == id).ExecuteDeleteAsync(ct);
            return filas == 0 ? Results.NotFound() : Results.NoContent();
        });
    }
}

public record ActivoResponse(
    Guid Id, Guid ClienteId, Guid? SitioId, Guid? UnidadId, Guid? OcupanteId, TipoActivo Tipo,
    string? Marca, string? Modelo, string? NumeroSerie, DateOnly? FechaInstalacion, DateOnly? GarantiaHasta,
    EstadoActivo Estado, string? Notas);

public record CrearActivoRequest(
    Guid ClienteId, Guid? SitioId, Guid? UnidadId, Guid? OcupanteId, TipoActivo Tipo,
    string? Marca, string? Modelo, string? NumeroSerie, DateOnly? FechaInstalacion, DateOnly? GarantiaHasta, string? Notas);

public record ActualizarActivoRequest(
    TipoActivo Tipo, Guid? OcupanteId, string? Marca, string? Modelo, string? NumeroSerie,
    DateOnly? FechaInstalacion, DateOnly? GarantiaHasta, EstadoActivo Estado, string? Notas);
