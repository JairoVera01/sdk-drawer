# Diseño: SDK de drawer embebible (mockup de reservas)

**Fecha:** 2026-07-13
**Estado:** Aprobado el rumbo, pendiente revisión del spec

## Objetivo

Construir un SDK que se instala en cualquier web (Astro, React, Angular, HTML plano)
con **una sola línea de `<script>`** y abre un **drawer** (panel deslizante). Dentro del
drawer se muestra un **mockup de reservas** (estilo el de namastay.io), **sin lógica real
por ahora** — es una maqueta estática.

Todo vive en **un único proyecto Next.js hospedado en Vercel**: el mismo proyecto sirve
tanto el script que se instala (`drawer.js`) como el contenido del drawer (`/embed`).

### Qué NO es (fuera de alcance del MVP)

- Lógica real de reservas, disponibilidad, pagos o backend.
- Publicación en npm + CDN (jsDelivr/unpkg) para que **terceros** lo instalen con versiones.
  Solo hace falta si algún día lo usan webs que no son propias. Para las webs propias,
  servir `drawer.js` desde Vercel alcanza.
- Multi-idioma, theming avanzado, analytics, A/B testing.
- Redimensionado dinámico del panel según la altura del contenido.

## Arquitectura

Un solo repositorio / un solo deploy en Vercel, con dos entregables que conviven:

```
sdk-drawer/
├─ app/
│  ├─ page.tsx            ← página DEMO: simula una web externa que instala el drawer
│  └─ embed/
│     └─ page.tsx         ← CONTENIDO: el mockup de reservas (React/Next.js)
├─ public/
│  ├─ drawer.js           ← LOADER: lo que las otras webs incluyen con <script>
│  └─ demo.html           ← DEMO en HTML plano (prueba que funciona fuera de Next.js)
├─ next.config.ts         ← headers para permitir el embedding en iframe
└─ package.json
```

Flujo de alto nivel:

1. Una web externa incluye `<script src="https://tuapp.vercel.app/drawer.js"></script>`.
2. `drawer.js` lee su configuración, inyecta un botón lanzador y un panel (con overlay)
   dentro de un **Shadow DOM** para no chocar con los estilos del sitio anfitrión.
3. El usuario hace clic en el botón → el panel se desliza y, dentro, un `<iframe>` carga
   la página `/embed` del mismo proyecto Vercel.
4. El contenido de reservas queda **totalmente aislado** (está en un iframe de otro
   documento), así que se ve idéntico en cualquier web sin importar sus estilos.

## Componentes (unidades con una sola responsabilidad)

### 1. El loader — `public/drawer.js`

**Qué hace:** es el "SDK". Un archivo de JavaScript plano (sin build, sin dependencias)
que se sirve tal cual desde `public/`. Responsabilidades:

- Leer configuración desde los atributos `data-*` del propio `<script>`.
- Crear un contenedor con **Shadow DOM** adjunto al `<body>` para encapsular sus estilos.
- Renderizar dentro del shadow root: un botón lanzador flotante, un overlay y el panel.
- Crear el `<iframe>` (con `src` = la URL del contenido) al abrir por primera vez (lazy).
- Manejar abrir / cerrar: clic en el botón, clic en el overlay, tecla `Esc`.
- Escuchar `postMessage` del iframe para poder cerrarse desde adentro, validando el origin.
- Exponer una API global `window.SdkDrawer` con `open()`, `close()`, `toggle()`.
- Ser idempotente: si el script se incluye dos veces, no duplicar la UI.
- Accesibilidad: `role="dialog"`, `aria-modal`, focus trap, `Esc` cierra, y restaurar el
  foco al elemento anterior al cerrar.

**Cómo se usa (desde otra web):**

```html
<!-- forma mínima: botón automático, panel a la derecha, contenido en /embed -->
<script src="https://tuapp.vercel.app/drawer.js"></script>

<!-- forma configurada -->
<script
  src="https://tuapp.vercel.app/drawer.js"
  data-app-url="https://tuapp.vercel.app/embed"
  data-position="right"
  data-width="460"
  data-trigger="auto"
  data-button-text="Reservar"></script>
```

**De qué depende:** de nada externo. Solo del navegador (APIs estándar del DOM).

**Opciones de configuración (atributos `data-*`):**

| Atributo | Valores | Default | Descripción |
|---|---|---|---|
| `data-app-url` | URL | `/embed` del mismo origin del script | Contenido a cargar en el iframe |
| `data-position` | `right` \| `left` | `right` | Lado desde el que entra el panel |
| `data-width` | número (px) | `460` | Ancho del panel en escritorio |
| `data-trigger` | `auto` \| `manual` | `auto` | `auto` crea el botón; `manual` solo expone la API |
| `data-button-text` | texto | `Reservar` | Texto/etiqueta del botón lanzador |
| `data-open-on-load` | `true` \| `false` | `false` | Abrir automáticamente al cargar |

### 2. El contenido — `app/embed/page.tsx`

**Qué hace:** es una página normal de Next.js (React) con el **mockup de reservas**.
Es lo que se ve dentro del drawer. Contenido de la maqueta (estático, tomando como
referencia la captura de namastay):

- Encabezado con logo, selector de idioma/moneda y botón de cerrar (✕).
- Un calendario mensual con precios de ejemplo por día.
- Contadores de Habitaciones, Adultos y Niños (con botones + / −, solo visuales).
- Campo "Agent ID" / "Add Promo Code" (solo visuales).
- Barra inferior con estado ("Select dates and guests to proceed") y botón "Next"
  deshabilitado.

**Comportamiento:**

- El botón de cerrar (✕) envía `postMessage` al `window.parent` para que el loader cierre
  el panel: `{ type: 'sdk-drawer', action: 'close' }`.
- Debe verse bien en un contenedor **angosto** (~460px de ancho) y en móvil a pantalla
  completa. Diseño responsive.

**De qué depende:** de React/Next.js y del sistema de estilos del proyecto (Tailwind CSS).

**Decisión de estilos:** usar **Tailwind CSS** para el mockup de reservas, por velocidad de
maquetado. El loader (`drawer.js`) NO usa Tailwind — lleva sus propios estilos inline dentro
del Shadow DOM.

### 3. La página demo — `app/page.tsx` y `public/demo.html`

**Qué hace:** sirven para desarrollar y verificar el SDK como si fuéramos una web externa.

- `app/page.tsx`: una landing mínima que incluye el `<script src="/drawer.js">` y algo de
  contenido de relleno, para probar el flujo completo dentro del mismo proyecto.
- `public/demo.html`: un archivo HTML **plano** (sin React, sin Next.js) que incluye el
  mismo script. Sirve para **demostrar que el SDK funciona en cualquier web**, no solo en
  una app Next.js. Es la prueba de fuego del objetivo.

## Flujo de datos y comunicación

- **Host → loader:** vía atributos `data-*` del `<script>` (config estática al cargar).
- **Loader → contenido:** vía la `src` del iframe (la URL `data-app-url`). No se pasan datos
  dinámicos en el MVP; el contenido es una maqueta.
- **Contenido → loader:** vía `window.parent.postMessage({ type: 'sdk-drawer', action: 'close' }, '*')`.
  El loader escucha `message`, **valida `event.origin`** contra el origin de `data-app-url`
  e ignora todo lo demás. Solo se soporta la acción `close` en el MVP.

## Aislamiento

- **Contenido de reservas:** aislado por naturaleza al vivir en un `<iframe>` (documento y
  estilos separados). Los estilos del sitio anfitrión no pueden afectarlo.
- **Botón + panel + overlay del loader:** aislados con **Shadow DOM**. Todos los estilos del
  SDK se inyectan como un `<style>` dentro del shadow root, con lo que ni el host afecta al
  SDK ni el SDK afecta al host.
- **Embedding (headers):** `/embed` debe poder mostrarse dentro de un `<iframe>` desde otros
  dominios. En `next.config.ts` se configuran los headers para NO enviar `X-Frame-Options`
  y, en su lugar, una CSP `frame-ancestors`. Para el MVP (maqueta pública) se permite el
  embedding de forma amplia; queda anotado como punto a restringir (allowlist de dominios)
  cuando haya lógica real.

## Manejo de errores y casos borde

- **Iframe no carga** (URL mala o caída): mostrar un mensaje de fallback dentro del panel.
- **`postMessage` de origin desconocido:** ignorarlo (validación de `event.origin`).
- **Script incluido dos veces:** el loader marca un flag global (`window.__sdkDrawerLoaded`)
  y no vuelve a montar la UI.
- **`data-app-url` ausente:** usar por defecto `/embed` relativo al origin del script (que se
  deduce de `document.currentScript.src`).
- **Accesibilidad:** focus trap dentro del panel abierto, `Esc` cierra, `aria-*` correctos,
  el foco vuelve al botón lanzador al cerrar, el overlay tiene `aria-hidden`.
- **Móvil:** por debajo de ~640px el panel ocupa el 100% del ancho.

## Estrategia de pruebas

Como es una maqueta sin backend, la verificación principal es **manual**, con una checklist
reproducible:

1. **Dentro de Next.js** (`app/page.tsx`, `npm run dev`): el botón aparece; al hacer clic se
   abre el panel; el iframe carga `/embed`; el mockup se ve bien; cerrar funciona con la ✕
   (postMessage), con el overlay y con `Esc`.
2. **Fuera de Next.js** (`public/demo.html`, un HTML plano sin React): servirlo desde el
   mismo origin del dev server (`http://localhost:3000/demo.html`) usando
   `<script src="/drawer.js">`. El mismo script funciona igual que en la página React, lo que
   valida el objetivo "instalable en cualquier web". Para simular un dominio **distinto** al
   del contenido, servir `demo.html` desde otro puerto y usar `data-app-url` absoluto
   apuntando al origin de `/embed` (esto ejercita también la validación de origin del
   `postMessage` y los headers `frame-ancestors`).
3. **Aislamiento:** cargar la demo en una página con CSS agresivo (resets, `* { }` globales)
   y confirmar que el drawer no se rompe ni rompe la página.
4. **Responsive:** verificar en viewport móvil que el panel va a pantalla completa.
5. **Idempotencia:** incluir el script dos veces y confirmar que no se duplica el botón.

Pruebas automatizadas (Playwright para abrir/cerrar) quedan como mejora futura opcional,
fuera del MVP.

## Despliegue

1. Conectar el repo a **Vercel** y hacer deploy (Next.js se detecta solo).
2. Tras el deploy:
   - El loader queda en `https://<deploy>.vercel.app/drawer.js`.
   - El contenido queda en `https://<deploy>.vercel.app/embed`.
3. Para instalar en otra web propia: pegar `<script src="https://<deploy>.vercel.app/drawer.js"></script>`.
4. (Opcional, más adelante) apuntar un subdominio propio (`reservas.tudominio.com`) al deploy.

## Stack tecnológico (resumen de decisiones)

- **Next.js (App Router) + React + TypeScript** — el proyecto y el contenido `/embed`.
- **Tailwind CSS** — estilos del mockup de reservas.
- **`public/drawer.js` en JavaScript plano** — el loader, sin build ni dependencias, con sus
  estilos inline dentro de un Shadow DOM.
- **Vercel** — hosting único para ambas piezas.
- Sin npm/CDN externo en el MVP (solo webs propias).
```
