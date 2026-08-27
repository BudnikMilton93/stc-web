namespace Stc.Domain.Entities;

public class Insumo
{
    public Guid Id { get; set; }
    public string Nombre { get; set; } = null!;
    public string? Categoria { get; set; }
    public string? Sku { get; set; }
    public string Unidad { get; set; } = "unidad";
    public decimal StockActual { get; set; }
    public decimal StockMinimo { get; set; }
    public decimal? PrecioCosto { get; set; }
    public decimal? PrecioVenta { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public ICollection<OrdenItem> OrdenItems { get; set; } = [];
    public ICollection<MovimientoStock> Movimientos { get; set; } = [];
}
