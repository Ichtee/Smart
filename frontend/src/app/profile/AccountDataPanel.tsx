'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Trash2, Loader2 } from 'lucide-react';
import { apiFetch, describeError, isUnauthorized } from '@/utils/api';
import { clearApiCache } from '@/hooks/useApi';

async function errorText(res: Response, fallback: string) {
  try {
    const body = await res.json();
    if (body && body.message) return String(body.message);
  } catch {
    // non-JSON error body
  }
  return fallback;
}

/** Download everything stored about the user, and permanently delete the account (password required). */
export default function AccountDataPanel() {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const sessionExpired = () => {
    localStorage.clear();
    clearApiCache();
    router.push('/login');
  };

  const handleExport = async () => {
    setError('');
    setExporting(true);
    try {
      const res = await apiFetch('/api/users/me/export');
      if (isUnauthorized(res)) return sessionExpired();
      if (!res.ok) throw new Error(await errorText(res, 'Không thể xuất dữ liệu.'));
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = 'my-fitness-data.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || deleting) return;
    setError('');
    setDeleting(true);
    try {
      const res = await apiFetch('/api/users/me', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (isUnauthorized(res)) return sessionExpired();
      if (!res.ok) throw new Error(await errorText(res, 'Không thể xóa tài khoản.'));
      localStorage.clear();
      clearApiCache();
      router.push('/');
    } catch (err) {
      setError(describeError(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section aria-labelledby="account-data-title" className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-2xl mt-8 space-y-6">
      <h2 id="account-data-title" className="text-lg font-black text-foreground">Dữ liệu và tài khoản</h2>

      {error && (
        <div role="alert" className="p-3 rounded-2xl border bg-destructive/10 border-destructive/30 text-destructive text-xs font-semibold">{error}</div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-muted-foreground text-xs font-semibold">Tải về toàn bộ dữ liệu của bạn (hồ sơ, buổi tập, dinh dưỡng, chỉ số cơ thể, lịch tập và món ăn riêng) dưới dạng JSON.</p>
        <button type="button" onClick={handleExport} disabled={exporting} className="shrink-0 flex items-center gap-2 px-5 py-3 rounded-2xl border border-border text-sm font-bold hover:bg-secondary disabled:opacity-60 cursor-pointer">
          {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          Xuất dữ liệu
        </button>
      </div>

      <div className="border-t border-border pt-6">
        {!confirming ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-muted-foreground text-xs font-semibold">Xóa vĩnh viễn tài khoản và toàn bộ dữ liệu. Không thể hoàn tác.</p>
            <button type="button" onClick={() => setConfirming(true)} className="shrink-0 flex items-center gap-2 px-5 py-3 rounded-2xl border border-destructive/40 text-destructive text-sm font-bold hover:bg-destructive/10 cursor-pointer">
              <Trash2 className="size-4" />
              Xóa tài khoản
            </button>
          </div>
        ) : (
          <form onSubmit={handleDelete} className="space-y-3">
            <label htmlFor="delete-password" className="block text-xs font-semibold text-destructive">
              Nhập mật khẩu để xác nhận xóa tài khoản vĩnh viễn
            </label>
            <input
              id="delete-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-background border border-border rounded-2xl px-4 py-3 text-sm"
            />
            <div className="flex gap-3">
              <button type="submit" disabled={!password || deleting} className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-destructive text-white text-sm font-bold disabled:opacity-60 cursor-pointer">
                {deleting && <Loader2 className="size-4 animate-spin" />}
                Xóa vĩnh viễn
              </button>
              <button type="button" onClick={() => { setConfirming(false); setPassword(''); setError(''); }} className="px-5 py-3 rounded-2xl border border-border text-sm font-bold hover:bg-secondary cursor-pointer">
                Hủy
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
