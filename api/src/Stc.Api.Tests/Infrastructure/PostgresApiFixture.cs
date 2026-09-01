using Npgsql;
using Testcontainers.PostgreSql;
using Xunit;

namespace Stc.Api.Tests.Infrastructure;

/// <summary>
/// Levanta un Postgres real descartable (Testcontainers) una unica vez para toda
/// la coleccion de tests y le aplica el schema real del proyecto (enums nativos,
/// tablas, indices). InMemory/SQLite no sirven aca: la API mapea enums nativos de
/// Postgres (ver Stc.Infrastructure.ServiceCollectionExtensions.MapEnum), algo que
/// esos providers no soportan.
///
/// No se aplican supabase/migrations/20260724195456_rls_policies.sql ni
/// 20260901000000_usuario_unico_sin_roles.sql: esas migraciones tocan policies que
/// dependen de funciones/roles especificos de Supabase (auth.uid(), rol
/// "authenticated") que no existen en un Postgres vanilla, y la autorizacion real
/// de estos tests pasa por la policy unica de la API ("Activo"), no por RLS.
/// </summary>
public class PostgresApiFixture : IAsyncLifetime
{
    private static readonly string[] MigrationFilesInApplyOrder =
    [
        // Fuera de orden cronologico a proposito: en Supabase el schema "extensions"
        // con uuid-ossp ya viene preinstalado por la plataforma: esta migracion lo
        // recrea para que el schema.sql (que asume que ya existe) funcione en un
        // Postgres vanilla.
        "20260724203439_fix_uuid_extension_schema.sql",
        "20260724195455_schema.sql",
        "20260827140000_narrow_service_scope.sql",
    ];

    private readonly PostgreSqlContainer _container = new PostgreSqlBuilder("postgres:16-alpine")
        .WithDatabase("stc_test")
        .WithUsername("stc_test")
        .WithPassword("stc_test")
        .Build();

    public StcApiFactory Factory { get; private set; } = null!;

    public string ConnectionString => _container.GetConnectionString();

    public async Task InitializeAsync()
    {
        await _container.StartAsync();
        await ApplySchemaAsync();

        Factory = new StcApiFactory(ConnectionString);
    }

    public async Task DisposeAsync()
    {
        Factory.Dispose();
        await _container.DisposeAsync();
    }

    private async Task ApplySchemaAsync()
    {
        var migrationsDir = FindMigrationsDirectory();

        await using var connection = new NpgsqlConnection(ConnectionString);
        await connection.OpenAsync();

        foreach (var fileName in MigrationFilesInApplyOrder)
        {
            var sql = await File.ReadAllTextAsync(Path.Combine(migrationsDir, fileName));
            await using var command = new NpgsqlCommand(sql, connection);
            await command.ExecuteNonQueryAsync();
        }
    }

    private static string FindMigrationsDirectory()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null)
        {
            var candidate = Path.Combine(dir.FullName, "supabase", "migrations");
            if (Directory.Exists(candidate))
            {
                return candidate;
            }

            dir = dir.Parent;
        }

        throw new DirectoryNotFoundException(
            $"No se encontro supabase/migrations subiendo desde {AppContext.BaseDirectory}.");
    }
}

[CollectionDefinition(Name)]
public class PostgresApiCollection : ICollectionFixture<PostgresApiFixture>
{
    public const string Name = "Postgres API collection";
}
