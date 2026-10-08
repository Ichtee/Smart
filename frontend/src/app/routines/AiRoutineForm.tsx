'use client';
import { useState } from 'react';
import { describeError } from '@/utils/api';
import { postAi } from '@/utils/ai';
import { Loader2, Sparkles } from 'lucide-react';

interface Props {
  /** Receives the generated routine (not saved yet) */
  onGenerated: (routine: unknown) => void;
  onCancel: () => void;
}

const DAY_OPTIONS = [1, 2, 3, 4, 5, 6];
const EQUIPMENT = [
  { value: 'gym', label: 'Phòng gym' },
  { value: 'dumbbells', label: 'Tạ đơn tại nhà' },
  { value: 'bodyweight', label: 'Không dụng cụ' },
];

export default function AiRoutineForm({ onGenerated, onCancel }: Props) {
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [equipment, setEquipment] = useState('gym');
  const [notes, setNotes] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const generate = async () => {
    if (pending) return;
    setPending(true);
    setError('');
    try {
      const { routine } = await postAi<{ routine: unknown }>('/api/ai/routine', { daysPerWeek, equipment, notes: notes.trim() });
      onGenerated(routine);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <section aria-label="Tạo lịch tập bằng AI" className="bg-card border border-border rounded-3xl p-5 sm:p-6 space-y-4">
      <h2 className="text-lg font-black flex items-center gap-2">
        <Sparkles className="size-5 text-primary" /> Tạo lịch tập bằng AI
      </h2>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Số buổi tập mỗi tuần</p>
        <div className="flex flex-wrap gap-2">
          {DAY_OPTIONS.map(n => (
            <button
              key={n}
              type="button"
              aria-label={`${n} ngày`}
              aria-pressed={daysPerWeek === n}
              onClick={() => setDaysPerWeek(n)}
              className={`size-10 rounded-xl border text-sm font-bold cursor-pointer ${daysPerWeek === n ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary'}`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <label className="block space-y-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dụng cụ</span>
        <select
          aria-label="Dụng cụ"
          value={equipment}
          onChange={e => setEquipment(e.target.value)}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
        >
          {EQUIPMENT.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>

      <label className="block space-y-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ghi chú (tùy chọn)</span>
        <textarea
          aria-label="Ghi chú"
          value={notes}
          maxLength={300}
          rows={2}
          onChange={e => setNotes(e.target.value)}
          placeholder="VD: đau vai trái, muốn tập thân dưới nhiều hơn"
          className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm"
        />
      </label>

      {error && <p role="alert" className="text-xs font-semibold text-destructive">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={generate}
          disabled={pending}
          className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {pending ? <><Loader2 className="size-4 animate-spin" /> Đang tạo…</> : 'Tạo lịch'}
        </button>
        <button type="button" onClick={onCancel} className="px-5 py-2.5 rounded-full border border-border text-sm font-semibold cursor-pointer">
          Hủy
        </button>
      </div>
    </section>
  );
}
