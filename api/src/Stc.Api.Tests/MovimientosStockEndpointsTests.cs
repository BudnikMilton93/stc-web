using System.Net;
using System.Net.Http.Json;
using Stc.Api.Endpoints;
using Stc.Api.Tests.Infrastructure;
using Stc.Domain.Enums;
using Stc.Domain.Entities;

namespace Stc.Api.Tests;

/// <summary>
/// No hay trigger de base de datos para el ajuste de stock: lo hace la
/// aplicacion al registrar el movimiento (ver comentario en
/// MovimientosStockEndpoints.cs). Estos tests verifican el StockActual
/// resultante en la base, no solo la respuesta HTTP.
/// </summary>
[Collection(PostgresApiCollection.Name)]
public class MovimientosStockEndpointsTests(PostgresApiFixture fixture)
{
    private readonly StcApiFactory _factory = fixture.Factory;

    [Fact]
    public async Task Entrada_suma_al_stock_actual_del_insumo()
    {
        var staff = await _factory.SeedUsuarioAsync();
        var insumo = await _factory.SeedInsumoAsync(stockActual: 10);
        var client = _factory.CreateClientAs(staff.AuthId!.Value);
        var request = new CrearMovimientoStockRequest(insumo.Id, null, TipoMovimientoStock.Entrada, 5, "Compra");

        var response = await client.PostAsJsonAsync("/movimientos-stock", request);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal(15, await _factory.GetStockActualAsync(insumo.Id));
    }

    [Fact]
    public async Task Salida_resta_del_stock_actual_del_insumo()
    {
        var staff = await _factory.SeedUsuarioAsync();
        var insumo = await _factory.SeedInsumoAsync(stockActual: 10);
        var client = _factory.CreateClientAs(staff.AuthId!.Value);
        var request = new CrearMovimientoStockRequest(insumo.Id, null, TipoMovimientoStock.Salida, 4, "Instalacion");

        var response = await client.PostAsJsonAsync("/movimientos-stock", request);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal(6, await _factory.GetStockActualAsync(insumo.Id));
    }

    [Fact]
    public async Task Ajuste_reemplaza_el_stock_actual_del_insumo()
    {
        var staff = await _factory.SeedUsuarioAsync();
        var insumo = await _factory.SeedInsumoAsync(stockActual: 10);
        var client = _factory.CreateClientAs(staff.AuthId!.Value);
        var request = new CrearMovimientoStockRequest(insumo.Id, null, TipoMovimientoStock.Ajuste, 3, "Conteo fisico");

        var response = await client.PostAsJsonAsync("/movimientos-stock", request);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal(3, await _factory.GetStockActualAsync(insumo.Id));
    }
}
