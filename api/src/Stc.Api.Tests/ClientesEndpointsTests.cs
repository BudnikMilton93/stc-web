using System.Net;
using System.Net.Http.Json;
using Stc.Api.Endpoints;
using Stc.Api.Tests.Infrastructure;
using Stc.Domain.Enums;

namespace Stc.Api.Tests;

/// <summary>
/// CRUD feliz de punta a punta sobre un recurso que sigue el patron estandar
/// (policy Activo para todo el grupo), y confirma que los enums viajan en
/// camelCase (TipoCliente.Persona -> "persona") como espera el frontend.
/// </summary>
[Collection(PostgresApiCollection.Name)]
public class ClientesEndpointsTests(PostgresApiFixture fixture)
{
    private readonly StcApiFactory _factory = fixture.Factory;

    [Fact]
    public async Task Crud_completo_de_un_cliente()
    {
        var usuario = await _factory.SeedUsuarioAsync();
        var client = _factory.CreateClientAs(usuario.AuthId!.Value);

        var crear = new CrearClienteRequest(TipoCliente.Persona, "Maria Lopez", "20-12345678-9", "maria@test.local", "1133334444", "Av. Siempre Viva 123", null);
        var postResponse = await client.PostAsJsonAsync("/clientes", crear);
        Assert.Equal(HttpStatusCode.Created, postResponse.StatusCode);

        var postBody = await postResponse.Content.ReadAsStringAsync();
        Assert.Contains("\"tipo\":\"persona\"", postBody);

        var creado = await postResponse.Content.ReadFromJsonAsync<ClienteResponse>(ApiJson.Options);
        Assert.NotNull(creado);
        Assert.Equal("Maria Lopez", creado!.Nombre);

        var getResponse = await client.GetAsync($"/clientes/{creado.Id}");
        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);
        var obtenido = await getResponse.Content.ReadFromJsonAsync<ClienteResponse>(ApiJson.Options);
        Assert.Equal(creado.Id, obtenido!.Id);

        var actualizar = new ActualizarClienteRequest(TipoCliente.Empresa, "Maria Lopez S.A.", creado.DniCuit, creado.Email, creado.Telefono, creado.Direccion, "Cliente actualizado");
        var putResponse = await client.PutAsJsonAsync($"/clientes/{creado.Id}", actualizar);
        Assert.Equal(HttpStatusCode.OK, putResponse.StatusCode);
        var actualizado = await putResponse.Content.ReadFromJsonAsync<ClienteResponse>(ApiJson.Options);
        Assert.Equal("Maria Lopez S.A.", actualizado!.Nombre);
        Assert.Equal(TipoCliente.Empresa, actualizado.Tipo);

        var deleteResponse = await client.DeleteAsync($"/clientes/{creado.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var getTrasBorrado = await client.GetAsync($"/clientes/{creado.Id}");
        Assert.Equal(HttpStatusCode.NotFound, getTrasBorrado.StatusCode);
    }
}
