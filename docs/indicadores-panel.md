# Indicadores del panel administrativo (RF-14)

La página principal del panel (`admin/panel.html`) resume el estado de la plataforma. **Todos los valores se calculan con datos reales de Firestore**: no hay datos de ejemplo ni indicadores sin fuente.

El código está en **`indicadores-modelo.js`** (cálculos) y **`admin/panel.js`** (pantalla).

## Indicadores

| Indicador | Fuente | Cómo se calcula |
|---|---|---|
| Usuarios registrados, por rol | `usuarios` | Cantidad total y por `rol` (estudiante, prestador, administrador). |
| Servicios disponibles | `servicios` | Servicios con `activo == true` (los dados de baja no cuentan). |
| Adquisiciones | `adquisiciones` | Total registrado y cuántas tienen `fecha` en los últimos 30 días. Incluye todos los estados. |
| Importe de adquisiciones confirmadas | `adquisiciones` | Suma de `precio` de las adquisiciones `confirmada`, separada por `moneda`. Son **pagos simulados** (RNF-09). |
| Servicios más adquiridos | `adquisiciones` | Los 5 servicios con más adquisiciones `confirmada`. Empates: orden alfabético. |
| Pagos simulados rechazados | `pagos` | `rechazado` ÷ total de intentos × 100. |
| Adquisiciones por mes (gráfico) | `adquisiciones` | Cantidad por mes (todos los estados), hasta los últimos 12 meses. Los meses sin adquisiciones aparecen en 0. |

## Qué se muestra cuando no hay datos

- Sin adquisiciones: los contadores muestran `0` y el gráfico y el ranking muestran un mensaje.
- Sin intentos de pago: el indicador muestra `0` con el aviso "Todavía no hay intentos de pago registrados" (no se inventa un porcentaje).
- Si una consulta falla (por ejemplo, por permisos), solo los indicadores que dependen de ella muestran "No se pudo calcular este indicador"; los demás se siguen mostrando.

## Seguridad

- La página usa `protegerPagina` con rol administrador (RNF-10): sin sesión redirige al login y sin el rol muestra "Acceso denegado".
- Las reglas de Firestore solo permiten listar usuarios, adquisiciones y pagos de otras personas a un administrador. No se agregaron ni cambiaron reglas.
