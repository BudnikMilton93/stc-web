using Stc.Domain.Enums;

namespace Stc.Domain.Entities;

public class Activo
{
    public Guid Id { get; set; }
    public Guid ClienteId { get; set; }
    public Guid? SitioId { get; set; }
    public Guid? UnidadId { get; set; }
    public Guid? OcupanteId { get; set; }
    public TipoActivo Tipo { get; set; }
    public string? Marca { get; set; }
    public string? Modelo { get; set; }
    public string? NumeroSerie { get; set; }
    public DateOnly? FechaInstalacion { get; set; }
    public DateOnly? GarantiaHasta { get; set; }
    public DateOnly? ProximoMantenimiento { get; set; }
    public DateOnly? UltimaRevision { get; set; }
    public EstadoActivo Estado { get; set; } = EstadoActivo.Activo;
    public string? Notas { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Cliente Cliente { get; set; } = null!;
    public Sitio? Sitio { get; set; }
    public Unidad? Unidad { get; set; }
    public Ocupante? Ocupante { get; set; }
    public ICollection<OrdenTrabajo> Ordenes { get; set; } = [];
}
