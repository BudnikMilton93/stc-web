namespace Stc.Domain.Entities;

public class Unidad
{
    public Guid Id { get; set; }
    public Guid SitioId { get; set; }
    public string Identificador { get; set; } = null!;
    public string? Piso { get; set; }
    public string? Notas { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Sitio Sitio { get; set; } = null!;
    public ICollection<Ocupante> Ocupantes { get; set; } = [];
    public ICollection<Activo> Activos { get; set; } = [];
}
