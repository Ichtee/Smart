'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const DEFAULT_HUE = 125; // the original lime
const PRESETS = [
  { name: 'Xanh chanh', hue: 125 },
  { name: 'Xanh lá', hue: 155 },
  { name: 'Xanh ngọc', hue: 190 },
  { name: 'Xanh dương', hue: 250 },
  { name: 'Tím', hue: 300 },
  { name: 'Hồng', hue: 350 },
  { name: 'Cam', hue: 50 },
  { name: 'Vàng', hue: 95 },
];
const PANEL_W = 240;
const PANEL_H = 210;

const currentHue = () => {
  const v = parseFloat(document.documentElement.style.getPropertyValue('--accent-h'));
  return Number.isFinite(v) ? v : DEFAULT_HUE;
};

/** Sets the accent colour of the whole app: the hue changes, lightness and chroma stay tuned for readability. */
const applyHue = (hue: number) => {
  document.documentElement.style.setProperty('--accent-h', String(hue));
  try { localStorage.setItem('accentHue', String(hue)); } catch { /* storage unavailable: the colour just is not remembered */ }
};

/** `children` is the button's face (the logo mark in the sidebar). Opens a small panel to pick the theme colour. */
export default function ThemeColorPicker({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const [at, setAt] = useState<{ left: number; top: number } | null>(null);
  const [hue, setHue] = useState(DEFAULT_HUE);
  const trigger = useRef<HTMLButtonElement>(null);

  const open = () => {
    const r = trigger.current!.getBoundingClientRect();
    const below = r.bottom + 8 + PANEL_H <= window.innerHeight;
    setAt({
      left: Math.max(8, Math.min(r.left, window.innerWidth - PANEL_W - 8)),
      top: below ? r.bottom + 8 : Math.max(8, r.top - 8 - PANEL_H),
    });
    setHue(currentHue());
  };
  const close = () => setAt(null);

  useEffect(() => {
    if (!at) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setAt(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [at]);

  const pick = (h: number) => { setHue(h); applyHue(h); };

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={() => (at ? close() : open())}
        aria-label="Đổi màu giao diện"
        aria-expanded={!!at}
        title="Đổi màu giao diện"
        className={`cursor-pointer ${className}`}
      >
        {children}
      </button>
      {at && createPortal(
        <>
          <div className="fixed inset-0 z-[70]" onClick={close} />
          <div
            role="dialog"
            aria-label="Màu giao diện"
            style={{ left: at.left, top: at.top, width: PANEL_W }}
            className="fixed z-[71] space-y-3 rounded-2xl border border-border bg-card p-4 shadow-2xl"
          >
            <p className="text-sm font-bold">Màu giao diện</p>
            <div className="grid grid-cols-8 gap-1.5">
              {PRESETS.map(p => (
                <button
                  key={p.hue}
                  type="button"
                  aria-label={p.name}
                  title={p.name}
                  onClick={() => pick(p.hue)}
                  style={{ background: `oklch(0.8 0.17 ${p.hue})` }}
                  className={`size-6 cursor-pointer rounded-full border-2 ${Math.round(hue) === p.hue ? 'border-foreground' : 'border-transparent'}`}
                />
              ))}
            </div>
            <input
              type="range"
              aria-label="Tông màu"
              min={0}
              max={360}
              value={Math.round(hue)}
              onChange={e => pick(Number(e.target.value))}
              style={{ background: 'linear-gradient(to right, oklch(0.8 0.17 0), oklch(0.8 0.17 60), oklch(0.8 0.17 120), oklch(0.8 0.17 180), oklch(0.8 0.17 240), oklch(0.8 0.17 300), oklch(0.8 0.17 360))' }}
              className="h-3 w-full cursor-pointer appearance-none rounded-full"
            />
            <button type="button" onClick={() => pick(DEFAULT_HUE)} className="w-full cursor-pointer rounded-xl border border-border py-1.5 text-xs font-bold hover:border-primary">
              Về màu mặc định
            </button>
          </div>
        </>,
        document.body,
      )}
    </>
  );
}
