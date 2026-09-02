using System.Net.Mail;
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

        // Formulario publico del sitio: cualquiera puede crear un lead, sin
        // sesion. Es la unica superficie del sistema expuesta a internet sin
        // autenticacion, de ahi la validacion de input y el rate limit.
        group.MapPost("/", async (CrearLeadRequest request, StcDbContext db, CancellationToken ct) =>
        {
            var error = ValidarCrearLead(request);
            if (error is not null) return error;

            var lead = new Lead
            {
                Id = Guid.NewGuid(),
                Nombre = request.Nombre.Trim(),
                Telefono = request.Telefono?.Trim(),
                Email = request.Email?.Trim(),
                ServicioInteres = request.ServicioInteres?.Trim(),
                Mensaje = request.Mensaje?.Trim(),
            };

            db.Leads.Add(lead);
            await db.SaveChangesAsync(ct);

            return Results.Created($"/leads/{lead.Id}",
                new LeadResponse(lead.Id, lead.Nombre, lead.Telefono, lead.Email, lead.ServicioInteres, lead.Mensaje, lead.Estado, lead.ClienteId));
        }).AllowAnonymous().RequireRateLimiting("leads");

        group.MapGet("/", async (StcDbContext db, CancellationToken ct) =>
        {
            var leads = await db.Leads
                .AsNoTracking()
                .OrderByDescending(l => l.CreatedAt)
                .Select(l => new LeadResponse(l.Id, l.Nombre, l.Telefono, l.Email, l.ServicioInteres, l.Mensaje, l.Estado, l.ClienteId))
                .ToListAsync(ct);

            return Results.Ok(leads);
        }).RequireAuthorization("Activo");

        group.MapPut("/{id:guid}", async (Guid id, ActualizarLeadRequest request, StcDbContext db, CancellationToken ct) =>
        {
            var lead = await db.Leads.FindAsync([id], ct);
            if (lead is null) return Results.NotFound();

            lead.Estado = request.Estado;
            lead.ClienteId = request.ClienteId;

            await db.SaveChangesAsync(ct);

            return Results.Ok(new LeadResponse(lead.Id, lead.Nombre, lead.Telefono, lead.Email, lead.ServicioInteres, lead.Mensaje, lead.Estado, lead.ClienteId));
        }).RequireAuthorization("Activo");

        group.MapDelete("/{id:guid}", async (Guid id, StcDbContext db, CancellationToken ct) =>
        {
            var filas = await db.Leads.Where(l => l.Id == id).ExecuteDeleteAsync(ct);
            return filas == 0 ? Results.NotFound() : Results.NoContent();
        }).RequireAuthorization("Activo");
    }

    private static IResult? ValidarCrearLead(CrearLeadRequest request)
    {
        var errores = new Dictionary<string, string[]>();

        if (string.IsNullOrWhiteSpace(request.Nombre))
        {
            errores["nombre"] = ["El nombre es obligatorio."];
        }
        else if (request.Nombre.Length > 200)
        {
            errores["nombre"] = ["El nombre no puede superar los 200 caracteres."];
        }

        if (request.Telefono?.Length > 50)
        {
            errores["telefono"] = ["El telefono no puede superar los 50 caracteres."];
        }

        if (!string.IsNullOrWhiteSpace(request.Email))
        {
            if (request.Email.Length > 320 || !MailAddress.TryCreate(request.Email, out _))
            {
                errores["email"] = ["El email no es valido."];
            }
        }

        if (request.ServicioInteres?.Length > 100)
        {
            errores["servicioInteres"] = ["El servicio de interes no puede superar los 100 caracteres."];
        }

        if (request.Mensaje?.Length > 2000)
        {
            errores["mensaje"] = ["El mensaje no puede superar los 2000 caracteres."];
        }

        return errores.Count == 0 ? null : Results.ValidationProblem(errores);
    }
}

public record LeadResponse(Guid Id, string Nombre, string? Telefono, string? Email, string? ServicioInteres, string? Mensaje, EstadoLead Estado, Guid? ClienteId);
public record CrearLeadRequest(string Nombre, string? Telefono, string? Email, string? ServicioInteres, string? Mensaje);
public record ActualizarLeadRequest(EstadoLead Estado, Guid? ClienteId);
