using Microsoft.EntityFrameworkCore;
using Stc.Domain.Entities;
using Stc.Domain.Enums;
using Stc.Infrastructure;

namespace Stc.Api.Endpoints;

public static class LeadsEndpoints
{
    public static void MapLeadsEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/leads");

        // Formulario publico del sitio: cualquiera puede crear un lead, sin sesion.
        group.MapPost("/", async (CrearLeadRequest request, StcDbContext db, CancellationToken ct) =>
        {
            var lead = new Lead
            {
                Id = Guid.NewGuid(),
                Nombre = request.Nombre,
                Telefono = request.Telefono,
                Email = request.Email,
                ServicioInteres = request.ServicioInteres,
                Mensaje = request.Mensaje,
            };

            db.Leads.Add(lead);
            await db.SaveChangesAsync(ct);

            return Results.Created($"/leads/{lead.Id}",
                new LeadResponse(lead.Id, lead.Nombre, lead.Telefono, lead.Email, lead.ServicioInteres, lead.Mensaje, lead.Estado, lead.ClienteId));
        }).AllowAnonymous();

        group.MapGet("/", async (StcDbContext db, CancellationToken ct) =>
        {
            var leads = await db.Leads
                .AsNoTracking()
                .OrderByDescending(l => l.CreatedAt)
                .Select(l => new LeadResponse(l.Id, l.Nombre, l.Telefono, l.Email, l.ServicioInteres, l.Mensaje, l.Estado, l.ClienteId))
                .ToListAsync(ct);

            return Results.Ok(leads);
        }).RequireAuthorization("Staff");

        group.MapPut("/{id:guid}", async (Guid id, ActualizarLeadRequest request, StcDbContext db, CancellationToken ct) =>
        {
            var lead = await db.Leads.FindAsync([id], ct);
            if (lead is null) return Results.NotFound();

            lead.Estado = request.Estado;
            lead.ClienteId = request.ClienteId;

            await db.SaveChangesAsync(ct);

            return Results.Ok(new LeadResponse(lead.Id, lead.Nombre, lead.Telefono, lead.Email, lead.ServicioInteres, lead.Mensaje, lead.Estado, lead.ClienteId));
        }).RequireAuthorization("Staff");

        group.MapDelete("/{id:guid}", async (Guid id, StcDbContext db, CancellationToken ct) =>
        {
            var filas = await db.Leads.Where(l => l.Id == id).ExecuteDeleteAsync(ct);
            return filas == 0 ? Results.NotFound() : Results.NoContent();
        }).RequireAuthorization("Admin");
    }
}

public record LeadResponse(Guid Id, string Nombre, string? Telefono, string? Email, string? ServicioInteres, string? Mensaje, EstadoLead Estado, Guid? ClienteId);
public record CrearLeadRequest(string Nombre, string? Telefono, string? Email, string? ServicioInteres, string? Mensaje);
public record ActualizarLeadRequest(EstadoLead Estado, Guid? ClienteId);
