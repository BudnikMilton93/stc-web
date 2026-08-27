using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Stc.Domain.Entities;

namespace Stc.Infrastructure.Configurations;

public class OrdenTrabajoConfiguration : IEntityTypeConfiguration<OrdenTrabajo>
{
    public void Configure(EntityTypeBuilder<OrdenTrabajo> b)
    {
        b.ToTable("ordenes_trabajo");
        b.HasKey(x => x.Id);
        b.Property(x => x.TipoServicio).HasColumnType("tipo_servicio");
        b.Property(x => x.Estado).HasColumnType("estado_orden");
        b.Property(x => x.Prioridad).HasColumnType("prioridad_orden");
        b.HasIndex(x => x.Estado);
        b.HasIndex(x => x.FechaSolicitud).IsDescending();

        b.HasOne(x => x.Tecnico)
            .WithMany()
            .HasForeignKey(x => x.TecnicoId)
            .OnDelete(DeleteBehavior.SetNull);

        b.HasMany(x => x.Items)
            .WithOne(x => x.Orden)
            .HasForeignKey(x => x.OrdenId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
