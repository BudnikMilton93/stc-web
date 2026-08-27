using Stc.Domain.Enums;

namespace Stc.Domain.Entities;

public class Cliente
{
    public Guid Id { get; set; }
    public TipoCliente Tipo { get; set; } = TipoCliente.Persona;
    public string Nombre { get; set; } = null!;
    public string? DniCuit { get; set; }
    public string? Email { get; set; }
    public string? Telefono { get; set; }
    public string? Direccion { get; set; }
    public string? Notas { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public ICollection<ContactoCliente> Contactos { get; set; } = [];
    public ICollection<Sitio> Sitios { get; set; } = [];
    public ICollection<Activo> Activos { get; set; } = [];
    public ICollection<OrdenTrabajo> Ordenes { get; set; } = [];
}
