# SDK de drawer embebible — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir un SDK que se instala en cualquier web con una línea de `<script>` y abre un drawer que muestra un mockup de reservas, todo desde un único proyecto Next.js en Vercel.

**Architecture:** Un solo proyecto Next.js sirve dos cosas: `public/drawer.js` (el "loader" vanilla que se instala en otras webs e inyecta botón + panel + iframe dentro de un Shadow DOM) y `app/embed/page.tsx` (el mockup de reservas que se carga dentro del iframe). El contenido queda aislado por el iframe; el chrome del SDK, por el Shadow DOM. Comunicación de cierre por `postMessage` con validación de origin.

**Tech Stack:** Next.js (App Router) + TypeScript + Tailwind CSS + Vitest/Testing Library. El loader es JavaScript plano sin build. Hosting: Vercel.

**Nota de idioma:** el código, los nombres de archivo y los comandos van en inglés/estándar; la UI del mockup usa etiquetas en español.

---

## Estructura de archivos

```
sdk-drawer/
├─ app/
│  ├─ layout.tsx          (generado por create-next-app; sin cambios)
│  ├─ globals.css         (generado; wire de Tailwind; sin cambios)
│  ├─ page.tsx            (Task 6) demo React que instala el drawer
│  └─ embed/
│     └─ page.tsx         (Task 4) el mockup de reservas
├─ public/
│  ├─ drawer.js           (Task 3) el loader vanilla
│  └─ demo.html           (Task 6) demo en HTML plano
├─ tests/
│  ├─ sanity.test.ts      (Task 2)
│  ├─ drawer.test.ts      (Task 3)
│  └─ embed.test.tsx      (Task 4)
├─ next.config.ts         (Task 5) headers frame-ancestors
├─ vitest.config.ts       (Task 2)
├─ vitest.setup.ts        (Task 2)
├─ README.md              (Task 7)
└─ package.json
```

Responsabilidad por archivo:
- `public/drawer.js` — única responsabilidad: montar/abrir/cerrar el drawer en la web anfitriona. Sin dependencias.
- `app/embed/page.tsx` — única responsabilidad: la UI del mockup de reservas + avisar "cerrar" al parent.
- `next.config.ts` — permitir el embedding en iframe.
- Demos (`app/page.tsx`, `public/demo.html`) — verificación manual dentro y fuera de Next.js.

---

## Task 1: Scaffold del proyecto Next.js + Tailwind

**Files:**
- Create: todo el andamiaje de Next.js en la raíz del repo (via `create-next-app`).

- [ ] **Step 1: Generar el proyecto**

Desde la raíz del repo (que ya contiene `.git` y `docs/`):

```bash
npx create-next-app@latest . --ts --tailwind --app --no-src-dir --no-eslint --import-alias "@/*" --use-npm
```

Notas:
- Si pregunta por Turbopack, aceptar el default.
- El directorio no está vacío (`docs/`, `.git`), pero `create-next-app` solo rechaza si hay archivos en conflicto (p. ej. `package.json`), que no existen. Debe proceder. Si se queja, mover `docs/` temporalmente, generar, y devolver `docs/`.

- [ ] **Step 2: Verificar que arranca en dev**

```bash
npm run dev
```
Expected: sirve en `http://localhost:3000`. En otra terminal: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000` → `200`. Cortar el server (Ctrl-C).

- [ ] **Step 3: Verificar el build de producción**

```bash
npm run build
```
Expected: build termina sin errores ("Compiled successfully").

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js + Tailwind project"
```

---

## Task 2: Configurar Vitest + Testing Library

**Files:**
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `tests/sanity.test.ts`
- Modify: `package.json` (scripts)

- [ ] **Step 1: Instalar dependencias de test**

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 2: Crear `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
  },
});
```

- [ ] **Step 3: Crear `vitest.setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 4: Añadir scripts en `package.json`**

En el objeto `"scripts"`, añadir:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Crear un test de sanidad `tests/sanity.test.ts`**

```ts
import { describe, it, expect } from 'vitest';

describe('test setup', () => {
  it('runs vitest', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 6: Correr los tests (deben pasar)**

```bash
npm test
```
Expected: PASS, 1 test.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: set up Vitest + Testing Library"
```

---

## Task 3: El loader `public/drawer.js` (TDD)

**Files:**
- Create: `tests/drawer.test.ts`
- Create: `public/drawer.js`

- [ ] **Step 1: Escribir los tests del loader (fallan)**

Crear `tests/drawer.test.ts`:

```ts
import { beforeEach, describe, it, expect } from 'vitest';
import '../public/drawer.js';

const internals = () => (window as any).__sdkDrawerInternals;

const baseConfig = {
  appUrl: 'https://app.test/embed',
  appOrigin: 'https://app.test',
  position: 'right' as const,
  width: 460,
  trigger: 'auto' as const,
  buttonText: 'Reservar',
  openOnLoad: false,
};

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('readConfig', () => {
  it('applies defaults when there are no data-* attributes', () => {
    const script = document.createElement('script');
    script.src = 'https://example.com/drawer.js';
    const cfg = internals().readConfig(script);
    expect(cfg.position).toBe('right');
    expect(cfg.width).toBe(460);
    expect(cfg.trigger).toBe('auto');
    expect(cfg.buttonText).toBe('Reservar');
    expect(cfg.appUrl).toBe('https://example.com/embed');
    expect(cfg.appOrigin).toBe('https://example.com');
  });

  it('reads data-* overrides', () => {
    const script = document.createElement('script');
    script.src = 'https://example.com/drawer.js';
    script.dataset.appUrl = 'https://cdn.test/embed';
    script.dataset.position = 'left';
    script.dataset.width = '520';
    script.dataset.trigger = 'manual';
    script.dataset.buttonText = 'Book now';
    const cfg = internals().readConfig(script);
    expect(cfg.appUrl).toBe('https://cdn.test/embed');
    expect(cfg.appOrigin).toBe('https://cdn.test');
    expect(cfg.position).toBe('left');
    expect(cfg.width).toBe(520);
    expect(cfg.trigger).toBe('manual');
    expect(cfg.buttonText).toBe('Book now');
  });
});

describe('createDrawer', () => {
  it('mounts a launcher inside a shadow root and no iframe initially', () => {
    const api = internals().createDrawer(baseConfig);
    expect(api.root).toBeTruthy();
    const btn = api.root.querySelector('.sdk-launcher');
    expect(btn).toBeTruthy();
    expect(btn.textContent).toContain('Reservar');
    expect(api.root.querySelector('iframe')).toBeNull();
    api.destroy();
  });

  it('open() creates the iframe pointing at appUrl and marks the host open', () => {
    const api = internals().createDrawer(baseConfig);
    api.open();
    const iframe = api.root.querySelector('iframe');
    expect(iframe).toBeTruthy();
    expect(iframe.getAttribute('src')).toBe('https://app.test/embed');
    expect(api.host.hasAttribute('data-open')).toBe(true);
    api.destroy();
  });

  it('close() clears the open state', () => {
    const api = internals().createDrawer(baseConfig);
    api.open();
    api.close();
    expect(api.host.hasAttribute('data-open')).toBe(false);
    api.destroy();
  });

  it('toggle() flips the state', () => {
    const api = internals().createDrawer(baseConfig);
    api.toggle();
    expect(api.host.hasAttribute('data-open')).toBe(true);
    api.toggle();
    expect(api.host.hasAttribute('data-open')).toBe(false);
    api.destroy();
  });

  it('closes when Escape is pressed', () => {
    const api = internals().createDrawer(baseConfig);
    api.open();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(api.host.hasAttribute('data-open')).toBe(false);
    api.destroy();
  });

  it('closes when the overlay is clicked', () => {
    const api = internals().createDrawer(baseConfig);
    api.open();
    api.root.querySelector('.sdk-overlay').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(api.host.hasAttribute('data-open')).toBe(false);
    api.destroy();
  });

  it('closes on a postMessage from the app origin', () => {
    const api = internals().createDrawer(baseConfig);
    api.open();
    window.dispatchEvent(new MessageEvent('message', {
      origin: 'https://app.test',
      data: { type: 'sdk-drawer', action: 'close' },
    }));
    expect(api.host.hasAttribute('data-open')).toBe(false);
    api.destroy();
  });

  it('ignores a postMessage from a different origin', () => {
    const api = internals().createDrawer(baseConfig);
    api.open();
    window.dispatchEvent(new MessageEvent('message', {
      origin: 'https://evil.test',
      data: { type: 'sdk-drawer', action: 'close' },
    }));
    expect(api.host.hasAttribute('data-open')).toBe(true);
    api.destroy();
  });

  it('hides the launcher when trigger is manual', () => {
    const api = internals().createDrawer({ ...baseConfig, trigger: 'manual' });
    expect(api.root.querySelector('.sdk-launcher').hidden).toBe(true);
    api.destroy();
  });
});

describe('init', () => {
  beforeEach(() => {
    delete (window as any).__sdkDrawerLoaded;
    delete (window as any).SdkDrawer;
    document.body.innerHTML = '';
  });

  it('is idempotent - mounts a single host even if called twice', () => {
    internals().init();
    internals().init();
    expect(document.querySelectorAll('[data-sdk-drawer-host]').length).toBe(1);
  });

  it('exposes window.SdkDrawer with open/close/toggle', () => {
    internals().init();
    const api = (window as any).SdkDrawer;
    expect(typeof api.open).toBe('function');
    expect(typeof api.close).toBe('function');
    expect(typeof api.toggle).toBe('function');
  });
});
```

- [ ] **Step 2: Correr los tests para verificar que fallan**

```bash
npx vitest run tests/drawer.test.ts
```
Expected: FAIL — no existe `public/drawer.js` (error de import).

- [ ] **Step 3: Implementar `public/drawer.js`**

```js
/* public/drawer.js — SDK loader (vanilla JS, sin build ni dependencias). */
(function () {
  'use strict';

  var STYLES = [
    ':host{all:initial}',
    '*{box-sizing:border-box}',
    '.sdk-launcher{position:fixed;bottom:24px;right:24px;z-index:2147483000;',
    'font-family:system-ui,-apple-system,sans-serif;font-size:15px;font-weight:500;',
    'color:#fff;background:#111;border:none;border-radius:999px;padding:12px 20px;',
    'cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.25)}',
    '.sdk-launcher.sdk-left{right:auto;left:24px}',
    '.sdk-overlay{position:fixed;inset:0;z-index:2147483001;background:rgba(0,0,0,.45);',
    'opacity:0;pointer-events:none;transition:opacity .25s ease}',
    '.sdk-panel{position:fixed;top:0;bottom:0;z-index:2147483002;background:#fff;',
    'max-width:100vw;box-shadow:0 0 40px rgba(0,0,0,.3);transition:transform .3s ease;display:flex}',
    '.sdk-panel.sdk-right{right:0;transform:translateX(100%)}',
    '.sdk-panel.sdk-left{left:0;transform:translateX(-100%)}',
    '.sdk-iframe{border:0;width:100%;height:100%}',
    ':host([data-open]) .sdk-overlay{opacity:1;pointer-events:auto}',
    ':host([data-open]) .sdk-panel{transform:translateX(0)}',
    '@media (max-width:640px){.sdk-panel{width:100vw !important}}'
  ].join('');

  function readConfig(scriptEl) {
    var el = scriptEl || document.currentScript;
    var ds = (el && el.dataset) || {};
    var appUrl = ds.appUrl;
    var appOrigin = '';
    if (!appUrl) {
      try {
        var base = (el && el.src) ? new URL(el.src) : new URL(window.location.href);
        appOrigin = base.origin;
        appUrl = base.origin + '/embed';
      } catch (e) {
        appUrl = '/embed';
      }
    } else {
      try {
        appOrigin = new URL(appUrl, window.location.href).origin;
      } catch (e2) { /* ignore */ }
    }
    return {
      appUrl: appUrl,
      appOrigin: appOrigin,
      position: ds.position === 'left' ? 'left' : 'right',
      width: parseInt(ds.width, 10) || 460,
      trigger: ds.trigger === 'manual' ? 'manual' : 'auto',
      buttonText: ds.buttonText || 'Reservar',
      openOnLoad: ds.openOnLoad === 'true'
    };
  }

  function createDrawer(config) {
    var host = document.createElement('div');
    host.setAttribute('data-sdk-drawer-host', '');
    var root = host.attachShadow({ mode: 'open' });

    var style = document.createElement('style');
    style.textContent = STYLES;
    root.appendChild(style);

    var launcher = document.createElement('button');
    launcher.className = 'sdk-launcher sdk-' + config.position;
    launcher.type = 'button';
    launcher.textContent = config.buttonText;
    launcher.setAttribute('aria-haspopup', 'dialog');
    if (config.trigger === 'manual') launcher.hidden = true;

    var overlay = document.createElement('div');
    overlay.className = 'sdk-overlay';

    var panel = document.createElement('aside');
    panel.className = 'sdk-panel sdk-' + config.position;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Reservas');
    panel.setAttribute('aria-hidden', 'true');
    panel.setAttribute('inert', '');
    panel.setAttribute('tabindex', '-1');
    panel.style.width = config.width + 'px';

    root.appendChild(launcher);
    root.appendChild(overlay);
    root.appendChild(panel);
    (document.body || document.documentElement).appendChild(host);

    var iframe = null;
    var isOpen = false;
    var lastFocused = null;

    function ensureIframe() {
      if (iframe) return;
      iframe = document.createElement('iframe');
      iframe.className = 'sdk-iframe';
      iframe.title = 'Reservas';
      iframe.src = config.appUrl;
      panel.appendChild(iframe);
    }

    function onKey(e) { if (e.key === 'Escape') close(); }

    function onMessage(e) {
      if (config.appOrigin && e.origin !== config.appOrigin) return;
      var d = e.data;
      if (d && d.type === 'sdk-drawer' && d.action === 'close') close();
    }

    function open() {
      if (isOpen) return;
      ensureIframe();
      lastFocused = document.activeElement;
      isOpen = true;
      host.setAttribute('data-open', '');
      panel.removeAttribute('inert');
      panel.setAttribute('aria-hidden', 'false');
      document.addEventListener('keydown', onKey);
      panel.focus();
    }

    function close() {
      if (!isOpen) return;
      isOpen = false;
      host.removeAttribute('data-open');
      panel.setAttribute('inert', '');
      panel.setAttribute('aria-hidden', 'true');
      document.removeEventListener('keydown', onKey);
      if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
    }

    function toggle() { isOpen ? close() : open(); }

    function destroy() {
      window.removeEventListener('message', onMessage);
      document.removeEventListener('keydown', onKey);
      host.remove();
    }

    launcher.addEventListener('click', open);
    overlay.addEventListener('click', close);
    window.addEventListener('message', onMessage);

    return {
      open: open,
      close: close,
      toggle: toggle,
      destroy: destroy,
      host: host,
      root: root
    };
  }

  function init() {
    if (window.__sdkDrawerLoaded) return window.SdkDrawer;
    window.__sdkDrawerLoaded = true;
    var config = readConfig();
    var api = createDrawer(config);
    window.SdkDrawer = api;
    if (config.openOnLoad) api.open();
    return api;
  }

  window.__sdkDrawerInternals = { readConfig: readConfig, createDrawer: createDrawer, init: init };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
```

- [ ] **Step 4: Correr los tests para verificar que pasan**

```bash
npx vitest run tests/drawer.test.ts
```
Expected: PASS — todos los tests de `readConfig`, `createDrawer` e `init`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add embeddable drawer loader (public/drawer.js)"
```

---

## Task 4: El mockup de reservas `app/embed/page.tsx` (TDD)

**Files:**
- Create: `tests/embed.test.tsx`
- Create: `app/embed/page.tsx`

- [ ] **Step 1: Escribir los tests del mockup (fallan)**

Crear `tests/embed.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EmbedPage from '../app/embed/page';

describe('EmbedPage (mockup de reservas)', () => {
  it('renders the reservation fields', () => {
    render(<EmbedPage />);
    expect(screen.getByText('Habitaciones')).toBeInTheDocument();
    expect(screen.getByText('Adultos')).toBeInTheDocument();
    expect(screen.getByText('Niños')).toBeInTheDocument();
    expect(screen.getByText('July 2026')).toBeInTheDocument();
  });

  it('posts a close message to the parent window when close is clicked', () => {
    const spy = vi.spyOn(window.parent, 'postMessage');
    render(<EmbedPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(spy).toHaveBeenCalledWith({ type: 'sdk-drawer', action: 'close' }, '*');
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Correr los tests para verificar que fallan**

```bash
npx vitest run tests/embed.test.tsx
```
Expected: FAIL — no existe `app/embed/page.tsx`.

- [ ] **Step 3: Implementar `app/embed/page.tsx`**

```tsx
'use client';

function Stepper({ label, sub, value }: { label: string; sub: string; value: number }) {
  return (
    <div className="flex items-center justify-between border-b border-neutral-200 py-4">
      <div>
        <p className="text-[15px] font-medium text-neutral-900">{label}</p>
        <p className="text-xs text-neutral-500">{sub}</p>
      </div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label={`Quitar ${label}`}
          className="h-8 w-8 rounded-full border border-neutral-300 text-neutral-600"
        >
          –
        </button>
        <span className="w-4 text-center text-[15px]">{value}</span>
        <button
          type="button"
          aria-label={`Agregar ${label}`}
          className="h-8 w-8 rounded-full border border-neutral-300 text-neutral-600"
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function EmbedPage() {
  const handleClose = () => {
    window.parent.postMessage({ type: 'sdk-drawer', action: 'close' }, '*');
  };

  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const weekdays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  return (
    <div className="flex h-screen flex-col bg-white text-neutral-900">
      <header className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
        <div className="flex items-center gap-3 text-sm text-neutral-500">
          <span>EUR</span>
          <span>EN</span>
        </div>
        <span className="text-lg font-medium tracking-widest">JIVA HILL</span>
        <button
          type="button"
          aria-label="Cerrar"
          onClick={handleClose}
          className="text-xl leading-none text-neutral-500"
        >
          ✕
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mb-4 text-right">
          <button type="button" className="text-sm text-amber-700">
            Add Promo Code
          </button>
        </div>

        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <button type="button" aria-label="Mes anterior" className="text-neutral-400">
              ‹
            </button>
            <p className="text-base font-medium">July 2026</p>
            <button type="button" aria-label="Mes siguiente" className="text-neutral-400">
              ›
            </button>
          </div>
          <div className="mb-2 grid grid-cols-7 gap-y-3 text-center text-xs text-neutral-400">
            {weekdays.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-3 text-center">
            {days.map((d) => (
              <div key={d} className="py-1">
                <span className="text-sm text-neutral-900">{d}</span>
                {d % 3 === 0 && <span className="block text-[10px] text-neutral-400">€{400 + d}</span>}
              </div>
            ))}
          </div>
        </div>

        <Stepper label="Habitaciones" sub="Número de habitaciones" value={1} />
        <Stepper label="Adultos" sub="13 años o más" value={2} />
        <Stepper label="Niños" sub="0 - 12 años" value={0} />

        <div className="mt-6">
          <input
            type="text"
            placeholder="Agent ID"
            className="w-full rounded-md border border-neutral-300 px-4 py-3 text-sm"
          />
        </div>
      </div>

      <footer className="flex items-center justify-between border-t border-neutral-200 px-6 py-4">
        <p className="text-sm text-neutral-500">Selecciona fechas y huéspedes para continuar</p>
        <button
          type="button"
          disabled
          className="rounded-md bg-neutral-200 px-6 py-2 text-sm text-neutral-500"
        >
          Next
        </button>
      </footer>
    </div>
  );
}
```

- [ ] **Step 4: Correr los tests para verificar que pasan**

```bash
npx vitest run tests/embed.test.tsx
```
Expected: PASS — render y postMessage de cierre.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add reservation mockup at /embed"
```

---

## Task 5: Headers para permitir el embedding en iframe

**Files:**
- Create/replace: `next.config.ts` (borrar `next.config.mjs` si existe)

- [ ] **Step 1: Escribir `next.config.ts`**

Si `create-next-app` generó `next.config.mjs`, borrarlo primero:

```bash
rm -f next.config.mjs
```

Crear `next.config.ts`:

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Permite que /embed se muestre dentro de un <iframe> desde cualquier
        // sitio. Para el MVP (maqueta pública) se permite de forma amplia.
        // Cuando haya lógica real, restringir a una allowlist de dominios,
        // p. ej. "frame-ancestors 'self' https://tudominio.com".
        source: '/embed',
        headers: [{ key: 'Content-Security-Policy', value: 'frame-ancestors *' }],
      },
    ];
  },
};

export default nextConfig;
```

- [ ] **Step 2: Verificar el header (dev)**

```bash
npm run dev
```
En otra terminal:
```bash
curl -sI http://localhost:3000/embed | grep -i content-security-policy
```
Expected: `content-security-policy: frame-ancestors *`. Cortar el server.

- [ ] **Step 3: Verificar que el build sigue pasando**

```bash
npm run build
```
Expected: "Compiled successfully".

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: allow /embed to be embedded in an iframe (frame-ancestors)"
```

---

## Task 6: Páginas demo (dentro y fuera de Next.js)

**Files:**
- Replace: `app/page.tsx`
- Create: `public/demo.html`

- [ ] **Step 1: Reemplazar `app/page.tsx` (demo React)**

```tsx
import Script from 'next/script';

export default function Home() {
  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '3rem 1.5rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 28, fontWeight: 600 }}>Demo del SDK Drawer (React / Next.js)</h1>
      <p style={{ color: '#555', marginTop: 12 }}>
        Esta página instala el drawer con el componente <code>next/script</code>. Debería aparecer
        un botón &quot;Reservar&quot; abajo a la derecha. Al hacer clic se abre el panel con el mockup.
      </p>
      <Script src="/drawer.js" strategy="afterInteractive" />
    </main>
  );
}
```

- [ ] **Step 2: Crear `public/demo.html` (demo en HTML plano)**

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Demo SDK Drawer — HTML plano</title>
    <style>
      body { font-family: system-ui, sans-serif; max-width: 640px; margin: 0 auto; padding: 3rem 1.5rem; }
      h1 { font-size: 28px; }
      p { color: #555; }
      code { background: #f2f2f2; padding: 2px 6px; border-radius: 4px; }
    </style>
  </head>
  <body>
    <h1>Demo del SDK Drawer (HTML plano)</h1>
    <p>
      Esta página <strong>no usa React ni Next.js</strong>. El drawer se instala solo con la
      línea <code>&lt;script src="/drawer.js"&gt;&lt;/script&gt;</code> de abajo. Es la prueba de
      que el SDK funciona en cualquier web.
    </p>
    <script src="/drawer.js"></script>
  </body>
</html>
```

- [ ] **Step 3: Verificación manual (dev)**

```bash
npm run dev
```
En el navegador, verificar en ambas URLs (`http://localhost:3000/` y `http://localhost:3000/demo.html`):
- Aparece el botón "Reservar" abajo a la derecha.
- Al hacer clic, el panel entra desde la derecha y el iframe carga el mockup de reservas.
- Cierra con la ✕ del mockup (postMessage), con clic en el overlay y con `Esc`.
- En viewport móvil (DevTools), el panel ocupa el 100% del ancho.

Cortar el server.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add React and plain-HTML demo pages"
```

---

## Task 7: README + verificación final

**Files:**
- Create/replace: `README.md`

- [ ] **Step 1: Escribir `README.md`**

```markdown
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

### API programática

```js
window.SdkDrawer.open();
window.SdkDrawer.close();
window.SdkDrawer.toggle();
```

## Desarrollo

```bash
npm install
npm run dev     # http://localhost:3000  (demo React) y /demo.html (HTML plano)
npm test        # tests con Vitest
npm run build   # build de producción
```

## Deploy

Conectar el repo a Vercel y desplegar. El loader queda en `/drawer.js` y el contenido en `/embed`.
```

- [ ] **Step 2: Verificación final completa**

```bash
npm test
```
Expected: PASS — todos los tests (sanity, drawer, embed).

```bash
npm run build
```
Expected: "Compiled successfully".

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "docs: add README with install and usage instructions"
```

- [ ] **Step 4: Deploy a Vercel (manual, opcional en esta fase)**

1. Subir el repo a GitHub.
2. En Vercel: New Project → importar el repo → Deploy (Next.js se detecta solo).
3. Verificar en producción:
   - `https://TU-DEPLOY.vercel.app/` → botón + drawer.
   - `https://TU-DEPLOY.vercel.app/embed` → mockup directo.
   - `curl -sI https://TU-DEPLOY.vercel.app/embed | grep -i content-security-policy` → `frame-ancestors *`.
4. Instalar en otra web propia pegando `<script src="https://TU-DEPLOY.vercel.app/drawer.js"></script>`.

---

## Checklist de verificación (mapeo al spec)

- [x] Loader vanilla instalable con 1 `<script>` → Task 3 + Task 6
- [x] Aislamiento del chrome con Shadow DOM → Task 3 (STYLES + attachShadow)
- [x] Botón, overlay, panel; abrir/cerrar con clic, overlay y Esc → Task 3
- [x] Config por atributos `data-*` (posición, ancho, trigger, texto, open-on-load) → Task 3
- [x] API global `window.SdkDrawer` (open/close/toggle) → Task 3
- [x] Idempotencia (script incluido dos veces) → Task 3 (`__sdkDrawerLoaded`)
- [x] Cierre desde adentro por postMessage con validación de origin → Task 3
- [x] Mockup de reservas en `/embed` con Tailwind, aislado en iframe → Task 4
- [x] Embedding permitido por headers `frame-ancestors` → Task 5
- [x] Demo dentro (React) y fuera (HTML plano) de Next.js → Task 6
- [x] Deploy único en Vercel sirviendo ambas piezas → Task 7

### Simplificaciones / deferidos respecto al spec (decisiones conscientes)

- **Fallback visual si el iframe no carga** (spec §"Manejo de errores"): **deferido**. Detectar de
  forma fiable un fallo de carga cross-origin es frágil (los eventos `load`/`error` no disparan en
  errores HTTP), y en el MVP `/embed` es del mismo origin y siempre existe, así que no aporta valor.
  Cuando el contenido pase a un dominio propio, añadir un fallback por timeout: si el iframe no
  dispara `load` en ~8s, mostrar un mensaje dentro del panel.
- **Focus trap completo** (spec §"Manejo de errores"/accesibilidad): **simplificado**. Se implementa
  foco al panel al abrir, `inert` + `aria-hidden` al cerrar, `Esc` para cerrar y restaurar el foco al
  botón. No hay un trap de `Tab` que cicle dentro del panel porque el contenido vive en un iframe (el
  foco entra naturalmente al documento embebido); un trap que cruce la frontera del iframe no es
  viable ni necesario para el MVP.
```
