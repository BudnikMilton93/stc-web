using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Stc.Domain.Entities;

namespace Stc.Infrastructure.Configurations;

public class MovimientoStockConfiguration : IEntityTypeConfiguration<MovimientoStock>
{
    public void Configure(EntityTypeBuilder<MovimientoStock> b)
    {
        b.ToTable("movimientos_stock");
        b.HasKey(x => x.Id);

        // 'tipo' es texto plano + CHECK en la base (no un enum nativo de Postgres),
        // asi que se guarda en minuscula en vez de usar HasPostgresEnum.
        b.Property(x => x.Tipo)
            .HasColumnType("text")
            .HasConversion(
                v => v.ToString().ToLowerInvariant(),
                v => Enum.Parse<TipoMovimientoStock>(v, ignoreCase: true));

        b.HasOne(x => x.Insumo)
            .WithMany(x => x.Movimientos)
            .HasForeignKey(x => x.InsumoId)
            .OnDelete(DeleteBehavior.Cascade);

        b.HasOne(x => x.OrdenItem)
            .WithOne(x => x.MovimientoStock)
            .HasForeignKey<MovimientoStock>(x => x.OrdenItemId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
