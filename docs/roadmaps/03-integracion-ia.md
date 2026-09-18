# Roadmap de integración con IA (Claude/Anthropic)

Este documento registra ideas concretas para incorporar el SDK oficial de Anthropic al sistema, ordenadas de menor a mayor complejidad de integración. A diferencia de [00-fortalecimiento.md](00-fortalecimiento.md) (deuda técnica) y [01-produccion.md](01-produccion.md) (despliegue), esto es una iniciativa de producto todavía sin decidir — ninguna de las 4 ideas está confirmada para implementación. Cuando una se confirme, pasa a `docs/features/` con su propio archivo de seguimiento lineal.

Contexto: motivado por preparar una conversación técnica sobre agentes y tool calling. Las 4 ideas usan C#/.NET (el stack real de la API) con el SDK oficial de Anthropic, no un wrapper de terceros.

## Estado

| # | Item | Complejidad | Estado | Notas |
|---|---|---|---|---|
| 1 | Clasificación de leads (sin tools) | Baja | Pendiente, a evaluar | Una sola llamada estructurada (`output_config.format`) sobre `POST /leads` |
| 2 | Resumen automático de orden de trabajo | Baja | Pendiente, a evaluar | Mismo nivel de integración que #1, más visible como feature |
| 3 | Asistente interno con function calling | Media-alta | Pendiente, a evaluar | Tool Runner del SDK .NET sobre endpoints ya existentes |
| 4 | RAG sobre manuales de instalación | Alta | Pendiente, a evaluar | Requiere embeddings + almacenamiento vectorial; depende de si existe contenido real para indexar |

## Detalle

### 1. Clasificación de leads — Pendiente, a evaluar
El formulario público ya guarda leads en la tabla `leads` (`POST /leads`, `AllowAnonymous`, ver [docs/arquitectura/02-Backend-API.md](../arquitectura/02-Backend-API.md)). La idea es, al crear un lead, mandarle el mensaje a Claude y pedirle de vuelta JSON estructurado (`prioridad`, `tipo_servicio_probable`) usando `output_config.format` del SDK — sin tools, sin loop agentic.

Es la integración más chica posible: una sola llamada síncrona (o un job async si no se quiere bloquear la respuesta del endpoint). Sirve como punto de entrada al SDK antes de encarar algo con tools.

Pendiente de decidir: si la clasificación se guarda en columnas nuevas de `leads` (requiere migración) o se calcula on-demand: preferible persistirla, porque re-clasificar en cada lectura pagaría la llamada a Claude en cada request de la lista de leads.

### 2. Resumen automático de orden de trabajo — Pendiente, a evaluar
Al cerrar una `orden_trabajo`, generar con Claude un resumen en lenguaje natural a partir de `orden_items` y las notas del técnico, para mostrarlo en el detalle del cliente. Mismo patrón técnico que #1 (una llamada, sin tools), pero más visible para el usuario final del CRM (el dueño del negocio) que la clasificación de leads, que es interna.

Depende de que `src/features/ordenes` deje de ser un placeholder (ver `docs/roadmaps/00-fortalecimiento.md` — hoy no tiene CRUD funcional), o de generarlo directo desde la API sin pasar por esa vista todavía.

### 3. Asistente interno con function calling — Pendiente, a evaluar
Un asistente tipo "decime qué pasó con el cliente X", con tools como `buscar_cliente`, `listar_ordenes_pendientes`, `buscar_sitio` mapeadas a los endpoints ya existentes (`ClientesEndpoints`, etc.), usando el Tool Runner del SDK de .NET (`client.beta.messages.tool_runner`).

Esta es la que da experiencia real de "agentes y tool calling" — las otras dos son llamadas únicas sin loop. Requiere decidir superficie de exposición (¿endpoint nuevo en la API, consumido por un panel de chat en el frontend?) y alcance de las tools (de solo lectura primero, antes de exponer cualquier tool que escriba datos).

Nota de seguridad a resolver antes de implementar: el sistema es single-admin sin roles (`RequireClaim("activo","true")`), así que cualquier tool que este asistente use hereda automáticamente el mismo nivel de acceso total — no hay necesidad de un modelo de permisos nuevo, pero si en el futuro se generalizara el asistente a un contexto multi-usuario, cada tool tendría que revalidar autorización por su cuenta y no asumir que "puede llamar al endpoint" equivale a "el usuario puede ver este dato".

### 4. RAG sobre manuales de instalación — Pendiente, a evaluar
Indexar documentación técnica de instalación (si existe en un formato utilizable) y responder preguntas de los instaladores buscando en esos documentos antes de consultar a Claude. Es la más laboriosa de las 4: necesita pipeline de embeddings y almacenamiento vectorial (evaluar `pgvector` sobre el mismo Postgres de Supabase antes de sumar infraestructura nueva, en línea con el principio de no introducir una pieza de infraestructura sin necesidad concreta).

Bloqueante real antes de estimar esto en serio: confirmar que existe contenido real (manuales, fichas técnicas) para indexar. Sin eso, es una idea sin insumo, no una feature planeable.

## Cómo usar este documento

- Al confirmar cuál de las 4 ideas se implementa, pasarla a "En progreso" acá y abrir su archivo correspondiente en `docs/features/`.
- Si aparece una quinta idea de integración con IA en el camino, agregarla a la tabla y su detalle abajo — este documento es el registro de la iniciativa completa, no de una sola feature.
