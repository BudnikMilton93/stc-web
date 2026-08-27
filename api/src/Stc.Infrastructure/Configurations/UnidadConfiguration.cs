using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Stc.Domain.Entities;

namespace Stc.Infrastructure.Configurations;

public class UnidadConfiguration : IEntityTypeConfiguration<Unidad>
{
    public void Configure(EntityTypeBuilder<Unidad> b)
    {
        b.ToTable("unidades");
        b.HasKey(x => x.Id);
        b.HasIndex(x => new { x.SitioId, x.Identificador }).IsUnique();

        b.HasMany(x => x.Ocupantes)
            .WithOne(x => x.Unidad)
            .HasForeignKey(x => x.UnidadId)
            .OnDelete(DeleteBehavior.Cascade);

        b.HasMany(x => x.Activos)
            .WithOne(x => x.Unidad)
            .HasForeignKey(x => x.UnidadId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
