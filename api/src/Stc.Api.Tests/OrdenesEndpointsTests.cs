using System.Net;
using System.Net.Http.Json;
using Stc.Api.Endpoints;
using Stc.Api.Tests.Infrastructure;
using Stc.Domain.Enums;

namespace Stc.Api.Tests;

/// <summary>
/// PUT /ordenes/{id} ya no tiene una regla de autorizacion manual: cualquier
/// usuario activo puede editar cualquier orden (sistema de un solo usuario).
/// TecnicoId se mantiene como dato operativo, sin efecto en la autorizacion.
/// </summary>
[Collection(PostgresApiCollection.Name)]
public class OrdenesEndpointsTests(PostgresApiFixture fixture)
{
    private readonly StcApiFactory _factory = fixture.Factory;

    [Fact]
    public async Task Usuario_activo_puede_editar_cualquier_orden()
    {
        var usuario = await _factory.SeedUsuarioAsync();
        var cliente = await _factory.SeedClienteAsync();
        var orden = await _factory.SeedOrdenAsync(cliente.Id);

        var client = _factory.CreateClientAs(usuario.AuthId!.Value);
        var request = new ActualizarOrdenRequest(EstadoOrden.EnProceso, usuario.Id, null, null, null);

        var response = await client.PutAsJsonAsync($"/ordenes/{orden.Id}", request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var actualizada = await _factory.FindOrdenAsync(orden.Id);
        Assert.Equal(EstadoOrden.EnProceso, actualizada!.Estado);
    }

    [Fact]
    public async Task Usuario_activo_puede_editar_una_orden_con_tecnico_asignado_de_otro_usuario()
    {
        // El campo TecnicoId sigue existiendo como dato historico/operativo,
        // pero ya no condiciona quien puede editar la orden.
        var usuario = await _factory.SeedUsuarioAsync();
        var otroUsuario = await _factory.SeedUsuarioAsync();
        var cliente = await _factory.SeedClienteAsync();
        var orden = await _factory.SeedOrdenAsync(cliente.Id, tecnicoId: otroUsuario.Id);

        var client = _factory.CreateClientAs(usuario.AuthId!.Value);
        var request = new ActualizarOrdenRequest(EstadoOrden.Resuelto, otroUsuario.Id, null, DateTimeOffset.UtcNow, "Listo");

        var response = await client.PutAsJsonAsync($"/ordenes/{orden.Id}", request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var actualizada = await _factory.FindOrdenAsync(orden.Id);
        Assert.Equal(EstadoOrden.Resuelto, actualizada!.Estado);
    }
}
