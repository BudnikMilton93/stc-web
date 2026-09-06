using System.Net;
using System.Net.Http.Json;
using System.Linq;
using Stc.Api.Endpoints;
using Stc.Api.Tests.Infrastructure;

namespace Stc.Api.Tests;

[Collection(PostgresApiCollection.Name)]
public class OcupantesEndpointsTests(PostgresApiFixture fixture)
{
    private readonly StcApiFactory _factory = fixture.Factory;

    [Fact]
    public async Task Get_filtrando_por_sitioId_devuelve_solo_ocupantes_de_unidades_de_ese_sitio()
    {
        var usuario = await _factory.SeedUsuarioAsync();
        var cliente = await _factory.SeedClienteAsync();

        var sitioA = await _factory.SeedSitioAsync(cliente.Id);
        var unidadA1 = await _factory.SeedUnidadAsync(sitioA.Id);
        var unidadA2 = await _factory.SeedUnidadAsync(sitioA.Id);
        var ocupanteA1 = await _factory.SeedOcupanteAsync(unidadA1.Id);
        var ocupanteA2 = await _factory.SeedOcupanteAsync(unidadA2.Id);

        var sitioB = await _factory.SeedSitioAsync(cliente.Id);
        var unidadB = await _factory.SeedUnidadAsync(sitioB.Id);
        await _factory.SeedOcupanteAsync(unidadB.Id);

        var client = _factory.CreateClientAs(usuario.AuthId!.Value);

        var response = await client.GetAsync($"/ocupantes?sitioId={sitioA.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var ocupantes = await response.Content.ReadFromJsonAsync<List<OcupanteResponse>>(ApiJson.Options);
        Assert.NotNull(ocupantes);
        Assert.Equal(
            new[] { ocupanteA1.Id, ocupanteA2.Id }.OrderBy(id => id),
            ocupantes!.Select(o => o.Id).OrderBy(id => id));
    }
}
