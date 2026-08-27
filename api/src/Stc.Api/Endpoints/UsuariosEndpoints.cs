using Microsoft.EntityFrameworkCore;
using Stc.Domain.Entities;
using Stc.Domain.Enums;
using Stc.Infrastructure;

namespace Stc.Api.Endpoints;

public static class UsuariosEndpoints
{
    public static void MapUsuariosEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/usuarios").RequireAuthorization("Staff");

        group.MapGet("/", async (StcDbContext db, CancellationToken ct) =>
        {
            var usuarios = await db.Usuarios
                .AsNoTracking()
                .OrderBy(u => u.Nombre)
                .Select(u => new UsuarioResponse(u.Id, u.Nombre, u.Email, u.Rol, u.Activo))
                .ToListAsync(ct);

            return Results.Ok(usuarios);
        });

        group.MapPost("/", async (CrearUsuarioRequest request, StcDbContext db, CancellationToken ct) =>
        {
            var usuario = new Usuario
            {
                Id = Guid.NewGuid(),
                AuthId = request.AuthId,
                Nombre = request.Nombre,
                Email = request.Email,
                Rol = request.Rol,
            };

            db.Usuarios.Add(usuario);
            await db.SaveChangesAsync(ct);

            return Results.Created($"/usuarios/{usuario.Id}",
                new UsuarioResponse(usuario.Id, usuario.Nombre, usuario.Email, usuario.Rol, usuario.Activo));
        }).RequireAuthorization("Admin");

        group.MapPut("/{id:guid}", async (Guid id, ActualizarUsuarioRequest request, StcDbContext db, CancellationToken ct) =>
        {
            var usuario = await db.Usuarios.FindAsync([id], ct);
            if (usuario is null) return Results.NotFound();

            usuario.Nombre = request.Nombre;
            usuario.Rol = request.Rol;
            usuario.Activo = request.Activo;

            await db.SaveChangesAsync(ct);

            return Results.Ok(new UsuarioResponse(usuario.Id, usuario.Nombre, usuario.Email, usuario.Rol, usuario.Activo));
        }).RequireAuthorization("Admin");

        group.MapDelete("/{id:guid}", async (Guid id, StcDbContext db, CancellationToken ct) =>
        {
            var filas = await db.Usuarios.Where(u => u.Id == id).ExecuteDeleteAsync(ct);
            return filas == 0 ? Results.NotFound() : Results.NoContent();
        }).RequireAuthorization("Admin");
    }
}

public record UsuarioResponse(Guid Id, string Nombre, string Email, RolUsuario Rol, bool Activo);
public record CrearUsuarioRequest(Guid? AuthId, string Nombre, string Email, RolUsuario Rol);
public record ActualizarUsuarioRequest(string Nombre, RolUsuario Rol, bool Activo);
