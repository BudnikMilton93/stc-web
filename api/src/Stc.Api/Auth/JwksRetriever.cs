using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Tokens;

namespace Stc.Api.Auth;

/// <summary>
/// El endpoint JWKS de Supabase devuelve el documento JWK Set directo
/// (sin el envoltorio de OIDC discovery), asi que se parsea tal cual.
/// </summary>
public class JwksRetriever : IConfigurationRetriever<JsonWebKeySet>
{
    public async Task<JsonWebKeySet> GetConfigurationAsync(string address, IDocumentRetriever retriever, CancellationToken cancel)
    {
        var json = await retriever.GetDocumentAsync(address, cancel);
        return new JsonWebKeySet(json);
    }
}
