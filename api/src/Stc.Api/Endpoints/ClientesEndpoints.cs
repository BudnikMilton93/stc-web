using Microsoft.EntityFrameworkCore;
using Stc.Domain.Entities;
using Stc.Domain.Enums;
using Stc.Infrastructure;

namespace Stc.Api.Endpoints;

public static class ClientesEndpoints
{
    public static void MapClientesEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/clientes").RequireAuthorization("Staff");

        group.MapGet("/", async (StcDbContext db, CancellationToken ct) =>
        {
            var clientes = await db.Clientes
                .AsNoTracking()
                .OrderBy(c => c.Nombre)
                .Select(c => new ClienteResponse(c.Id, c.Tipo, c.Nombre, c.DniCuit, c.Email, c.Telefono, c.Direccion))
                .ToListAsync(ct);

            return Results.Ok(clientes);
        });

        group.MapGet("/{id:guid}", async (Guid id, StcDbContext db, CancellationToken ct) =>
        {
            var cliente = await db.Clientes
                .AsNoTracking()
                .Where(c => c.Id == id)
                .Select(c => new ClienteResponse(c.Id, c.Tipo, c.Nombre, c.DniCuit, c.Email, c.Telefono, c.Direccion))
                .SingleOrDefaultAsync(ct);

            return cliente is null ? Results.NotFound() : Results.Ok(cliente);
        });

        group.MapPost("/", async (CrearClienteRequest request, StcDbContext db, CancellationToken ct) =>
        {
            var cliente = new Cliente
            {
                Id = Guid.NewGuid(),
                Tipo = request.Tipo,
                Nombre = request.Nombre,
                DniCuit = request.DniCuit,
                Email = request.Email,
                Telefono = request.Telefono,
                Direccion = request.Direccion,
            };

            db.Clientes.Add(cliente);
            await db.SaveChangesAsync(ct);

            return Results.Created($"/clientes/{cliente.Id}",
                new ClienteResponse(cliente.Id, cliente.Tipo, cliente.Nombre, cliente.DniCuit, cliente.Email, cliente.Telefono, cliente.Direccion));
        });

        group.MapPut("/{id:guid}", async (Guid id, ActualizarClienteRequest request, StcDbContext db, CancellationToken ct) =>
        {
            var cliente = await db.Clientes.FindAsync([id], ct);
            if (cliente is null) return Results.NotFound();

            cliente.Tipo = request.Tipo;
            cliente.Nombre = request.Nombre;
            cliente.DniCuit = request.DniCuit;
            cliente.Email = request.Email;
            cliente.Telefono = request.Telefono;
            cliente.Direccion = request.Direccion;

            await db.SaveChangesAsync(ct);

            return Results.Ok(new ClienteResponse(cliente.Id, cliente.Tipo, cliente.Nombre, cliente.DniCuit, cliente.Email, cliente.Telefono, cliente.Direccion));
        });

        // Borrar clientes queda reservado a admin (el patron identico se repite
        // en sitios/unidades/ocupantes/activos/insumos siguiendo la misma RLS de origen).
        group.MapDelete("/{id:guid}", async (Guid id, StcDbContext db, CancellationToken ct) =>
        {
            var filas = await db.Clientes.Where(c => c.Id == id).ExecuteDeleteAsync(ct);
            return filas == 0 ? Results.NotFound() : Results.NoContent();
        }).RequireAuthorization("Admin");
    }
}

public record ClienteResponse(Guid Id, TipoCliente Tipo, string Nombre, string? DniCuit, string? Email, string? Telefono, string? Direccion);

public record CrearClienteRequest(TipoCliente Tipo, string Nombre, string? DniCuit, string? Email, string? Telefono, string? Direccion);

public record ActualizarClienteRequest(TipoCliente Tipo, string Nombre, string? DniCuit, string? Email, string? Telefono, string? Direccion);
