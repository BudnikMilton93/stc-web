using Stc.Domain.Enums;

namespace Stc.Domain.Entities;

public class Sitio
{
    public Guid Id { get; set; }
    public Guid ClienteId { get; set; }
    public string Nombre { get; set; } = null!;
    public TipoSitio Tipo { get; set; } = TipoSitio.Edificio;
    public string Direccion { get; set; } = null!;
    public string? Ciudad { get; set; }
    public string? Notas { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Cliente Cliente { get; set; } = null!;
    public ICollection<Unidad> Unidades { get; set; } = [];
    public ICollection<Activo> Activos { get; set; } = [];
    public ICollection<OrdenTrabajo> Ordenes { get; set; } = [];
}
