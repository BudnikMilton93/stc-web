namespace Stc.Domain.Entities;

public class ContactoCliente
{
    public Guid Id { get; set; }
    public Guid ClienteId { get; set; }
    public string Nombre { get; set; } = null!;
    public string? Cargo { get; set; }
    public string? Telefono { get; set; }
    public string? Email { get; set; }
    public bool EsPrincipal { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Cliente Cliente { get; set; } = null!;
}
