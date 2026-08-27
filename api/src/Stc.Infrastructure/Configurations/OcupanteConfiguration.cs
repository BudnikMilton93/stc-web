using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Stc.Domain.Entities;

namespace Stc.Infrastructure.Configurations;

public class OcupanteConfiguration : IEntityTypeConfiguration<Ocupante>
{
    public void Configure(EntityTypeBuilder<Ocupante> b)
    {
        b.ToTable("ocupantes");
        b.HasKey(x => x.Id);

        b.HasMany(x => x.Activos)
            .WithOne(x => x.Ocupante)
            .HasForeignKey(x => x.OcupanteId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
