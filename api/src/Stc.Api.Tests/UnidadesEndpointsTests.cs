using System.Net;
using System.Net.Http.Json;
using System.Linq;
using Stc.Api.Endpoints;
using Stc.Api.Tests.Infrastructure;

namespace Stc.Api.Tests;

/// <summary>
/// La baja de una unidad no es un endpoint dedicado: es el PUT generico
/// detectando la transicion "notas sin flag -> notas con flag" (ver
/// Stc.Api.Services.BajaLogicaValidator, que replica el mismo marcador de
/// texto que usa el frontend en frontend/src/features/clientes/utils/archiveFlag.js).
/// Estos tests cubren la regla de negocio: no se puede dar de baja una unidad
/// con ocupantes activos y/o activos activos propios.
/// </summary>
[Collection(PostgresApiCollection.Name)]
public class UnidadesEndpointsTests(PostgresApiFixture fixture)
{
    private readonly StcApiFactory _factory = fixture.Factory;

    private static ActualizarUnidadRequest BajaRequest(string identificador, string? notasPrevias = null) =>
        new(identificador, null, notasPrevias is null ? "[BAJA_LOGICA]" : $"{notasPrevias}\n[BAJA_LOGICA]");

    [Fact]
    public async Task Put_dando_de_baja_unidad_con_ocupante_activo_devuelve_bad_request()
    {
        var usuario = await _factory.SeedUsuarioAsync();
        var cliente = await _factory.SeedClienteAsync();
        var sitio = await _factory.SeedSitioAsync(cliente.Id);
        var unidad = await _factory.SeedUnidadAsync(sitio.Id);
        await _factory.SeedOcupanteAsync(unidad.Id);
        var client = _factory.CreateClientAs(usuario.AuthId!.Value);

        var response = await client.PutAsJsonAsync($"/unidades/{unidad.Id}", BajaRequest(unidad.Identificador));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Put_dando_de_baja_unidad_con_activo_activo_devuelve_bad_request()
    {
        var usuario = await _factory.SeedUsuarioAsync();
        var cliente = await _factory.SeedClienteAsync();
        var sitio = await _factory.SeedSitioAsync(cliente.Id);
        var unidad = await _factory.SeedUnidadAsync(sitio.Id);
        var ocupante = await _factory.SeedOcupanteAsync(unidad.Id);
        await _factory.SeedActivoAsync(cliente.Id, sitio.Id, unidad.Id, ocupante.Id);
        var client = _factory.CreateClientAs(usuario.AuthId!.Value);

        var response = await client.PutAsJsonAsync($"/unidades/{unidad.Id}", BajaRequest(unidad.Identificador));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Put_dando_de_baja_unidad_sin_dependientes_activos_devuelve_ok()
    {
        var usuario = await _factory.SeedUsuarioAsync();
        var cliente = await _factory.SeedClienteAsync();
        var sitio = await _factory.SeedSitioAsync(cliente.Id);
        var unidad = await _factory.SeedUnidadAsync(sitio.Id);
        var client = _factory.CreateClientAs(usuario.AuthId!.Value);

        var response = await client.PutAsJsonAsync($"/unidades/{unidad.Id}", BajaRequest(unidad.Identificador));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var actualizada = await response.Content.ReadFromJsonAsync<UnidadResponse>(ApiJson.Options);
        Assert.NotNull(actualizada);
        Assert.Contains("[BAJA_LOGICA]", actualizada!.Notas);
    }

    [Fact]
    public async Task Put_que_no_cambia_a_baja_no_valida_dependientes()
    {
        var usuario = await _factory.SeedUsuarioAsync();
        var cliente = await _factory.SeedClienteAsync();
        var sitio = await _factory.SeedSitioAsync(cliente.Id);
        var unidad = await _factory.SeedUnidadAsync(sitio.Id);
        await _factory.SeedOcupanteAsync(unidad.Id);
        var client = _factory.CreateClientAs(usuario.AuthId!.Value);

        var request = new ActualizarUnidadRequest("Nuevo identificador", "2", "Nota normal, sin flag");

        var response = await client.PutAsJsonAsync($"/unidades/{unidad.Id}", request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Get_filtrando_por_clienteId_devuelve_solo_unidades_de_sitios_de_ese_cliente()
    {
        var usuario = await _factory.SeedUsuarioAsync();
        var clienteA = await _factory.SeedClienteAsync();
        var sitioA1 = await _factory.SeedSitioAsync(clienteA.Id);
        var sitioA2 = await _factory.SeedSitioAsync(clienteA.Id);
        var unidadA1 = await _factory.SeedUnidadAsync(sitioA1.Id);
        var unidadA2 = await _factory.SeedUnidadAsync(sitioA2.Id);

        var clienteB = await _factory.SeedClienteAsync();
        var sitioB = await _factory.SeedSitioAsync(clienteB.Id);
        await _factory.SeedUnidadAsync(sitioB.Id);

        var client = _factory.CreateClientAs(usuario.AuthId!.Value);

        var response = await client.GetAsync($"/unidades?clienteId={clienteA.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var unidades = await response.Content.ReadFromJsonAsync<List<UnidadResponse>>(ApiJson.Options);
        Assert.NotNull(unidades);
        Assert.Equal(
            new[] { unidadA1.Id, unidadA2.Id }.OrderBy(id => id),
            unidades!.Select(u => u.Id).OrderBy(id => id));
    }
}
