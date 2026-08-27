namespace Stc.Domain.Entities;

public enum EntidadAdjunto { Activo, OrdenTrabajo, Sitio }

public class Adjunto
{
    public Guid Id { get; set; }
    public EntidadAdjunto EntidadTipo { get; set; }
    public Guid EntidadId { get; set; }
    public string Url { get; set; } = null!;
    public string? Descripcion { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
