namespace Stc.Domain.Entities;

public class Usuario
{
    public Guid Id { get; set; }
    public Guid? AuthId { get; set; }
    public string Nombre { get; set; } = null!;
    public string Email { get; set; } = null!;
    public bool Activo { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; }
}
