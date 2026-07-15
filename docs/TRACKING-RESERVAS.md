# Tracking de conversiones — App de reservas

Referencia de cómo está implementado el seguimiento de Google Ads en la app de
reservas (`reservas.cortedemanga.es`). Este documento existe porque el tracking
tuvo varias fuentes de confusión (CSP, dominio de Vercel, cobertura por idioma);
aquí queda todo en un sitio.

**Cuenta de Google Ads:** `AW-18213186788`

---

## 1. Google tag base

El tag global se carga una sola vez en `src/app/layout.tsx` (afecta a todas las
páginas y todos los idiomas):

```js
window.dataLayer = window.dataLayer || [];
window.gtag = function(){ window.dataLayer.push(arguments); }
window.gtag('js', new Date());
window.gtag('config', 'AW-18213186788');
```

> ⚠️ **Detalle crítico:** debe ser `window.gtag = function(){...}` (asignación
> explícita al objeto `window`). Un `function gtag(){}` normal queda en scope
> local dentro del `<Script>` de Next.js y **no** es accesible como `window.gtag`
> desde los componentes. Todos los eventos comprueban `typeof window.gtag ===
> "function"` antes de disparar.

---

## 2. Eventos de conversión

Hay **cuatro** acciones de conversión. Todas cuelgan de la cuenta
`AW-18213186788` y se distinguen por su *label*. Las tres primeras se disparan
desde esta app; la cuarta la dispara la **web padre** (`cortedemanga.es`) al
recibir el `postMessage` (ver §8).

| # | Evento | Label | Valor | Dónde se dispara | Condición |
|---|--------|-------|-------|------------------|-----------|
| 1 | Inicio de reserva (paso 1) | `quoPCPPF07kcEOTZ3OxD` | — | `ReservationForm.tsx`, botón **Continuar** | Al pasar de paso 1 a 2 (fecha + hora elegidas) |
| 2 | Reserva confirmada buena | `MkMuCMeWucEcEOTZ3OxD` | 50 € | `confirmada/[id]/page.tsx` | **Solo si `!isPending`** (estado ≠ `pendiente_aprobacion`) |
| 3 | Solicitud de grupo recibida | `8_gbCN7D47gcEOTZ3OxD` | 133 € | `solicitud-recibida/[id]/page.tsx` | Al cargar la página (siempre) |
| 4 | Reserva confirmada (embed) | `ZVVDCKDA07kcEOTZ3OxD` | — | `index.html` de `cortedemanga.es` (fuera de este repo) | Al recibir `postMessage` `cmReservaConfirmada` |

> **Doble disparo en el flujo embed (por diseño, benigno).** Una reserva
> confirmada **dentro del iframe** dispara **dos** conversiones: la #4 (la web
> padre recibe el `postMessage`) y, acto seguido, la #2 (la app hace
> `window.top.location.href` a la página de confirmación, que dispara
> `MkMuCMe...`). Una reserva confirmada **directa** (no embebida) solo dispara la
> #2.
>
> Esto **no** infla nada que importe **siempre que la configuración en Ads sea**:
> **#2 `MkMuCMe...` = Primaria** (cuenta para pujas/optimización) y **#4
> `ZVVDCKDA...` = Secundaria** (solo observación). Así, el bidding lo dirige la
> reserva real (#2), que además cubre tráfico embebido *y* directo, lleva valor
> (50 €) y Enhanced Conversions; la #4 queda como métrica complementaria del
> tráfico embebido. **No promover la #4 a Primaria** — sería medir el mismo hecho
> por un camino peor (solo embed, sin valor, sin user_data).
>
> ⚠️ **Ojo:** ambas rutas (#4 y #2) se disparan sobre una reserva **completada**,
> no sobre un clic — ver §8. Reconciliar con cómo esté etiquetada la #4 en Ads.

### Detalle por evento

**1 — Inicio de reserva** (`ReservationForm.tsx`, `handleContinue`)
Se dispara en el clic de "Continuar", **antes de que la reserva exista** en base
de datos. Es una señal temprana de intención, no una reserva completada. Sin
valor asociado.

**2 — Reserva confirmada** (`confirmada/[id]/page.tsx`)
Es la conversión "buena": reserva realmente confirmada. **Condicionada a
`!isPending`** para no contar solicitudes que aún pueden ser rechazadas. Incluye
Enhanced Conversions (ver §3). Valor 50 €.

**3 — Solicitud de grupo** (`solicitud-recibida/[id]/page.tsx`)
Página a la que llega un grupo grande (≥ 12 personas) cuya reserva queda
pendiente de aprobación manual. Se cuenta como conversión propia con valor
133 € porque una solicitud de grupo tiene alto valor esperado aunque todavía no
esté confirmada.

> Nota: los grupos de **hasta 11 personas** se confirman automáticamente y caen
> en el evento #2. A partir de 12, van al #3. El umbral es
> `configuracion.limite_grupo_online` (ver panel de Ajustes).

---

## 3. Enhanced Conversions (datos de usuario)

En la página de confirmación (evento #2), antes de disparar la conversión se
envían los datos del cliente para mejorar la atribución:

```js
gtag('set', 'user_data', {
  email: ...,
  phone_number: ...,
  address: { first_name: ..., last_name: ... }
});
```

Google los **hashea (SHA-256) automáticamente** antes de enviarlos; no sale
información personal en claro. Los datos provienen de la fila de Supabase que ya
se carga para mostrar la confirmación.

---

## 4. Componente `GtagConversion`

`src/components/GtagConversion.tsx` centraliza el disparo desde páginas que son
Server Components (que no pueden usar `useEffect` directamente). Es un Client
Component que al montar:

1. Si recibe `userData`, ejecuta `gtag('set', 'user_data', ...)` (Enhanced Conversions).
2. Ejecuta `gtag('event', 'conversion', { send_to, value, currency })`.

Props: `sendTo` (obligatorio), `value?`, `currency?`, `userData?`. Reutilizable:
las páginas de confirmación y de solicitud lo usan con distintos labels.

---

## 5. Cobertura por idioma

Las rutas usan un único segmento dinámico `[locale]`. Hay **un solo archivo**
por página que sirve `es`, `ca` y `en`:

- `/{locale}/confirmada/[id]`
- `/{locale}/solicitud-recibida/[id]`

Como el `GtagConversion` vive en ese archivo compartido, **las tres versiones de
idioma disparan la conversión igual**. No existe una versión "solo española".
No hay locale `fr` ni `it`: un navegador en francés/italiano cae al
`defaultLocale` (`es`) vía middleware. El embed detecta el idioma del navegador
(`EmbedLocaleDetector`) y redirige al locale correcto.

---

## 6. Requisitos de CSP

Google Ads necesita cargar scripts y abrir conexiones. La CSP está en
`next.config.mjs` (bloques `securityHeaders` y `embedHeaders`):

- `script-src`: incluye `https://www.googletagmanager.com`,
  `https://www.google-analytics.com`, `https://googleads.g.doubleclick.net`.
- `connect-src 'self' https: wss://*.supabase.co` — se permite **todo HTTPS**
  a propósito: Google Ads enruta las conversiones por dominios específicos de
  país (`google.es`, `google.fr`, `google.it`…) que no se pueden enumerar de
  forma exhaustiva.

> ⚠️ La CSP se define **solo** en `next.config.mjs`. `vercel.json` **no** debe
> tener sección `headers` — si la tuviera, sobreescribiría estos headers a nivel
> de CDN y volvería a bloquear Google Ads (fue un bug real).

---

## 7. Dominio canónico y atribución

El middleware (`src/middleware.ts`) redirige con **301** cualquier petición a
`*.vercel.app` hacia `reservas.cortedemanga.es`. Esto evita que una reserva
completada desde la URL cruda de Vercel registre la conversión bajo el dominio
equivocado.

Además, en modo embed la redirección post-reserva usa **URL absoluta**
(`window.location.origin + destPath`), no relativa, para que la página de
confirmación cargue en `reservas.cortedemanga.es` (el iframe) y no en el dominio
padre donde está incrustado.

---

## 8. Handshake embed → web padre (conversión en `cortedemanga.es`)

Cuando el formulario corre embebido en `cortedemanga.es`, al confirmar una
reserva la app emite un `postMessage` a la web padre para que **esta** dispare la
conversión de Google Ads en su propio dominio:

```js
// src/components/forms/ReservationForm.tsx (dentro de if (embed))
if (window.parent !== window) {
  window.parent.postMessage({ type: 'cmReservaConfirmada' }, 'https://cortedemanga.es');
}
```

- **`targetOrigin` = `https://cortedemanga.es`** (sin `www`). El navegador solo
  entrega el mensaje si el iframe está embebido exactamente en ese origen; si la
  web padre se sirviera desde `www.` o desde `cartacorte.netlify.app`, el mensaje
  se descartaría en silencio y no habría conversión.
- **Lado app de reservas: ✅ desplegado.** Emite `cmReservaConfirmada`.
- **Lado web padre (`cortedemanga.es`): ✅ desplegado.** En `index.html` (en
  producción) hay un listener que:
  - Filtra por `event.data.type === 'cmReservaConfirmada'`.
  - Valida el origen: acepta `https://reservas.cortedemanga.es` **y**
    `https://aplicaci-n-reservas.vercel.app` (cubre ambos por si el embed cambia
    de dominio).
  - Dispara la conversión #4 `gtag('event','conversion',{send_to:
    'AW-18213186788/ZVVDCKDA07kcEOTZ3OxD'})` más un evento GA4 `reserva_conversion`.

  ```js
  window.addEventListener('message', (event) => {
    const OK = ['https://reservas.cortedemanga.es', 'https://aplicaci-n-reservas.vercel.app'];
    if (!OK.includes(event.origin)) return;
    if (event.data?.type !== 'cmReservaConfirmada') return;
    gtag('event', 'conversion', { send_to: 'AW-18213186788/ZVVDCKDA07kcEOTZ3OxD' });
    gtag('event', 'reserva_conversion'); // GA4
  });
  ```

> **Handshake completo por ambos lados.**
>
> **Cuándo dispara exactamente la #4:** el `postMessage cmReservaConfirmada` se
> emite en `ReservationForm.tsx` **solo tras crear la reserva con éxito** (dentro
> de `if (embed)`, después de que `createReserva` devuelva OK). Es decir, la #4
> se dispara sobre una **reserva completada**, no sobre un clic en "Reservar". Si
> en la consola de Ads esa acción está conceptualizada como "clic en reservar",
> hay un desajuste de etiqueta: mediante este handshake mide *completaciones*
> embebidas (el mismo hecho que la #2), no intención. No cambia la conclusión
> (dejar #4 Secundaria), pero conviene que el nombre en Ads refleje lo que mide.

### Detalle del `targetOrigin`

La app emite con `targetOrigin = 'https://cortedemanga.es'` (dominio canónico,
sin `www`). El mensaje **solo se entrega si la web padre está en ese origen
exacto**. Como Netlify redirige `www.cortedemanga.es` → `cortedemanga.es`, en la
práctica siempre coincide. Único caso de fallo: que esa redirección www→apex se
desactivara; entonces un usuario en `www.` no generaría conversión embebida.

---

## 9. Flecos externos (fuera de este repo)

| Fleco | Estado | Dónde |
|-------|--------|-------|
| `postMessage cmReservaConfirmada` al confirmar | ✅ Hecho | App de reservas (este repo) |
| Listener que dispara la conversión `ZVVDCKDA...` al recibir el mensaje | ✅ Hecho | Web padre `cortedemanga.es` |
| Conversión principal ya elegida: **#2 `MkMuCMe...` Primary, #4 `ZVVDCKDA...` Secondary** — solo **verificar** que sigue así tras estos cambios de código | 🔎 Verificar | Consola de Google Ads |
| Verificar que `ZVVDCKDA...` registra (reserva de prueba **anulándola después**; contamina la #2 Primary y ocupa cupo real) | ⏳ Pendiente | Consola de Google Ads |
| Optimizar campañas hacia la #2 (no cambiar la primaria) | ⏳ Pendiente | Consola de Google Ads |
| Destino de anuncios → `#reservas`: **en revisión**, depende de si el ancla baja a una sección o abre el formulario directo (fricción prematura para tráfico de descubrimiento EN) | ⏳ En decisión | Consola de Google Ads |

---

## 10. Troubleshooting

| Síntoma | Causa probable |
|---------|----------------|
| `window.gtag` es `undefined` | El tag base usa `function gtag()` en vez de `window.gtag = ...` |
| Error CSP con `google.es`/`google.fr` en consola | `connect-src` demasiado restrictivo (debe ser `https:`) o `vercel.json` tiene headers que sobreescriben |
| Error CSP con `googleads.g.doubleclick.net` | Falta ese dominio en `script-src` |
| 0 conversiones aunque el código dispara | Deploy de Vercel no terminado; hacer hard refresh (Ctrl+Shift+R) |
| Conversión atribuida a `*.vercel.app` | Falta la redirección 301 del middleware al dominio canónico |
| Solicitud pendiente rechazada cuenta como confirmada | La conversión #2 no estaba condicionada a `!isPending` |

### Cómo verificar que dispara
1. DevTools → pestaña **Network**, filtro `google`.
2. Completar una reserva de prueba.
3. Buscar la petición a `.../pagead/1p-conversion/18213186788/...` con el `label`
   correspondiente. Estado 200 (o `no-cors`/opaque) = disparó.
4. Alternativa: extensión **Google Tag Assistant**.
