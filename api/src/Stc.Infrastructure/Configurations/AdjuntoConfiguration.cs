using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Stc.Domain.Entities;

namespace Stc.Infrastructure.Configurations;

public class AdjuntoConfiguration : IEntityTypeConfiguration<Adjunto>
{
    public void Configure(EntityTypeBuilder<Adjunto> b)
    {
        b.ToTable("adjuntos");
        b.HasKey(x => x.Id);
        b.HasIndex(x => new { x.EntidadTipo, x.EntidadId });

        // 'entidad_tipo' es texto plano + CHECK (tabla polimorfica), no un enum nativo.
        b.Property(x => x.EntidadTipo)
            .HasColumnType("text")
            .HasConversion(
                v => v.ToString().ToLowerInvariant() == "ordentrabajo" ? "orden_trabajo" : v.ToString().ToLowerInvariant(),
                v => v == "orden_trabajo" ? EntidadAdjunto.OrdenTrabajo : Enum.Parse<EntidadAdjunto>(v, ignoreCase: true));
    }
}
