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
