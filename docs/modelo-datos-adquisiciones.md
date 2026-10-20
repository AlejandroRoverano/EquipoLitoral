# Modelo de datos: registro de adquisiciones (RD-08)

Este documento describe cómo se guardan en Firestore las adquisiciones de servicios educativos y los pagos simulados.

El código que implementa este modelo está en **`adquisiciones-modelo.js`**, en la raíz del proyecto. Todas las páginas que registren o muestren adquisiciones deben usar ese módulo en lugar de escribir en Firestore directamente.

## Colecciones

| Colección | ID del documento | Qué guarda |
|---|---|---|
| `usuarios` | `{uid}` | Datos del usuario: nombre, email y rol. Ya existía. |
| `adquisiciones` | `{uid}_{servicioId}` | Qué servicio adquirió cada usuario. |
| `pagos` | automático | Cada intento de pago simulado, aprobado o rechazado. |

## Relaciones

```
usuarios/{uid}
   │ 1
   │
   │ N
adquisiciones/{uid}_{servicioId} ──── 1:1 ──── pagos/{pagoId}   (solo pagos aprobados)
   │
   └── servicioId ──► servicio del catálogo
```

- **Usuario → adquisiciones (1 a N).** Un usuario puede tener muchas adquisiciones. Se relacionan por el campo `uid`.
- **Adquisición → servicio.** Cada adquisición corresponde a un solo servicio, identificado por `servicioId`.
- **Adquisición → pago (1 a 1).** Cada adquisición apunta al pago aprobado que la generó mediante `pagoId`.
- **Usuario → pagos (1 a N).** Un usuario puede tener varios intentos de pago. Los rechazados no generan adquisición.

### ¿Por qué el ID es `{uid}_{servicioId}`?

- La relación usuario–servicio queda identificada en el propio ID del documento.
- Un usuario **no puede adquirir dos veces el mismo servicio**: el documento ya existe.
- Para saber si un usuario tiene un servicio, alcanza con leer un solo documento, sin hacer una consulta.

## Colección `adquisiciones`

| Campo | Tipo | Descripción |
|---|---|---|
| `uid` | string | UID del usuario que adquirió el servicio (Firebase Auth). |
| `usuarioNombre` | string | Nombre del usuario al momento de la compra. |
| `usuarioEmail` | string | Correo del usuario. |
| `servicioId` | string | Identificador del servicio, por ejemplo `taller-robotica`. |
| `servicioNombre` | string | Nombre del servicio. |
| `prestador` | string | Quién dicta el servicio. |
| `precio` | number | Importe del servicio. |
| `moneda` | string | Moneda del importe, por ejemplo `UYU`. |
| `periodo` | string | Período del importe, por ejemplo `mes`. |
| `estado` | string | `confirmada` (pago aprobado). `cancelada` queda reservado para una futura baja. |
| `pagoId` | string | ID del documento de `pagos` asociado. |
| `codigoOperacion` | string | Código ficticio del pago simulado, por ejemplo `SIM-7F3K9Q`. |
| `metodoPago` | string | `tarjeta`, `transferencia` o `billetera`. Solo el tipo, sin datos reales. |
| `fecha` | timestamp | Fecha y hora de la operación, puesta por el servidor (`serverTimestamp()`). |

Los datos del servicio (nombre, prestador, precio) **se copian** en la adquisición. Así se puede mostrar el listado de "Mis Adquisiciones" sin hacer otra consulta por cada servicio. Además queda registrado el precio que se pagó, aunque el servicio cambie de precio después.

### Ejemplo

`adquisiciones/aB3dE9fGh_taller-robotica`

```json
{
  "uid": "aB3dE9fGh",
  "usuarioNombre": "Sebastián Camacho",
  "usuarioEmail": "sebastian@ejemplo.com",
  "servicioId": "taller-robotica",
  "servicioNombre": "Taller de Robótica Educativa",
  "prestador": "Ing. Martín Silva",
  "precio": 4500,
  "moneda": "UYU",
  "periodo": "mes",
  "estado": "confirmada",
  "pagoId": "Xk29LmQp0aZ",
  "codigoOperacion": "SIM-7F3K9Q",
  "metodoPago": "tarjeta",
  "fecha": "20 de octubre de 2026, 02:15:00 UTC-3"
}
```

## Colección `pagos`

| Campo | Tipo | Descripción |
|---|---|---|
| `uid` | string | UID del usuario que hizo el intento de pago. |
| `usuarioEmail` | string | Correo del usuario. |
| `servicioId` | string | Servicio que se intentó pagar. |
| `servicioNombre` | string | Nombre del servicio. |
| `monto` | number | Importe del pago. |
| `moneda` | string | Moneda del importe. |
| `metodo` | string | `tarjeta`, `transferencia` o `billetera`. |
| `simulado` | boolean | Siempre `true` (RNF-09). |
| `estado` | string | `aprobado` o `rechazado`. |
| `codigoOperacion` | string | Código ficticio del pago, por ejemplo `SIM-7F3K9Q`. |
| `fecha` | timestamp | Fecha y hora del intento. |

> **RNF-09:** esta colección **nunca** guarda números de tarjeta, CVV, cuentas bancarias ni ningún otro dato real de medios de pago. Solo se guarda el tipo de medio elegido.

## Cómo se registra una adquisición

1. El usuario confirma el pago simulado en el detalle del servicio.
2. **Si el pago se rechaza**, se crea un documento en `pagos` con `estado: "rechazado"` y no se crea ninguna adquisición.
3. **Si el pago se aprueba**, se crean en una sola operación (`writeBatch`) dos documentos: el de `pagos` con `estado: "aprobado"` y el de `adquisiciones`. Se guardan los dos o ninguno, así nunca queda un pago aprobado sin su adquisición.

## Funciones disponibles en `adquisiciones-modelo.js`

| Función | Para qué sirve |
|---|---|
| `registrarAdquisicion({ usuario, servicio, metodo, codigoOperacion })` | Guarda un pago aprobado y su adquisición. |
| `registrarPagoRechazado({ usuario, servicio, metodo, codigoOperacion })` | Guarda un intento de pago rechazado. |
| `obtenerAdquisicion(uid, servicioId)` | Devuelve una adquisición, o `null` si no existe. |
| `usuarioTieneServicio(uid, servicioId)` | Devuelve `true` si el usuario ya tiene el servicio confirmado. |
| `obtenerAdquisicionesDeUsuario(uid)` | Devuelve todas las adquisiciones del usuario, de la más reciente a la más antigua. |

Las funciones de lectura devuelven la `fecha` ya convertida a `Date` de JavaScript.

### Ejemplo: mostrar "Mis Adquisiciones" en el panel

```js
import { obtenerAdquisicionesDeUsuario } from "../adquisiciones-modelo.js";

const adquisiciones = await obtenerAdquisicionesDeUsuario(user.uid);
adquisiciones.forEach((a) => {
  console.log(a.servicioNombre, a.precio, a.moneda, a.fecha.toLocaleDateString("es-UY"), a.estado);
});
```

## Reglas de seguridad sugeridas para Firestore

Se configuran en la consola de Firebase, en **Firestore Database → Reglas**. Hay que agregar estos bloques dentro de `match /databases/{database}/documents { ... }`, junto a las reglas que ya existan para `usuarios`.

```
// Adquisiciones: cada usuario ve y crea solo las suyas
match /adquisiciones/{adquisicionId} {
  allow read: if request.auth != null
              && (resource == null || resource.data.uid == request.auth.uid);
  allow create: if request.auth != null
                && request.resource.data.uid == request.auth.uid
                && adquisicionId == request.auth.uid + "_" + request.resource.data.servicioId;
  allow update, delete: if false;
}

// Pagos simulados: cada usuario ve y crea solo los suyos
match /pagos/{pagoId} {
  allow read: if request.auth != null && resource.data.uid == request.auth.uid;
  allow create: if request.auth != null
                && request.resource.data.uid == request.auth.uid
                && request.resource.data.simulado == true;
  allow update, delete: if false;
}
```

- `resource == null` permite comprobar si una adquisición existe, aunque todavía no se haya creado.
- Nadie puede modificar ni borrar adquisiciones o pagos desde la página. Quedan como registro histórico.
- Si más adelante el prestador tiene que ver quién adquirió sus servicios, hay que agregar una regla de lectura para ese rol.
