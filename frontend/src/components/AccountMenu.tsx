'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { KeyRound, LogOut, User, UserCog } from 'lucide-react';
import { API_URL } from '@/utils/api';
import { clearApiCache, useProfile } from '@/hooks/useApi';
import ChangePasswordModal from './ChangePasswordModal';

const item = 'flex w-full min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold hover:bg-surface-elevated';

/** The round profile button in the title bar and the menu it opens: profile, change password, sign out. */
export default function AccountMenu() {
  const router = useRouter();
  const { profile } = useProfile();
  const [open, setOpen] = useState(false);
  const [changing, setChanging] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const logout = async () => {
    try {
      await fetch(`${API_URL}/api/users/logout`, { method: 'POST', credentials: 'include' });
    } catch {
      // the server could not be reached: the local sign-out below still happens
    }
    localStorage.clear();
    clearApiCache();
    router.push('/');
  };

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label="Tài khoản"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex size-10 cursor-pointer items-center justify-center rounded-full border border-primary/30 bg-primary/15 text-primary transition hover:scale-105"
      >
        <User className="size-5" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-12 z-50 w-64 rounded-2xl border border-border bg-card p-2 shadow-2xl">
          <div className="border-b border-border px-3 pb-2 pt-1">
            <p className="truncate text-sm font-bold">{profile?.name || profile?.username || 'Tài khoản'}</p>
            {profile?.email && <p className="truncate text-xs text-muted-foreground">{profile.email}</p>}
          </div>
          <div className="pt-1">
            <Link role="menuitem" href="/profile" onClick={() => setOpen(false)} className={item}><UserCog className="size-4" /> Thông tin cá nhân</Link>
            <button role="menuitem" type="button" onClick={() => { setOpen(false); setChanging(true); }} className={item}><KeyRound className="size-4" /> Đổi mật khẩu</button>
            <button role="menuitem" type="button" onClick={logout} className={`${item} text-destructive hover:bg-destructive/10`}><LogOut className="size-4" /> Đăng xuất</button>
          </div>
        </div>
      )}
      {changing && <ChangePasswordModal onClose={() => setChanging(false)} />}
    </div>
  );
}
