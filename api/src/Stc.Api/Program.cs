using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Tokens;
using Stc.Api.Auth;
using Stc.Api.Endpoints;
using Stc.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();

// Sin este converter los enums (TipoCliente, EstadoOrden, etc.) se serializan
// como numeros, lo que no coincide con los valores en minusculas ('persona',
// 'pendiente', etc.) que ya usa el frontend. CamelCase sobre el nombre del enum
// en PascalCase produce exactamente esos valores (Persona -> persona).
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase));
});

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
        // Sin esto, ASP.NET Core remapea "sub" a un claim type interno
        // (ClaimTypes.NameIdentifier) y CurrentUserEnrichmentMiddleware
        // no lo encuentra al buscar "sub" literal.
        options.MapInboundClaims = false;

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
    .AddPolicy("Activo", p => p.RequireClaim("activo", "true"));

const string FrontendDevCorsPolicy = "FrontendDev";

// Solo para desarrollo: el frontend (Vite) corre en un puerto distinto al de
// esta API, asi que el navegador exige que el origen este habilitado
// explicitamente. En produccion todavia no hay un origen definido.
builder.Services.AddCors(options =>
{
    options.AddPolicy(FrontendDevCorsPolicy, policy =>
        policy.WithOrigins("http://localhost:5173", "http://localhost:5174")
            .AllowAnyHeader()
            .AllowAnyMethod());
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseCors(FrontendDevCorsPolicy);
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

// Necesario para que WebApplicationFactory<Program> (Stc.Api.Tests) pueda
// referenciar este entry point desde otro assembly. No cambia comportamiento.
public partial class Program { }
