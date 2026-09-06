namespace Stc.Domain.Entities;

/// <summary>
/// Registro de una excepcion no controlada capturada por el exception
/// handler centralizado de la API (ver Stc.Api/ExceptionHandling). Uso
/// exclusivo de C#/.NET: se consulta manualmente por SQL, sin endpoint
/// propio ni consumo desde el frontend.
/// </summary>
public class LogError
{
    public Guid Id { get; set; }
    public DateTimeOffset Timestamp { get; set; }
    public string Ruta { get; set; } = null!;
    public string MetodoHttp { get; set; } = null!;
    public int StatusCode { get; set; }
    public Guid? UsuarioId { get; set; }
    public string TipoExcepcion { get; set; } = null!;
    public string Mensaje { get; set; } = null!;
    public string? StackTrace { get; set; }
    public string? QueryString { get; set; }

    public Usuario? Usuario { get; set; }
}
