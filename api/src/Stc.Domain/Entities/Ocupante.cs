namespace Stc.Domain.Entities;

public class Ocupante
{
    public Guid Id { get; set; }
    public Guid UnidadId { get; set; }
    public string Nombre { get; set; } = null!;
    public string? Telefono { get; set; }
    public string? Email { get; set; }
    public bool EsTitular { get; set; } = true;
    public string? Notas { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Unidad Unidad { get; set; } = null!;
    public ICollection<Activo> Activos { get; set; } = [];
}
