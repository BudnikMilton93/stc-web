using Microsoft.EntityFrameworkCore;
using Stc.Domain.Entities;
using Stc.Infrastructure;

namespace Stc.Api.Endpoints;

public static class MovimientosStockEndpoints
{
    public static void MapMovimientosStockEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/movimientos-stock").RequireAuthorization("Activo");

        group.MapGet("/", async (Guid? insumoId, StcDbContext db, CancellationToken ct) =>
        {
            var query = db.MovimientosStock.AsNoTracking().AsQueryable();
            if (insumoId is not null) query = query.Where(m => m.InsumoId == insumoId);

            var movimientos = await query
                .OrderByDescending(m => m.CreatedAt)
                .Select(m => new MovimientoStockResponse(m.Id, m.InsumoId, m.Tipo, m.Cantidad, m.Motivo, m.CreatedAt))
                .ToListAsync(ct);

            return Results.Ok(movimientos);
        });

        // No hay trigger en la base para esto (ver schema): el ajuste de
        // stock_actual del insumo lo hace la aplicacion al registrar el
        // movimiento, no la base de datos.
        group.MapPost("/", async (CrearMovimientoStockRequest request, StcDbContext db, CancellationToken ct) =>
        {
            var insumo = await db.Insumos.FindAsync([request.InsumoId], ct);
            if (insumo is null) return Results.NotFound("Insumo no encontrado.");

            insumo.StockActual = request.Tipo switch
            {
                TipoMovimientoStock.Entrada => insumo.StockActual + request.Cantidad,
                TipoMovimientoStock.Salida => insumo.StockActual - request.Cantidad,
                TipoMovimientoStock.Ajuste => request.Cantidad,
                _ => insumo.StockActual,
            };

            var movimiento = new MovimientoStock
            {
                Id = Guid.NewGuid(),
                InsumoId = request.InsumoId,
                OrdenItemId = request.OrdenItemId,
                Tipo = request.Tipo,
                Cantidad = request.Cantidad,
                Motivo = request.Motivo,
            };

            db.MovimientosStock.Add(movimiento);
            await db.SaveChangesAsync(ct);

            return Results.Created($"/movimientos-stock/{movimiento.Id}",
                new MovimientoStockResponse(movimiento.Id, movimiento.InsumoId, movimiento.Tipo, movimiento.Cantidad, movimiento.Motivo, movimiento.CreatedAt));
        });
    }
}

public record MovimientoStockResponse(Guid Id, Guid InsumoId, TipoMovimientoStock Tipo, decimal Cantidad, string? Motivo, DateTimeOffset CreatedAt);
public record CrearMovimientoStockRequest(Guid InsumoId, Guid? OrdenItemId, TipoMovimientoStock Tipo, decimal Cantidad, string? Motivo);
