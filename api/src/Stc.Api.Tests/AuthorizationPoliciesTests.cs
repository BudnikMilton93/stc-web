using System.Net;
using Stc.Api.Tests.Infrastructure;

namespace Stc.Api.Tests;

[Collection(PostgresApiCollection.Name)]
public class AuthorizationPoliciesTests(PostgresApiFixture fixture)
{
    private readonly StcApiFactory _factory = fixture.Factory;

    [Fact]
    public async Task Anonimo_no_puede_acceder_a_un_endpoint_de_policy_Activo()
    {
        var client = _factory.CreateAnonymousClient();

        var response = await client.GetAsync("/clientes");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Usuario_activo_puede_leer_y_borrar_sin_distincion_de_rol()
    {
        var usuario = await _factory.SeedUsuarioAsync();
        var cliente = await _factory.SeedClienteAsync();
        var client = _factory.CreateClientAs(usuario.AuthId!.Value);

        var lectura = await client.GetAsync("/clientes");
        Assert.Equal(HttpStatusCode.OK, lectura.StatusCode);

        var borrado = await client.DeleteAsync($"/clientes/{cliente.Id}");
        Assert.Equal(HttpStatusCode.NoContent, borrado.StatusCode);
    }

    [Fact]
    public async Task Usuario_inactivo_no_puede_acceder_a_un_endpoint_de_policy_Activo()
    {
        var usuario = await _factory.SeedUsuarioAsync(activo: false);
        var client = _factory.CreateClientAs(usuario.AuthId!.Value);

        var response = await client.GetAsync("/clientes");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
