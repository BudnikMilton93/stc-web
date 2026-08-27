namespace Stc.Domain.Entities;

public class OrdenItem
{
    public Guid Id { get; set; }
    public Guid OrdenId { get; set; }
    public Guid? InsumoId { get; set; }
    public string Descripcion { get; set; } = null!;
    public decimal Cantidad { get; set; } = 1;
    public decimal PrecioUnitario { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public OrdenTrabajo Orden { get; set; } = null!;
    public Insumo? Insumo { get; set; }
    public MovimientoStock? MovimientoStock { get; set; }
}
