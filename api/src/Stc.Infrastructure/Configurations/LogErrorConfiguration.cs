using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Stc.Domain.Entities;

namespace Stc.Infrastructure.Configurations;

public class LogErrorConfiguration : IEntityTypeConfiguration<LogError>
{
    public void Configure(EntityTypeBuilder<LogError> b)
    {
        b.ToTable("log_errores");
        b.HasKey(x => x.Id);
        b.HasIndex(x => x.Timestamp);

        b.HasOne(x => x.Usuario)
            .WithMany()
            .HasForeignKey(x => x.UsuarioId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
