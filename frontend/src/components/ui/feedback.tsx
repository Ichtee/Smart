'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

/*
 * In-app replacements for window.alert / window.confirm.
 *   const toast = useToast();      toast.error('Không lưu được'); toast.success('Đã lưu');
 *   const confirm = useConfirm();  if (!(await confirm({ message: 'Xóa?', tone: 'danger' }))) return;
 * Without a <FeedbackProvider> (a component rendered on its own) both fall back to the native dialogs.
 */

type ToastKind = 'success' | 'error' | 'info';
interface ToastItem { id: number; kind: ToastKind; message: string }
interface ToastApi { success: (m: string) => void; error: (m: string) => void; info: (m: string) => void }

export interface ConfirmOptions {
  message: string;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'default';
}
type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>;

const ToastContext = createContext<ToastApi | null>(null);
const ConfirmContext = createContext<ConfirmFn | null>(null);

const nativeToast: ToastApi = {
  success: m => window.alert(m),
  error: m => window.alert(m),
  info: m => window.alert(m),
};
const nativeConfirm: ConfirmFn = async o => window.confirm(typeof o === 'string' ? o : o.message);

export const useToast = () => useContext(ToastContext) ?? nativeToast;
export const useConfirm = () => useContext(ConfirmContext) ?? nativeConfirm;

const TOAST_MS = 5000;
const STYLE: Record<ToastKind, { icon: typeof Info; box: string }> = {
  success: { icon: CheckCircle2, box: 'border-success/40 text-success' },
  error: { icon: XCircle, box: 'border-destructive/40 text-destructive' },
  info: { icon: Info, box: 'border-primary/40 text-primary' },
};

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const [pending, setPending] = useState<{ options: ConfirmOptions; resolve: (ok: boolean) => void } | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const dismiss = useCallback((id: number) => setToasts(t => t.filter(x => x.id !== id)), []);
  const push = useCallback((kind: ToastKind, message: string) => {
    const id = nextId.current++;
    setToasts(t => [...t.slice(-3), { id, kind, message }]);
    setTimeout(() => dismiss(id), TOAST_MS);
  }, [dismiss]);

  const toast = useMemo<ToastApi>(() => ({
    success: m => push('success', m),
    error: m => push('error', m),
    info: m => push('info', m),
  }), [push]);

  const confirm = useCallback<ConfirmFn>(
    o => new Promise<boolean>(resolve => setPending({ options: typeof o === 'string' ? { message: o } : o, resolve })),
    [],
  );

  const settle = useCallback((ok: boolean) => {
    setPending(p => { p?.resolve(ok); return null; });
  }, []);

  useEffect(() => {
    if (!pending) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') settle(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [pending, settle]);

  const danger = pending?.options.tone === 'danger';

  return (
    <ToastContext.Provider value={toast}>
      <ConfirmContext.Provider value={confirm}>
        {children}

        <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[100] flex flex-col items-center gap-2 px-4 md:bottom-6">
          {toasts.map(t => {
            const { icon: Icon, box } = STYLE[t.kind];
            return (
              <div
                key={t.id}
                role={t.kind === 'error' ? 'alert' : 'status'}
                className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border bg-popover px-4 py-3 text-sm font-medium text-foreground shadow-2xl animate-[toast-in_.2s_ease-out] ${box}`}
              >
                <Icon className="mt-0.5 size-5 shrink-0" />
                <p className="flex-1 break-words text-foreground">{t.message}</p>
                <button type="button" aria-label="Đóng thông báo" onClick={() => dismiss(t.id)} className="-m-1 rounded-full p-1 text-muted-foreground hover:text-foreground cursor-pointer">
                  <X className="size-4" />
                </button>
              </div>
            );
          })}
        </div>

        {pending && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60" onClick={() => settle(false)} />
            <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message" className="relative w-full max-w-sm rounded-3xl border border-border bg-popover p-6 shadow-2xl">
              <div className="mb-3 flex items-center gap-3">
                <span className={`inline-flex size-10 items-center justify-center rounded-full ${danger ? 'bg-destructive/15 text-destructive' : 'bg-primary/15 text-primary'}`}>
                  <AlertTriangle className="size-5" />
                </span>
                <h2 id="confirm-title" className="text-xl font-bold">{pending.options.title ?? (danger ? 'Xác nhận xóa' : 'Xác nhận')}</h2>
              </div>
              <p id="confirm-message" className="mb-6 text-sm leading-relaxed text-muted-foreground">{pending.options.message}</p>
              <div className="flex gap-3">
                <button ref={cancelRef} type="button" onClick={() => settle(false)} className="flex-1 min-h-11 rounded-xl border border-border bg-surface-elevated px-4 text-sm font-bold hover:bg-muted cursor-pointer">
                  {pending.options.cancelLabel ?? 'Hủy'}
                </button>
                <button type="button" onClick={() => settle(true)} className={`flex-1 min-h-11 rounded-xl px-4 text-sm font-bold cursor-pointer ${danger ? 'bg-destructive text-destructive-foreground hover:opacity-90' : 'bg-primary text-primary-foreground hover:opacity-90'}`}>
                  {pending.options.confirmLabel ?? (danger ? 'Xóa' : 'Đồng ý')}
                </button>
              </div>
            </div>
          </div>
        )}
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  );
}
