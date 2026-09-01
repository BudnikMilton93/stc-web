using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Stc.Api.Auth;
using Stc.Infrastructure;

namespace Stc.Api.Endpoints;

public static class UsuariosEndpoints
{
    public static void MapUsuariosEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/usuarios").RequireAuthorization("Activo");

        group.MapGet("/me", async (ClaimsPrincipal user, StcDbContext db, CancellationToken ct) =>
        {
            var usuarioId = user.GetUsuarioId();

            var usuario = await db.Usuarios
                .AsNoTracking()
                .Where(u => u.Id == usuarioId)
                .Select(u => new UsuarioResponse(u.Id, u.Nombre, u.Email, u.Activo))
                .SingleOrDefaultAsync(ct);

            return usuario is null ? Results.NotFound() : Results.Ok(usuario);
        });
    }
}

public record UsuarioResponse(Guid Id, string Nombre, string Email, bool Activo);
