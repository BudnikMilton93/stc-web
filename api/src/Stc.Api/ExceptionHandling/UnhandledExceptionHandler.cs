using System.Security.Claims;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Stc.Domain.Entities;
using Stc.Infrastructure;

namespace Stc.Api.ExceptionHandling;

/// <summary>
/// Handler centralizado de excepciones no controladas de la API (ver
/// docs/roadmaps/00-fortalecimiento.md item 11). No intercepta errores de
/// negocio ya manejados por un endpoint (BadRequest/Conflict/NotFound):
/// esos no son excepciones, nunca llegan aca.
///
/// AddExceptionHandler&lt;T&gt; registra IExceptionHandler como Singleton, asi
/// que StcDbContext (scoped) NO se inyecta por constructor: eso lo
/// convertiria en una "captive dependency" -- una unica instancia
/// capturada para toda la vida de la app y reusada entre requests
/// concurrentes, y DbContext no es thread-safe. En su lugar se resuelve
/// por request desde httpContext.RequestServices dentro de
/// TryHandleAsync, que en ese punto del pipeline todavia pertenece al
/// scope de DI del request que fallo.
/// </summary>
public class UnhandledExceptionHandler(
    IProblemDetailsService problemDetailsService,
    ILogger<UnhandledExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        const int statusCode = StatusCodes.Status500InternalServerError;
        httpContext.Response.StatusCode = statusCode;

        await RegistrarLogAsync(httpContext, exception, statusCode);

        return await problemDetailsService.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            Exception = exception,
            ProblemDetails =
            {
                Status = statusCode,
                Title = "Ocurrio un error inesperado.",
            },
        });
    }

    private async Task RegistrarLogAsync(HttpContext httpContext, Exception exception, int statusCode)
    {
        try
        {
            var db = httpContext.RequestServices.GetRequiredService<StcDbContext>();

            // db es el DbContext scoped del request que fallo: puede traer
            // entidades trackeadas con cambios que el endpoint todavia no
            // habia guardado. Limpiar el tracker antes de guardar el log
            // evita persistir ese estado parcial no relacionado como efecto
            // colateral de loguear el error.
            db.ChangeTracker.Clear();

            var usuarioIdClaim = httpContext.User.FindFirstValue("usuario_id");

            db.LogsError.Add(new LogError
            {
                Id = Guid.NewGuid(),
                Timestamp = DateTimeOffset.UtcNow,
                Ruta = httpContext.Request.Path.Value ?? string.Empty,
                MetodoHttp = httpContext.Request.Method,
                StatusCode = statusCode,
                UsuarioId = Guid.TryParse(usuarioIdClaim, out var usuarioId) ? usuarioId : null,
                TipoExcepcion = exception.GetType().Name,
                Mensaje = exception.Message,
                StackTrace = exception.StackTrace,
                QueryString = httpContext.Request.QueryString.HasValue ? httpContext.Request.QueryString.Value : null,
            });

            await db.SaveChangesAsync(httpContext.RequestAborted);
        }
        catch (Exception loggingException)
        {
            // Si falla la escritura del log (ej. la propia caida de la base es
            // la causa de la excepcion original) no queremos enmascarar el
            // error real ni tirar abajo la respuesta: fallback a la consola.
            logger.LogError(loggingException, "No se pudo persistir el log de error en log_errores.");
            logger.LogError(exception, "Excepcion no controlada en {Method} {Path}", httpContext.Request.Method, httpContext.Request.Path);
        }
    }
}
