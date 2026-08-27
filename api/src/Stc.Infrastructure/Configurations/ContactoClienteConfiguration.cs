using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Stc.Domain.Entities;

namespace Stc.Infrastructure.Configurations;

public class ContactoClienteConfiguration : IEntityTypeConfiguration<ContactoCliente>
{
    public void Configure(EntityTypeBuilder<ContactoCliente> b)
    {
        b.ToTable("contactos_cliente");
        b.HasKey(x => x.Id);
    }
}
