'use client';
import { useState } from 'react';
import { apiFetch, describeError } from '@/utils/api';
import { useToast } from '@/components/ui/feedback';

const field = 'w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary';

/** Change the password of the signed-in account; the server checks the current one. */
export default function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (next !== again) return setError('Mật khẩu mới nhập lại chưa khớp.');
    setError('');
    setSaving(true);
    try {
      const res = await apiFetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: next, currentPassword: current }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || 'Không thể đổi mật khẩu.');
      }
      toast.success('Đã đổi mật khẩu.');
      onClose();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-label="Đổi mật khẩu"
        onSubmit={submit}
        onClick={e => e.stopPropagation()}
        onKeyDown={e => e.key === 'Escape' && onClose()}
        className="w-full max-w-sm space-y-3 rounded-3xl border border-border bg-card p-5 shadow-2xl"
      >
        <h2 className="text-lg font-black">Đổi mật khẩu</h2>
        <label className="block space-y-1 text-xs font-bold text-muted-foreground">
          Mật khẩu hiện tại
          <input type="password" autoComplete="current-password" required autoFocus value={current} onChange={e => setCurrent(e.target.value)} className={field} />
        </label>
        <label className="block space-y-1 text-xs font-bold text-muted-foreground">
          Mật khẩu mới (8–100 ký tự)
          <input type="password" autoComplete="new-password" required minLength={8} maxLength={100} value={next} onChange={e => setNext(e.target.value)} className={field} />
        </label>
        <label className="block space-y-1 text-xs font-bold text-muted-foreground">
          Nhập lại mật khẩu mới
          <input type="password" autoComplete="new-password" required value={again} onChange={e => setAgain(e.target.value)} className={field} />
        </label>
        {error && <p role="alert" className="text-sm font-semibold text-destructive">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="min-h-11 cursor-pointer rounded-xl border border-border px-4 text-sm font-bold hover:border-primary">Hủy</button>
          <button type="submit" disabled={saving} className="min-h-11 cursor-pointer rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground disabled:opacity-50">
            {saving ? 'Đang lưu...' : 'Đổi mật khẩu'}
          </button>
        </div>
      </form>
    </div>
  );
}
