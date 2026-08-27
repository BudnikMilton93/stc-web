using Microsoft.EntityFrameworkCore;
using Stc.Domain.Entities;

namespace Stc.Infrastructure;

public class StcDbContext(DbContextOptions<StcDbContext> options) : DbContext(options)
{
    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<Cliente> Clientes => Set<Cliente>();
    public DbSet<ContactoCliente> ContactosCliente => Set<ContactoCliente>();
    public DbSet<Sitio> Sitios => Set<Sitio>();
    public DbSet<Unidad> Unidades => Set<Unidad>();
    public DbSet<Ocupante> Ocupantes => Set<Ocupante>();
    public DbSet<Activo> Activos => Set<Activo>();
    public DbSet<OrdenTrabajo> OrdenesTrabajo => Set<OrdenTrabajo>();
    public DbSet<Insumo> Insumos => Set<Insumo>();
    public DbSet<OrdenItem> OrdenItems => Set<OrdenItem>();
    public DbSet<MovimientoStock> MovimientosStock => Set<MovimientoStock>();
    public DbSet<Lead> Leads => Set<Lead>();
    public DbSet<Adjunto> Adjuntos => Set<Adjunto>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(StcDbContext).Assembly);
    }
}
