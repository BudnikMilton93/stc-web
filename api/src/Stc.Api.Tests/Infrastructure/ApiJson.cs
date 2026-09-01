using System.Text.Json;
using System.Text.Json.Serialization;

namespace Stc.Api.Tests.Infrastructure;

/// <summary>
/// Mismas opciones de serializacion que configura Program.cs (enums en
/// camelCase). HttpClient.ReadFromJsonAsync no usa automaticamente las
/// opciones del servidor, asi que los tests que deserializan respuestas con
/// enums necesitan pasar esto explicitamente.
/// </summary>
public static class ApiJson
{
    public static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) },
    };
}
