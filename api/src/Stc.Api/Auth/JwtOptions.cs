namespace Stc.Api.Auth;

public class JwtOptions
{
    public const string SectionName = "Supabase:Jwt";

    // https://<proyecto>.supabase.co/auth/v1 — no es secreto.
    public string Issuer { get; set; } = null!;

    // Claves publicas de firma (JWT Signing Keys), rotables. Se resuelve
    // automaticamente a partir del Issuer si no se especifica.
    public string? JwksUri { get; set; }
}
