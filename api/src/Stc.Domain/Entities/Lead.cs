using Stc.Domain.Enums;

namespace Stc.Domain.Entities;

public class Lead
{
    public Guid Id { get; set; }
    public string Nombre { get; set; } = null!;
    public string? Telefono { get; set; }
    public string? Email { get; set; }
    public string? ServicioInteres { get; set; }
    public string? Mensaje { get; set; }
    public EstadoLead Estado { get; set; } = EstadoLead.Nuevo;
    public Guid? ClienteId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Cliente? Cliente { get; set; }
}
