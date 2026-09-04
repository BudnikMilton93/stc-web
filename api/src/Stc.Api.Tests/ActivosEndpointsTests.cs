using System.Net;
using System.Net.Http.Json;
using Stc.Api.Endpoints;
using Stc.Api.Tests.Infrastructure;
using Stc.Domain.Enums;

namespace Stc.Api.Tests;

/// <summary>
/// Reglas de negocio de "equipamiento de sitio": un Sitio puede tener activos
/// (camaras, controles de acceso) sin unidad ni ocupante, reusando la tabla
/// activos. Un activo de unidad, en cambio, siempre requiere sitio y ocupante.
/// </summary>
[Collection(PostgresApiCollection.Name)]
public class ActivosEndpointsTests(PostgresApiFixture fixture)
{
    private readonly StcApiFactory _factory = fixture.Factory;

    private static CrearActivoRequest ActivoRequest(Guid clienteId, Guid? sitioId, Guid? unidadId, Guid? ocupanteId) =>
        new(clienteId, sitioId, unidadId, ocupanteId, TipoActivo.Camara, "MarcaX", "ModeloX", "SN123", null, null, null, null, null);

    [Fact]
    public async Task Post_activo_de_unidad_sin_sitioId_ni_ocupanteId_devuelve_bad_request()
    {
        var usuario = await _factory.SeedUsuarioAsync();
        var cliente = await _factory.SeedClienteAsync();
        var sitio = await _factory.SeedSitioAsync(cliente.Id);
        var unidad = await _factory.SeedUnidadAsync(sitio.Id);
        var client = _factory.CreateClientAs(usuario.AuthId!.Value);

        var request = ActivoRequest(cliente.Id, sitioId: null, unidadId: unidad.Id, ocupanteId: null);

        var response = await client.PostAsJsonAsync("/activos", request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Post_equipamiento_de_sitio_con_ocupanteId_devuelve_bad_request()
    {
        var usuario = await _factory.SeedUsuarioAsync();
        var cliente = await _factory.SeedClienteAsync();
        var sitio = await _factory.SeedSitioAsync(cliente.Id);
        var unidad = await _factory.SeedUnidadAsync(sitio.Id);
        var ocupante = await _factory.SeedOcupanteAsync(unidad.Id);
        var client = _factory.CreateClientAs(usuario.AuthId!.Value);

        var request = ActivoRequest(cliente.Id, sitioId: sitio.Id, unidadId: null, ocupanteId: ocupante.Id);

        var response = await client.PostAsJsonAsync("/activos", request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Post_sin_unidad_ni_sitio_devuelve_bad_request()
    {
        var usuario = await _factory.SeedUsuarioAsync();
        var cliente = await _factory.SeedClienteAsync();
        var client = _factory.CreateClientAs(usuario.AuthId!.Value);

        var request = ActivoRequest(cliente.Id, sitioId: null, unidadId: null, ocupanteId: null);

        var response = await client.PostAsJsonAsync("/activos", request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Post_activo_de_unidad_con_sitio_y_ocupante_devuelve_created()
    {
        var usuario = await _factory.SeedUsuarioAsync();
        var cliente = await _factory.SeedClienteAsync();
        var sitio = await _factory.SeedSitioAsync(cliente.Id);
        var unidad = await _factory.SeedUnidadAsync(sitio.Id);
        var ocupante = await _factory.SeedOcupanteAsync(unidad.Id);
        var client = _factory.CreateClientAs(usuario.AuthId!.Value);

        var request = ActivoRequest(cliente.Id, sitioId: sitio.Id, unidadId: unidad.Id, ocupanteId: ocupante.Id);

        var response = await client.PostAsJsonAsync("/activos", request);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var creado = await response.Content.ReadFromJsonAsync<ActivoResponse>(ApiJson.Options);
        Assert.NotNull(creado);
        Assert.Equal(sitio.Id, creado!.SitioId);
        Assert.Equal(unidad.Id, creado.UnidadId);
        Assert.Equal(ocupante.Id, creado.OcupanteId);
    }

    [Fact]
    public async Task Post_equipamiento_de_sitio_sin_unidad_ni_ocupante_devuelve_created()
    {
        var usuario = await _factory.SeedUsuarioAsync();
        var cliente = await _factory.SeedClienteAsync();
        var sitio = await _factory.SeedSitioAsync(cliente.Id);
        var client = _factory.CreateClientAs(usuario.AuthId!.Value);

        var request = ActivoRequest(cliente.Id, sitioId: sitio.Id, unidadId: null, ocupanteId: null);

        var response = await client.PostAsJsonAsync("/activos", request);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var creado = await response.Content.ReadFromJsonAsync<ActivoResponse>(ApiJson.Options);
        Assert.NotNull(creado);
        Assert.Equal(sitio.Id, creado!.SitioId);
        Assert.Null(creado.UnidadId);
        Assert.Null(creado.OcupanteId);
    }

    [Fact]
    public async Task Put_activo_de_unidad_sacando_ocupanteId_devuelve_bad_request()
    {
        var usuario = await _factory.SeedUsuarioAsync();
        var cliente = await _factory.SeedClienteAsync();
        var sitio = await _factory.SeedSitioAsync(cliente.Id);
        var unidad = await _factory.SeedUnidadAsync(sitio.Id);
        var ocupante = await _factory.SeedOcupanteAsync(unidad.Id);
        var activo = await _factory.SeedActivoAsync(cliente.Id, sitio.Id, unidad.Id, ocupante.Id);
        var client = _factory.CreateClientAs(usuario.AuthId!.Value);

        var request = new ActualizarActivoRequest(TipoActivo.Camara, null, "Marca", "Modelo", "SN", null, null, null, null, EstadoActivo.Activo, null);

        var response = await client.PutAsJsonAsync($"/activos/{activo.Id}", request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Put_equipamiento_de_sitio_agregando_ocupanteId_devuelve_bad_request()
    {
        var usuario = await _factory.SeedUsuarioAsync();
        var cliente = await _factory.SeedClienteAsync();
        var sitio = await _factory.SeedSitioAsync(cliente.Id);
        var unidad = await _factory.SeedUnidadAsync(sitio.Id);
        var ocupante = await _factory.SeedOcupanteAsync(unidad.Id);
        var activo = await _factory.SeedActivoAsync(cliente.Id, sitio.Id, unidadId: null, ocupanteId: null);
        var client = _factory.CreateClientAs(usuario.AuthId!.Value);

        var request = new ActualizarActivoRequest(TipoActivo.Camara, ocupante.Id, "Marca", "Modelo", "SN", null, null, null, null, EstadoActivo.Activo, null);

        var response = await client.PutAsJsonAsync($"/activos/{activo.Id}", request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Put_activo_de_unidad_manteniendo_ocupanteId_devuelve_ok()
    {
        var usuario = await _factory.SeedUsuarioAsync();
        var cliente = await _factory.SeedClienteAsync();
        var sitio = await _factory.SeedSitioAsync(cliente.Id);
        var unidad = await _factory.SeedUnidadAsync(sitio.Id);
        var ocupante = await _factory.SeedOcupanteAsync(unidad.Id);
        var otroOcupante = await _factory.SeedOcupanteAsync(unidad.Id);
        var activo = await _factory.SeedActivoAsync(cliente.Id, sitio.Id, unidad.Id, ocupante.Id);
        var client = _factory.CreateClientAs(usuario.AuthId!.Value);

        var request = new ActualizarActivoRequest(TipoActivo.Camara, otroOcupante.Id, "Marca nueva", "Modelo", "SN", null, null, null, null, EstadoActivo.Activo, "Reasignado");

        var response = await client.PutAsJsonAsync($"/activos/{activo.Id}", request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var actualizado = await _factory.FindActivoAsync(activo.Id);
        Assert.Equal(otroOcupante.Id, actualizado!.OcupanteId);
        Assert.Equal("Marca nueva", actualizado.Marca);
    }

    [Fact]
    public async Task Put_equipamiento_de_sitio_manteniendo_ocupanteId_nulo_devuelve_ok()
    {
        var usuario = await _factory.SeedUsuarioAsync();
        var cliente = await _factory.SeedClienteAsync();
        var sitio = await _factory.SeedSitioAsync(cliente.Id);
        var activo = await _factory.SeedActivoAsync(cliente.Id, sitio.Id, unidadId: null, ocupanteId: null);
        var client = _factory.CreateClientAs(usuario.AuthId!.Value);

        var request = new ActualizarActivoRequest(TipoActivo.ControlAcceso, null, "Marca nueva", "Modelo", "SN", null, null, null, null, EstadoActivo.EnReparacion, "Revisado");

        var response = await client.PutAsJsonAsync($"/activos/{activo.Id}", request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var actualizado = await _factory.FindActivoAsync(activo.Id);
        Assert.Null(actualizado!.OcupanteId);
        Assert.Equal(EstadoActivo.EnReparacion, actualizado.Estado);
    }

    [Fact]
    public async Task Get_con_soloEquipamientoSitio_devuelve_unicamente_activos_sin_unidad_ni_ocupante()
    {
        var usuario = await _factory.SeedUsuarioAsync();
        var cliente = await _factory.SeedClienteAsync();
        var sitio = await _factory.SeedSitioAsync(cliente.Id);
        var unidad = await _factory.SeedUnidadAsync(sitio.Id);
        var ocupante = await _factory.SeedOcupanteAsync(unidad.Id);

        var equipamientoDeSitio = await _factory.SeedActivoAsync(cliente.Id, sitio.Id, unidadId: null, ocupanteId: null);
        var activoDeUnidad = await _factory.SeedActivoAsync(cliente.Id, sitio.Id, unidad.Id, ocupante.Id);

        var client = _factory.CreateClientAs(usuario.AuthId!.Value);

        var response = await client.GetAsync($"/activos?sitioId={sitio.Id}&soloEquipamientoSitio=true");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var activos = await response.Content.ReadFromJsonAsync<List<ActivoResponse>>(ApiJson.Options);
        Assert.NotNull(activos);
        var ids = activos!.Select(a => a.Id).ToList();
        Assert.Contains(equipamientoDeSitio.Id, ids);
        Assert.DoesNotContain(activoDeUnidad.Id, ids);
    }

    [Fact]
    public async Task Get_sin_soloEquipamientoSitio_devuelve_todos_los_activos_del_sitio()
    {
        var usuario = await _factory.SeedUsuarioAsync();
        var cliente = await _factory.SeedClienteAsync();
        var sitio = await _factory.SeedSitioAsync(cliente.Id);
        var unidad = await _factory.SeedUnidadAsync(sitio.Id);
        var ocupante = await _factory.SeedOcupanteAsync(unidad.Id);

        var equipamientoDeSitio = await _factory.SeedActivoAsync(cliente.Id, sitio.Id, unidadId: null, ocupanteId: null);
        var activoDeUnidad = await _factory.SeedActivoAsync(cliente.Id, sitio.Id, unidad.Id, ocupante.Id);

        var client = _factory.CreateClientAs(usuario.AuthId!.Value);

        var response = await client.GetAsync($"/activos?sitioId={sitio.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var activos = await response.Content.ReadFromJsonAsync<List<ActivoResponse>>(ApiJson.Options);
        Assert.NotNull(activos);
        var ids = activos!.Select(a => a.Id).ToList();
        Assert.Contains(equipamientoDeSitio.Id, ids);
        Assert.Contains(activoDeUnidad.Id, ids);
    }
}
