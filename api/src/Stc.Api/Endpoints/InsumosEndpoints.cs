using Microsoft.EntityFrameworkCore;
using Stc.Domain.Entities;
using Stc.Infrastructure;

namespace Stc.Api.Endpoints;

public static class InsumosEndpoints
{
    public static void MapInsumosEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/insumos").RequireAuthorization("Staff");

        group.MapGet("/", async (StcDbContext db, CancellationToken ct) =>
        {
            var insumos = await db.Insumos
                .AsNoTracking()
                .OrderBy(i => i.Nombre)
                .Select(i => new InsumoResponse(i.Id, i.Nombre, i.Categoria, i.Sku, i.Unidad, i.StockActual, i.StockMinimo, i.PrecioCosto, i.PrecioVenta))
                .ToListAsync(ct);

            return Results.Ok(insumos);
        });

        group.MapGet("/{id:guid}", async (Guid id, StcDbContext db, CancellationToken ct) =>
        {
            var insumo = await db.Insumos
                .AsNoTracking()
                .Where(i => i.Id == id)
                .Select(i => new InsumoResponse(i.Id, i.Nombre, i.Categoria, i.Sku, i.Unidad, i.StockActual, i.StockMinimo, i.PrecioCosto, i.PrecioVenta))
                .SingleOrDefaultAsync(ct);

            return insumo is null ? Results.NotFound() : Results.Ok(insumo);
        });

        group.MapPost("/", async (CrearInsumoRequest request, StcDbContext db, CancellationToken ct) =>
        {
            var insumo = new Insumo
            {
                Id = Guid.NewGuid(),
                Nombre = request.Nombre,
                Categoria = request.Categoria,
                Sku = request.Sku,
                Unidad = request.Unidad,
                StockMinimo = request.StockMinimo,
                PrecioCosto = request.PrecioCosto,
                PrecioVenta = request.PrecioVenta,
            };

            db.Insumos.Add(insumo);
            await db.SaveChangesAsync(ct);

            return Results.Created($"/insumos/{insumo.Id}",
                new InsumoResponse(insumo.Id, insumo.Nombre, insumo.Categoria, insumo.Sku, insumo.Unidad, insumo.StockActual, insumo.StockMinimo, insumo.PrecioCosto, insumo.PrecioVenta));
        });

        group.MapPut("/{id:guid}", async (Guid id, ActualizarInsumoRequest request, StcDbContext db, CancellationToken ct) =>
        {
            var insumo = await db.Insumos.FindAsync([id], ct);
            if (insumo is null) return Results.NotFound();

            insumo.Nombre = request.Nombre;
            insumo.Categoria = request.Categoria;
            insumo.Sku = request.Sku;
            insumo.Unidad = request.Unidad;
            insumo.StockMinimo = request.StockMinimo;
            insumo.PrecioCosto = request.PrecioCosto;
            insumo.PrecioVenta = request.PrecioVenta;

            await db.SaveChangesAsync(ct);

            return Results.Ok(new InsumoResponse(insumo.Id, insumo.Nombre, insumo.Categoria, insumo.Sku, insumo.Unidad, insumo.StockActual, insumo.StockMinimo, insumo.PrecioCosto, insumo.PrecioVenta));
        });

        group.MapDelete("/{id:guid}", async (Guid id, StcDbContext db, CancellationToken ct) =>
        {
            var filas = await db.Insumos.Where(i => i.Id == id).ExecuteDeleteAsync(ct);
            return filas == 0 ? Results.NotFound() : Results.NoContent();
        }).RequireAuthorization("Admin");
    }
}

public record InsumoResponse(Guid Id, string Nombre, string? Categoria, string? Sku, string Unidad, decimal StockActual, decimal StockMinimo, decimal? PrecioCosto, decimal? PrecioVenta);
public record CrearInsumoRequest(string Nombre, string? Categoria, string? Sku, string Unidad, decimal StockMinimo, decimal? PrecioCosto, decimal? PrecioVenta);
public record ActualizarInsumoRequest(string Nombre, string? Categoria, string? Sku, string Unidad, decimal StockMinimo, decimal? PrecioCosto, decimal? PrecioVenta);
