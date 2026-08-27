using System.Security.Claims;

namespace Stc.Api.Auth;

public static class CurrentUserExtensions
{
    public static Guid GetUsuarioId(this ClaimsPrincipal user) =>
        Guid.Parse(user.FindFirstValue("usuario_id")!);

    public static bool IsAdmin(this ClaimsPrincipal user) =>
        user.FindFirstValue("rol") == "Admin";
}
