using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Stc.Domain.Entities;

namespace Stc.Infrastructure.Configurations;

public class SitioConfiguration : IEntityTypeConfiguration<Sitio>
{
    public void Configure(EntityTypeBuilder<Sitio> b)
    {
        b.ToTable("sitios");
        b.HasKey(x => x.Id);
        b.Property(x => x.Tipo).HasColumnType("tipo_sitio");

        b.HasMany(x => x.Unidades)
            .WithOne(x => x.Sitio)
            .HasForeignKey(x => x.SitioId)
            .OnDelete(DeleteBehavior.Cascade);

        b.HasMany(x => x.Activos)
            .WithOne(x => x.Sitio)
            .HasForeignKey(x => x.SitioId)
            .OnDelete(DeleteBehavior.SetNull);

        b.HasMany(x => x.Ordenes)
            .WithOne(x => x.Sitio)
            .HasForeignKey(x => x.SitioId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
