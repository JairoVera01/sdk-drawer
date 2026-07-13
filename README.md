# SDK Drawer

Un SDK embebible que abre un drawer con un mockup de reservas. Todo vive en un único
proyecto Next.js hospedado en Vercel: el mismo proyecto sirve el loader `public/drawer.js`
y el contenido en `/embed`.

## Instalar en otra web

Pegar una línea (funciona en Astro, React, Angular o HTML plano):

```html
<script src="https://TU-DEPLOY.vercel.app/drawer.js"></script>
```

### Opciones (atributos data-*)

| Atributo | Valores | Default | Descripción |
|---|---|---|---|
| `data-app-url` | URL | `/embed` del origin del script | Contenido del iframe |
| `data-position` | `right` \| `left` | `right` | Lado del panel |
| `data-width` | número (px) | `460` | Ancho en escritorio |
| `data-trigger` | `auto` \| `manual` | `auto` | `manual` no crea botón; usar la API |
| `data-button-text` | texto | `Reservar` | Texto del botón |
| `data-open-on-load` | `true` \| `false` | `false` | Abrir al cargar |
| `data-accent-color` | color (hex/CSS) | (ninguno) | Color de acento interno del contenido: precios, link de promo y botón "Next" |
| `data-title` | texto | `JIVA HILL` | Título que se muestra en el header del contenido |

### API programática

```js
window.SdkDrawer.open();
window.SdkDrawer.close();
window.SdkDrawer.toggle();
```

Ejemplo con trigger manual (sin botón flotante, disparado por tu propio botón):

```html
<button onclick="window.SdkDrawer.open()">Reservar ahora</button>
<script src="https://TU-DEPLOY.vercel.app/drawer.js" data-trigger="manual"></script>
```

## Desarrollo

```bash
npm install
npm run dev     # http://localhost:3000  (demo React) y /demo.html (HTML plano)
npm test        # tests con Vitest
npm run build   # build de producción
```

- `public/drawer.js` — el loader vanilla (sin build) que se instala en otras webs.
- `app/embed/page.tsx` — el mockup de reservas que se carga dentro del iframe.
- `app/page.tsx` y `public/demo.html` — páginas de demo (dentro y fuera de Next.js).

## Deploy

Conectar el repo a Vercel y desplegar. El loader queda en `/drawer.js` y el contenido en
`/embed`. Para instalar en otra web propia, pegar el `<script>` apuntando a tu deploy.

## Limitaciones conocidas (MVP)

- **Sin lógica real de reservas.** `/embed` es una maqueta estática (sin disponibilidad,
  precios reales, ni backend).
- **`frame-ancestors *`.** El header en `/embed` permite el embedding desde cualquier sitio
  (cómodo para el MVP). Cuando haya lógica real, restringir a una allowlist en `next.config.ts`,
  p. ej. `frame-ancestors 'self' https://tudominio.com`.
- **Stacking context del sitio anfitrión.** El drawer usa `position: fixed` con `z-index` muy
  alto. Si el sitio anfitrión aplica `transform`, `filter` o `will-change` a `<html>`/`<body>`,
  eso crea un contexto de apilamiento que puede recortar o reposicionar el panel. Es una
  limitación inherente a cualquier widget embebido por script; poco común en la práctica.
- **`inert` en navegadores viejos.** El panel cerrado usa el atributo `inert` para sacarlo del
  orden de tabulación. En navegadores sin soporte de `inert` (muy antiguos) ese aislamiento de
  foco no aplica, aunque el resto funciona.
- **Distribución solo para webs propias.** No se publica en npm/CDN para terceros; se sirve
  `drawer.js` desde el propio deploy de Vercel.
