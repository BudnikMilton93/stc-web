using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Stc.Domain.Entities;

namespace Stc.Infrastructure.Configurations;

public class ActivoConfiguration : IEntityTypeConfiguration<Activo>
{
    public void Configure(EntityTypeBuilder<Activo> b)
    {
        b.ToTable("activos");
        b.HasKey(x => x.Id);
        b.Property(x => x.Tipo).HasColumnType("tipo_activo");
        b.Property(x => x.Estado).HasColumnType("estado_activo");
        b.HasIndex(x => x.NumeroSerie);

        b.HasMany(x => x.Ordenes)
            .WithOne(x => x.Activo)
            .HasForeignKey(x => x.ActivoId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
