using System.Net;
using System.Net.Http.Json;
using Stc.Api.Endpoints;
using Stc.Api.Tests.Infrastructure;
using Stc.Domain.Enums;

namespace Stc.Api.Tests;

/// <summary>
/// POST /leads es el unico endpoint publico del sistema (formulario de la
/// landing); el resto de 'leads' requiere la policy Activo.
/// </summary>
[Collection(PostgresApiCollection.Name)]
public class LeadsEndpointsTests(PostgresApiFixture fixture)
{
    private readonly StcApiFactory _factory = fixture.Factory;

    [Fact]
    public async Task Anonimo_puede_crear_un_lead()
    {
        var client = _factory.CreateAnonymousClient();
        var request = new CrearLeadRequest("Juan Perez", "1122334455", null, "camaras", "Quiero cotizar");

        var response = await client.PostAsJsonAsync("/leads", request);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task Anonimo_no_puede_listar_leads()
    {
        var client = _factory.CreateAnonymousClient();

        var response = await client.GetAsync("/leads");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Anonimo_no_puede_editar_un_lead()
    {
        var client = _factory.CreateAnonymousClient();
        var request = new ActualizarLeadRequest(EstadoLead.Contactado, null);

        var response = await client.PutAsJsonAsync($"/leads/{Guid.NewGuid()}", request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Usuario_activo_puede_borrar_un_lead()
    {
        var usuario = await _factory.SeedUsuarioAsync();
        var client = _factory.CreateClientAs(usuario.AuthId!.Value);

        var creado = await client.PostAsJsonAsync("/leads", new CrearLeadRequest("Carla Diaz", null, "carla@test.local", null, null));
        var lead = await creado.Content.ReadFromJsonAsync<LeadResponse>(ApiJson.Options);

        var response = await client.DeleteAsync($"/leads/{lead!.Id}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }
}
