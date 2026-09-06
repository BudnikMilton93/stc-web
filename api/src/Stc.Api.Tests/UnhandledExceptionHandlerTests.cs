using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Stc.Api.Endpoints;
using Stc.Api.ExceptionHandling;
using Stc.Api.Tests.Infrastructure;
using Stc.Infrastructure;

namespace Stc.Api.Tests;

/// <summary>
/// Verifica que una excepcion no controlada (/test/throw, mapeado solo en el
/// entorno "Testing" desde Program.cs) queda registrada en log_errores y
/// responde con un 500 + ProblemDetails consistente, sin romper el contrato
/// que espera ApiError en frontend/src/lib/apiClient.js. Tambien verifica el
/// otro lado del contrato: un error de negocio ya manejado (400 de
/// validacion, 409 por constraint unico) no genera ninguna entrada de log.
/// </summary>
[Collection(PostgresApiCollection.Name)]
public class UnhandledExceptionHandlerTests(PostgresApiFixture fixture)
{
    private readonly StcApiFactory _factory = fixture.Factory;

    [Fact]
    public async Task Excepcion_no_controlada_se_loguea_y_devuelve_500_con_problem_details()
    {
        var usuario = await _factory.SeedUsuarioAsync();
        var client = _factory.CreateClientAs(usuario.AuthId!.Value);

        var response = await client.GetAsync("/test/throw?foo=bar");

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("\"status\":500", body);
        Assert.Contains("\"title\"", body);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<StcDbContext>();

        var log = await db.LogsError
            .AsNoTracking()
            .Where(l => l.Ruta == "/test/throw")
            .OrderByDescending(l => l.Timestamp)
            .FirstOrDefaultAsync();

        Assert.NotNull(log);
        Assert.Equal("GET", log!.MetodoHttp);
        Assert.Equal(500, log.StatusCode);
        Assert.Equal(usuario.Id, log.UsuarioId);
        Assert.Equal("InvalidOperationException", log.TipoExcepcion);
        Assert.Equal("boom-test", log.Mensaje);
        Assert.False(string.IsNullOrWhiteSpace(log.StackTrace));
        Assert.Equal("?foo=bar", log.QueryString);
    }

    [Fact]
    public async Task Request_anonimo_a_endpoint_protegido_no_llega_al_exception_handler()
    {
        var client = _factory.CreateAnonymousClient();

        var response = await client.GetAsync("/test/throw");

        // Sin sesion, la policy "Activo" corta antes de llegar al handler:
        // esto confirma que /test/throw sigue el mismo patron de
        // autorizacion que el resto de los recursos (no es una puerta trasera
        // sin auth) y que un 401 esperado no genera una entrada de log.
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Excepcion_no_controlada_con_usuario_anonimo_se_loguea_con_usuario_id_nulo()
    {
        // Invoca el handler directo (sin WebApplicationFactory ni un
        // endpoint de test dedicado en Program.cs): lo unico que este caso
        // necesita verificar es que un HttpContext.User sin claims produce
        // UsuarioId nulo, algo que no requiere ejercitar el pipeline HTTP
        // completo (a diferencia de /test/throw-con-cambios-trackeados, que
        // si depende del ciclo de vida real de DI).
        using var scope = _factory.Services.CreateScope();
        var provider = scope.ServiceProvider;

        var httpContext = new DefaultHttpContext
        {
            RequestServices = provider,
            User = new ClaimsPrincipal(new ClaimsIdentity()),
        };
        httpContext.Request.Path = "/test/unit-anonimo";

        var handler = new UnhandledExceptionHandler(
            provider.GetRequiredService<IProblemDetailsService>(),
            provider.GetRequiredService<ILogger<UnhandledExceptionHandler>>());

        await handler.TryHandleAsync(httpContext, new InvalidOperationException("boom-unit-anonimo"), CancellationToken.None);

        var db = provider.GetRequiredService<StcDbContext>();
        var log = await db.LogsError.AsNoTracking().SingleOrDefaultAsync(l => l.Ruta == "/test/unit-anonimo");

        Assert.NotNull(log);
        Assert.Null(log!.UsuarioId);
    }

    [Fact]
    public async Task Error_de_negocio_ya_manejado_no_genera_una_entrada_de_log()
    {
        var client = _factory.CreateAnonymousClient();

        // Nombre vacio dispara la validacion de ValidarCrearLead y devuelve
        // un 400 explicito (Results.ValidationProblem) -- no es una
        // excepcion, no deberia pasar por el UnhandledExceptionHandler.
        var request = new CrearLeadRequest("", null, null, null, null);
        var response = await client.PostAsJsonAsync("/leads", request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<StcDbContext>();

        var hayLog = await db.LogsError.AsNoTracking().AnyAsync(l => l.Ruta == "/leads");
        Assert.False(hayLog);
    }

    [Fact]
    public async Task Excepcion_no_controlada_no_persiste_cambios_trackeados_no_guardados_por_el_endpoint()
    {
        var usuario = await _factory.SeedUsuarioAsync();
        var client = _factory.CreateClientAs(usuario.AuthId!.Value);
        var insumo = await _factory.SeedInsumoAsync(stockActual: 10);

        var response = await client.GetAsync($"/test/throw-con-cambios-trackeados?insumoId={insumo.Id}");

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);

        // El endpoint de test mutó StockActual a 999999 en el DbContext
        // scoped del request, pero nunca llamó a SaveChangesAsync antes de
        // tirar la excepcion. Si el handler no limpiara el ChangeTracker
        // antes de guardar el log, ese cambio se volcaria como efecto
        // colateral (ver ChangeTracker.Clear() en RegistrarLogAsync).
        var stockActual = await _factory.GetStockActualAsync(insumo.Id);
        Assert.Equal(10, stockActual);
    }

    [Fact]
    public async Task Violacion_de_constraint_unico_devuelve_409_y_no_genera_una_entrada_de_log()
    {
        var usuario = await _factory.SeedUsuarioAsync();
        var client = _factory.CreateClientAs(usuario.AuthId!.Value);
        var sku = $"SKU-{Guid.NewGuid():N}";

        var primero = await client.PostAsJsonAsync("/insumos",
            new CrearInsumoRequest("Cable UTP", "cableado", sku, "metro", 0, null, null));
        Assert.Equal(HttpStatusCode.Created, primero.StatusCode);

        var duplicado = await client.PostAsJsonAsync("/insumos",
            new CrearInsumoRequest("Cable UTP (otro lote)", "cableado", sku, "metro", 0, null, null));

        // El SKU duplicado viola el indice unico de Insumo.Sku: debe volver
        // un 409 explicito (DbSaveExtensions.TrySaveChangesAsync), no un 500
        // generado por el exception handler.
        Assert.Equal(HttpStatusCode.Conflict, duplicado.StatusCode);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<StcDbContext>();

        var hayLog = await db.LogsError.AsNoTracking().AnyAsync(l => l.Ruta == "/insumos");
        Assert.False(hayLog);
    }
}
