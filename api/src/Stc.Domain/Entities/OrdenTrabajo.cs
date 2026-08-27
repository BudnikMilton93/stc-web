using Stc.Domain.Enums;

namespace Stc.Domain.Entities;

public class OrdenTrabajo
{
    public Guid Id { get; set; }
    public Guid ClienteId { get; set; }
    public Guid? SitioId { get; set; }
    public Guid? ActivoId { get; set; }
    public Guid? TecnicoId { get; set; }
    public TipoServicio TipoServicio { get; set; }
    public string Descripcion { get; set; } = null!;
    public EstadoOrden Estado { get; set; } = EstadoOrden.Pendiente;
    public PrioridadOrden Prioridad { get; set; } = PrioridadOrden.Normal;
    public DateTimeOffset FechaSolicitud { get; set; }
    public DateTimeOffset? FechaProgramada { get; set; }
    public DateTimeOffset? FechaResolucion { get; set; }
    public string? NotasResolucion { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public Cliente Cliente { get; set; } = null!;
    public Sitio? Sitio { get; set; }
    public Activo? Activo { get; set; }
    public Usuario? Tecnico { get; set; }
    public ICollection<OrdenItem> Items { get; set; } = [];
}
