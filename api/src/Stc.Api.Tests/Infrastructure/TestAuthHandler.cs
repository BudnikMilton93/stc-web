using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Stc.Api.Tests.Infrastructure;

/// <summary>
/// Reemplaza la autenticacion JWT real (que valida contra el JWKS de Supabase)
/// para los tests. En vez de un token firmado, los tests mandan un header
/// "Authorization: Bearer &lt;auth-id-guid&gt;" y este handler lo traduce
/// directo a un claim "sub", tal como lo haria un JWT real ya validado.
/// Sin header Authorization => no autenticado (comportamiento anonimo real).
/// </summary>
public class TestAuthHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "TestScheme";
    private const string Prefix = "Bearer ";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue("Authorization", out var authHeaderValues))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var headerValue = authHeaderValues.ToString();
        if (!headerValue.StartsWith(Prefix, StringComparison.OrdinalIgnoreCase))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var sub = headerValue[Prefix.Length..].Trim();
        if (string.IsNullOrWhiteSpace(sub))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var claims = new[] { new Claim("sub", sub) };
        var identity = new ClaimsIdentity(claims, SchemeName);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, SchemeName);

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
