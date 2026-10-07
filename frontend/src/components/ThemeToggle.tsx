'use client';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

/** Switches between the dark (default) and light theme; the choice is saved in localStorage. */
export default function ThemeToggle({ className = '' }: { className?: string }) {
  const [light, setLight] = useState(false);

  useEffect(() => {
    setLight(document.documentElement.classList.contains('light'));
  }, []);

  const toggle = () => {
    const next = !light;
    document.documentElement.classList.toggle('light', next);
    try { localStorage.setItem('theme', next ? 'light' : 'dark'); } catch {}
    setLight(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={light ? 'Chuyển sang giao diện tối' : 'Chuyển sang giao diện sáng'}
      title={light ? 'Giao diện tối' : 'Giao diện sáng'}
      className={`inline-flex size-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:text-foreground hover:bg-surface-elevated cursor-pointer ${className}`}
    >
      {light ? <Moon className="size-4" /> : <Sun className="size-4" />}
    </button>
  );
}
