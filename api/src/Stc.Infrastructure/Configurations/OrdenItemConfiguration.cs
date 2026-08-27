using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Stc.Domain.Entities;

namespace Stc.Infrastructure.Configurations;

public class OrdenItemConfiguration : IEntityTypeConfiguration<OrdenItem>
{
    public void Configure(EntityTypeBuilder<OrdenItem> b)
    {
        b.ToTable("orden_items");
        b.HasKey(x => x.Id);
        b.Property(x => x.PrecioUnitario).HasColumnType("numeric(12,2)");

        b.HasOne(x => x.Insumo)
            .WithMany(x => x.OrdenItems)
            .HasForeignKey(x => x.InsumoId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
