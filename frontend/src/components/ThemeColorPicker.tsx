'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const DEFAULT_COLOR = '#b8f200'; // the original lime
const CUSTOM_VARS = ['--primary', '--accent', '--ring', '--chart-1', '--primary-foreground', '--accent-foreground', '--primary-soft', '--glow', '--glow-strong'];
const HEX = /^#[0-9a-f]{6}$/i;
const PANEL_W = 240;
const PANEL_H = 180;

/** Text on top of the colour: dark on light colours, white on dark ones (sRGB relative luminance). */
const readableOn = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? '#101010' : '#ffffff';
};

/** Back to the colours the stylesheet defines. */
const resetColor = () => {
  const style = document.documentElement.style;
  CUSTOM_VARS.forEach(v => style.removeProperty(v));
  style.removeProperty('--accent-h');
  try {
    localStorage.removeItem('accentVars');
    localStorage.removeItem('accentHue');
  } catch { /* storage unavailable */ }
};

/** An exact colour (any RGB) for the whole app; the layout script re-applies it before paint from localStorage. */
const applyColor = (hex: string) => {
  const vars: Record<string, string> = {
    '--primary': hex, '--accent': hex, '--ring': hex, '--chart-1': hex,
    '--primary-foreground': readableOn(hex), '--accent-foreground': readableOn(hex),
    '--primary-soft': `color-mix(in oklab, ${hex} 22%, var(--card))`,
    '--glow': `color-mix(in srgb, ${hex} 30%, transparent)`,
    '--glow-strong': `color-mix(in srgb, ${hex} 50%, transparent)`,
  };
  Object.entries(vars).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
  try {
    localStorage.setItem('accentVars', JSON.stringify(vars));
    localStorage.removeItem('accentHue');
  } catch { /* storage unavailable: the colour just is not remembered */ }
};

/** `children` is the button's face (the logo mark in the sidebar). Opens a small panel to pick the theme colour. */
export default function ThemeColorPicker({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const [at, setAt] = useState<{ left: number; top: number } | null>(null);
  const [hex, setHex] = useState(DEFAULT_COLOR); // text of the hex box; the colour picker needs a valid one
  const trigger = useRef<HTMLButtonElement>(null);

  const open = () => {
    const r = trigger.current!.getBoundingClientRect();
    const below = r.bottom + 8 + PANEL_H <= window.innerHeight;
    setAt({
      left: Math.max(8, Math.min(r.left, window.innerWidth - PANEL_W - 8)),
      top: below ? r.bottom + 8 : Math.max(8, r.top - 8 - PANEL_H),
    });
    const custom = document.documentElement.style.getPropertyValue('--primary').trim();
    setHex(HEX.test(custom) ? custom : DEFAULT_COLOR);
  };
  const close = () => setAt(null);

  useEffect(() => {
    if (!at) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setAt(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [at]);

  const pickColor = (value: string) => {
    setHex(value);
    const full = value.startsWith('#') ? value : `#${value}`;
    if (HEX.test(full)) applyColor(full.toLowerCase());
  };

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
            <div className="flex items-center gap-2">
              <input
                type="color"
                aria-label="Chọn màu RGB"
                value={HEX.test(hex) ? hex : DEFAULT_COLOR}
                onChange={e => pickColor(e.target.value)}
                className="h-9 w-12 shrink-0 cursor-pointer rounded-lg border border-border bg-transparent p-0.5"
              />
              <input
                type="text"
                aria-label="Mã màu hex"
                value={hex}
                maxLength={7}
                spellCheck={false}
                onChange={e => pickColor(e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2 py-1.5 font-mono text-sm"
              />
            </div>
            <button type="button" onClick={() => { resetColor(); setHex(DEFAULT_COLOR); }} className="w-full cursor-pointer rounded-xl border border-border py-1.5 text-xs font-bold hover:border-primary">
              Về màu mặc định
            </button>
          </div>
        </>,
        document.body,
      )}
    </>
  );
}
