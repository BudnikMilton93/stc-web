using Microsoft.EntityFrameworkCore;
using Stc.Domain.Enums;
using Stc.Infrastructure;

namespace Stc.Api.Services;

/// <summary>
/// Reglas de "no permitir dar de baja si hay dependientes activos" para Sitio
/// y Unidad. Sitio/Unidad/Ocupante no tienen una columna de estado real en la
/// base: la baja logica se simula desde el frontend con un marcador de texto
/// ("[BAJA_LOGICA]") embebido en `notas` (ver
/// frontend/src/features/clientes/utils/archiveFlag.js). No hay un endpoint
/// dedicado de "dar de baja" -- es un PUT generico que reemplaza el recurso
/// completo -- asi que esta clase replica el mismo marcador aca para poder:
/// (a) detectar la transicion "activo -> dado de baja" comparando el `notas`
/// que ya esta en la base contra el que llega en el request, y (b) contar
/// dependientes activos con el mismo criterio que ya usa el frontend.
///
/// Activo si tiene una columna de estado real (`estado_activo`), por eso ahi
/// no hace falta ningun parseo de texto.
/// </summary>
public static class BajaLogicaValidator
{
    private const string ArchiveFlag = "[BAJA_LOGICA]";

    public static bool EstaDadaDeBaja(string? notas) => notas is not null && notas.Contains(ArchiveFlag);

    public static bool EsTransicionABaja(string? notasActual, string? notasNueva) =>
        !EstaDadaDeBaja(notasActual) && EstaDadaDeBaja(notasNueva);

    /// <summary>
    /// Null si la unidad puede darse de baja. Si no, un 400 con el motivo
    /// (cantidad de ocupantes y/o activos activos que la bloquean).
    /// </summary>
    public static async Task<IResult?> ValidarBajaUnidadAsync(StcDbContext db, Guid unidadId, CancellationToken ct)
    {
        var ocupantesActivos = await db.Ocupantes
            .Where(o => o.UnidadId == unidadId && (o.Notas == null || !o.Notas.Contains(ArchiveFlag)))
            .CountAsync(ct);

        var activosActivos = await db.Activos
            .Where(a => a.UnidadId == unidadId && a.Estado != EstadoActivo.DeBaja)
            .CountAsync(ct);

        if (ocupantesActivos == 0 && activosActivos == 0)
        {
            return null;
        }

        var motivos = new List<string>();
        if (ocupantesActivos > 0) motivos.Add(Pluralizar(ocupantesActivos, "ocupante activo", "ocupantes activos"));
        if (activosActivos > 0) motivos.Add(Pluralizar(activosActivos, "activo activo", "activos activos"));

        return Results.BadRequest(new { message = $"No se puede dar de baja la unidad: tiene {string.Join(" y ", motivos)}." });
    }

    /// <summary>
    /// Null si el sitio puede darse de baja. Si no, un 400 con el motivo
    /// (cantidad de unidades activas y/o activos activos que lo bloquean).
    /// </summary>
    public static async Task<IResult?> ValidarBajaSitioAsync(StcDbContext db, Guid sitioId, CancellationToken ct)
    {
        var unidadesActivas = await db.Unidades
            .Where(u => u.SitioId == sitioId && (u.Notas == null || !u.Notas.Contains(ArchiveFlag)))
            .CountAsync(ct);

        // activos.SitioId queda seteado tanto en el equipamiento directo del
        // sitio como en los activos de cualquier unidad del sitio (un activo
        // de unidad siempre requiere sitioId, ver CrearActivoRequest en
        // ActivosEndpoints), asi que este conteo ya cubre la baja transitiva
        // via unidades sin necesitar un join aparte contra Unidades.
        var activosActivos = await db.Activos
            .Where(a => a.SitioId == sitioId && a.Estado != EstadoActivo.DeBaja)
            .CountAsync(ct);

        if (unidadesActivas == 0 && activosActivos == 0)
        {
            return null;
        }

        var motivos = new List<string>();
        if (unidadesActivas > 0) motivos.Add(Pluralizar(unidadesActivas, "unidad activa", "unidades activas"));
        if (activosActivos > 0) motivos.Add(Pluralizar(activosActivos, "activo activo", "activos activos"));

        return Results.BadRequest(new { message = $"No se puede dar de baja el sitio: tiene {string.Join(" y ", motivos)}." });
    }

    private static string Pluralizar(int count, string singular, string plural) => $"{count} {(count == 1 ? singular : plural)}";
}
