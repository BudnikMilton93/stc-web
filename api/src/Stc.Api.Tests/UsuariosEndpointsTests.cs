using System.Net;
using System.Net.Http.Json;
using Stc.Api.Endpoints;
using Stc.Api.Tests.Infrastructure;

namespace Stc.Api.Tests;

/// <summary>
/// Sistema de un solo usuario: /usuarios ya no tiene CRUD, solo GET /me
/// para que el frontend valide la sesion.
/// </summary>
[Collection(PostgresApiCollection.Name)]
public class UsuariosEndpointsTests(PostgresApiFixture fixture)
{
    private readonly StcApiFactory _factory = fixture.Factory;

    [Fact]
    public async Task GetMe_devuelve_los_datos_del_usuario_autenticado()
    {
        var usuario = await _factory.SeedUsuarioAsync();
        var client = _factory.CreateClientAs(usuario.AuthId!.Value);

        var response = await client.GetAsync("/usuarios/me");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<UsuarioResponse>(ApiJson.Options);
        Assert.NotNull(body);
        Assert.Equal(usuario.Id, body.Id);
        Assert.Equal(usuario.Nombre, body.Nombre);
        Assert.True(body.Activo);
    }
}
