using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Stc.Domain.Entities;

namespace Stc.Infrastructure.Configurations;

public class InsumoConfiguration : IEntityTypeConfiguration<Insumo>
{
    public void Configure(EntityTypeBuilder<Insumo> b)
    {
        b.ToTable("insumos");
        b.HasKey(x => x.Id);
        b.HasIndex(x => x.Sku).IsUnique();
        b.HasIndex(x => x.Categoria);
        b.Property(x => x.PrecioCosto).HasColumnType("numeric(12,2)");
        b.Property(x => x.PrecioVenta).HasColumnType("numeric(12,2)");
    }
}
