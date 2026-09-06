using System.Net;
using System.Net.Http.Json;
using Stc.Api.Endpoints;
using Stc.Api.Tests.Infrastructure;

namespace Stc.Api.Tests;

/// <summary>
/// Igual que en Unidades, la baja de un sitio no es un endpoint dedicado:
/// es el PUT generico detectando la transicion "notas sin flag -> notas con
/// flag" (ver Stc.Api.Services.BajaLogicaValidator). Cubre las 3 formas en
/// que un sitio puede tener dependientes activos: unidades activas, activos
/// directos del sitio (equipamiento de areas comunes) y activos activos que
/// cuelgan de una unidad del sitio.
/// </summary>
[Collection(PostgresApiCollection.Name)]
public class SitiosEndpointsTests(PostgresApiFixture fixture)
{
    private readonly StcApiFactory _factory = fixture.Factory;

    private static ActualizarSitioRequest BajaRequest(string nombre, string direccion) =>
        new(nombre, Stc.Domain.Enums.TipoSitio.Edificio, direccion, null, "[BAJA_LOGICA]");

    [Fact]
    public async Task Put_dando_de_baja_sitio_con_unidad_activa_devuelve_bad_request()
    {
        var usuario = await _factory.SeedUsuarioAsync();
        var cliente = await _factory.SeedClienteAsync();
        var sitio = await _factory.SeedSitioAsync(cliente.Id);
        await _factory.SeedUnidadAsync(sitio.Id);
        var client = _factory.CreateClientAs(usuario.AuthId!.Value);

        var response = await client.PutAsJsonAsync($"/sitios/{sitio.Id}", BajaRequest(sitio.Nombre, sitio.Direccion));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Put_dando_de_baja_sitio_con_activo_directo_activo_devuelve_bad_request()
    {
        var usuario = await _factory.SeedUsuarioAsync();
        var cliente = await _factory.SeedClienteAsync();
        var sitio = await _factory.SeedSitioAsync(cliente.Id);
        await _factory.SeedActivoAsync(cliente.Id, sitio.Id, unidadId: null, ocupanteId: null);
        var client = _factory.CreateClientAs(usuario.AuthId!.Value);

        var response = await client.PutAsJsonAsync($"/sitios/{sitio.Id}", BajaRequest(sitio.Nombre, sitio.Direccion));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Put_dando_de_baja_sitio_con_activo_activo_via_unidad_devuelve_bad_request()
    {
        var usuario = await _factory.SeedUsuarioAsync();
        var cliente = await _factory.SeedClienteAsync();
        var sitio = await _factory.SeedSitioAsync(cliente.Id);
        var unidad = await _factory.SeedUnidadAsync(sitio.Id);
        var ocupante = await _factory.SeedOcupanteAsync(unidad.Id);
        await _factory.SeedActivoAsync(cliente.Id, sitio.Id, unidad.Id, ocupante.Id);
        var client = _factory.CreateClientAs(usuario.AuthId!.Value);

        var response = await client.PutAsJsonAsync($"/sitios/{sitio.Id}", BajaRequest(sitio.Nombre, sitio.Direccion));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Put_dando_de_baja_sitio_sin_dependientes_activos_devuelve_ok()
    {
        var usuario = await _factory.SeedUsuarioAsync();
        var cliente = await _factory.SeedClienteAsync();
        var sitio = await _factory.SeedSitioAsync(cliente.Id);
        var client = _factory.CreateClientAs(usuario.AuthId!.Value);

        var response = await client.PutAsJsonAsync($"/sitios/{sitio.Id}", BajaRequest(sitio.Nombre, sitio.Direccion));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var actualizado = await response.Content.ReadFromJsonAsync<SitioResponse>(ApiJson.Options);
        Assert.NotNull(actualizado);
        Assert.Contains("[BAJA_LOGICA]", actualizado!.Notas);
    }
}
