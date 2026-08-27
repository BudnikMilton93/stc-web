namespace Stc.Domain.Entities;

public enum TipoMovimientoStock { Entrada, Salida, Ajuste }

public class MovimientoStock
{
    public Guid Id { get; set; }
    public Guid InsumoId { get; set; }
    public Guid? OrdenItemId { get; set; }
    public TipoMovimientoStock Tipo { get; set; }
    public decimal Cantidad { get; set; }
    public string? Motivo { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Insumo Insumo { get; set; } = null!;
    public OrdenItem? OrdenItem { get; set; }
}
