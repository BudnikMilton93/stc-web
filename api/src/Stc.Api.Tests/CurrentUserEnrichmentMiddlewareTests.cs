using System.Net;
using System.Net.Http.Json;
using Stc.Api.Endpoints;
using Stc.Api.Tests.Infrastructure;

namespace Stc.Api.Tests;

/// <summary>
/// CurrentUserEnrichmentMiddleware es lo que traduce el "sub" del JWT en los
/// claims usuario_id/activo que consume la policy Activo. Se verifica
/// indirectamente pegandole a GET /usuarios/me, que ademas depende de que
/// "usuario_id" haya quedado bien seteado.
/// </summary>
[Collection(PostgresApiCollection.Name)]
public class CurrentUserEnrichmentMiddlewareTests(PostgresApiFixture fixture)
{
    private readonly StcApiFactory _factory = fixture.Factory;

    [Fact]
    public async Task Jwt_de_usuario_activo_termina_con_claims_y_pasa_la_policy_Activo()
    {
        var usuario = await _factory.SeedUsuarioAsync(activo: true);
        var client = _factory.CreateClientAs(usuario.AuthId!.Value);

        var response = await client.GetAsync("/usuarios/me");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<UsuarioResponse>(ApiJson.Options);
        Assert.Equal(usuario.Id, body!.Id);
        Assert.True(body.Activo);
    }

    [Fact]
    public async Task Jwt_de_usuario_inactivo_no_pasa_la_policy_Activo()
    {
        var usuario = await _factory.SeedUsuarioAsync(activo: false);
        var client = _factory.CreateClientAs(usuario.AuthId!.Value);

        var response = await client.GetAsync("/usuarios/me");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Sub_sin_usuario_correspondiente_no_pasa_la_policy_Activo()
    {
        var authIdInexistente = Guid.NewGuid();
        var client = _factory.CreateClientAs(authIdInexistente);

        var response = await client.GetAsync("/usuarios/me");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
