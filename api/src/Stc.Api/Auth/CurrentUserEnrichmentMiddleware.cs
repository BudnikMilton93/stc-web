using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Stc.Infrastructure;

namespace Stc.Api.Auth;

/// <summary>
/// Supabase Auth solo sabe "quien es" (auth_id). Este middleware busca el
/// registro correspondiente en 'usuarios' y agrega claims (rol, activo,
/// usuario_id) para que las policies de autorizacion y los endpoints no
/// tengan que repetir esa consulta.
/// </summary>
public class CurrentUserEnrichmentMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context, StcDbContext db)
    {
        var authId = context.User.FindFirstValue("sub");

        if (context.User.Identity?.IsAuthenticated == true && Guid.TryParse(authId, out var authGuid))
        {
            var usuario = await db.Usuarios
                .AsNoTracking()
                .Where(u => u.AuthId == authGuid && u.Activo)
                .Select(u => new { u.Id, u.Rol })
                .SingleOrDefaultAsync(context.RequestAborted);

            if (usuario is not null)
            {
                var identity = (ClaimsIdentity)context.User.Identity!;
                identity.AddClaim(new Claim("usuario_id", usuario.Id.ToString()));
                identity.AddClaim(new Claim("rol", usuario.Rol.ToString()));
                identity.AddClaim(new Claim("activo", "true"));
            }
        }

        await next(context);
    }
}
