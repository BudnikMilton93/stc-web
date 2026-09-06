using Microsoft.EntityFrameworkCore;
using Npgsql;
using Stc.Infrastructure;

namespace Stc.Api.Endpoints;

public static class DbSaveExtensions
{
    /// <summary>
    /// SaveChangesAsync que convierte una violacion de constraint unico
    /// (dato duplicado, ej. SKU de insumo repetido) en un 409 explicito en
    /// vez de dejarla llegar como excepcion no controlada al
    /// UnhandledExceptionHandler (que la clasificaria como error tecnico).
    /// Cualquier otra excepcion se propaga sin cambios.
    /// </summary>
    public static async Task<IResult?> TrySaveChangesAsync(this StcDbContext db, CancellationToken ct)
    {
        try
        {
            await db.SaveChangesAsync(ct);
            return null;
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            return Results.Conflict(new { message = "Ya existe un registro con ese valor." });
        }
    }
}
