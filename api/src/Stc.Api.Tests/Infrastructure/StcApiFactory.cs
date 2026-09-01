using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;

namespace Stc.Api.Tests.Infrastructure;

/// <summary>
/// WebApplicationFactory apuntada al Postgres descartable de <see cref="PostgresApiFixture"/>,
/// con la autenticacion JWT real reemplazada por <see cref="TestAuthHandler"/> para que los
/// tests puedan simular cualquier usuario (o ninguno) sin depender del JWKS de Supabase.
/// </summary>
public class StcApiFactory(string connectionString) : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Program.cs lee ConnectionStrings:StcDatabase de forma eager (antes de
        // builder.Build()), asi que WithWebHostBuilder/ConfigureAppConfiguration
        // llega demasiado tarde para pisar ese valor. Una variable de entorno
        // (mismo proceso) si la ve, porque el proveedor de env vars la resuelve
        // en el momento en que se llama GetConnectionString.
        Environment.SetEnvironmentVariable("ConnectionStrings__StcDatabase", connectionString);

        builder.UseEnvironment("Testing");

        builder.ConfigureServices(services =>
        {
            services
                .AddAuthentication(TestAuthHandler.SchemeName)
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthHandler.SchemeName, _ => { });
        });
    }
}
