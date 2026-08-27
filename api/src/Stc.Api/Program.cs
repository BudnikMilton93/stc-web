using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Tokens;
using Stc.Api.Auth;
using Stc.Api.Endpoints;
using Stc.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();

var connectionString = builder.Configuration.GetConnectionString("StcDatabase")
    ?? throw new InvalidOperationException("Falta ConnectionStrings:StcDatabase en la configuracion.");
builder.Services.AddInfrastructure(connectionString);

var jwt = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>()
    ?? throw new InvalidOperationException($"Falta la seccion '{JwtOptions.SectionName}' en la configuracion.");

// Supabase firma los tokens con JWT Signing Keys (claves publicas rotables,
// ya no un secreto simetrico fijo). Se descargan y cachean desde el JWKS
// del proyecto; ConfigurationManager<T> maneja la actualizacion automatica.
var jwksUri = jwt.JwksUri ?? $"{jwt.Issuer.TrimEnd('/')}/.well-known/jwks.json";
var jwksConfigManager = new ConfigurationManager<JsonWebKeySet>(
    jwksUri,
    new JwksRetriever(),
    new HttpDocumentRetriever { RequireHttps = true });

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwt.Issuer,
            ValidateAudience = true,
            ValidAudience = "authenticated", // audience fijo que usa Supabase Auth
            ValidateIssuerSigningKey = true,
            IssuerSigningKeyResolver = (_, _, kid, _) =>
            {
                var jwks = jwksConfigManager.GetConfigurationAsync().GetAwaiter().GetResult();
                return kid is null ? jwks.Keys : jwks.Keys.Where(k => k.KeyId == kid);
            },
        };
    });

builder.Services.AddAuthorizationBuilder()
    .AddPolicy("Staff", p => p.RequireClaim("activo", "true"))
    .AddPolicy("Admin", p => p.RequireClaim("rol", "Admin"));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseMiddleware<CurrentUserEnrichmentMiddleware>();
app.UseAuthorization();

app.MapClientesEndpoints();
app.MapSitiosEndpoints();
app.MapUnidadesEndpoints();
app.MapOcupantesEndpoints();
app.MapActivosEndpoints();
app.MapOrdenesEndpoints();
app.MapInsumosEndpoints();
app.MapMovimientosStockEndpoints();
app.MapLeadsEndpoints();
app.MapUsuariosEndpoints();

app.Run();
