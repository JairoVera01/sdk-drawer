'use client';

import { useEffect } from 'react';

function postClose() {
  window.parent.postMessage({ type: 'sdk-drawer', action: 'close' }, '*');
}

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
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') postClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
          onClick={postClose}
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
