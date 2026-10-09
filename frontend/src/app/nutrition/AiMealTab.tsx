'use client';
import { useState } from 'react';
import { describeError } from '@/utils/api';
import { postAi, resizeImage } from '@/utils/ai';
import { Camera, Loader2, Trash2, X } from 'lucide-react';
import type { MealItem } from './types';

interface Props {
  /** False until the selected day has loaded from the server: adding would overwrite unread data. */
  dayLoaded: boolean;
  onAdd: (items: MealItem[]) => void;
}

// What the server returns for one food; calories and grams stay text while the user edits them.
// `base` is the AI's own estimate: editing the grams rescales calories and macros from it.
interface Base { quantity: string; grams: number; unit: string; calories: number; protein?: number; carbs?: number; fat?: number }
interface Row { name: string; quantity?: string; calories: string; protein?: number; carbs?: number; fat?: number; grams: string; base?: Base }

const MAX_CALORIES = 20000;
const MAX_GRAMS = 5000;
// "200 gram", "1 quả (50 gram)", "30 ml": the first weight/volume in the AI's quantity text
const GRAM_RE = /(\d+(?:[.,]\d+)?)\s*(gram|gr|g|ml)\b/i;
const validGrams = (s: string) => Number.isFinite(Number(s)) && Number(s) > 0 && Number(s) <= MAX_GRAMS;
const scaled = (v: number | undefined, k: number, decimals: number) => (v === undefined ? undefined : Number((v * k).toFixed(decimals)));
const validCalories = (s: string) => s.trim() !== '' && Number.isFinite(Number(s)) && Number(s) >= 0 && Number(s) <= MAX_CALORIES;

export default function AiMealTab({ dayLoaded, onAdd }: Props) {
  const [text, setText] = useState('');
  const [image, setImage] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    try {
      setImage(await resizeImage(file));
    } catch {
      setError('Không đọc được ảnh này, hãy thử ảnh khác.');
    }
  };

  const analyse = async () => {
    if (pending || (!text.trim() && !image)) return;
    setPending(true);
    setError('');
    try {
      const { items } = await postAi<{ items: (Omit<Row, 'calories'> & { calories: number })[] }>(
        '/api/ai/meal',
        { ...(text.trim() ? { text: text.trim() } : {}), ...(image ? { image } : {}) },
      );
      setRows(items.map(i => {
        const m = i.quantity ? GRAM_RE.exec(i.quantity) : null;
        const grams = m ? Number(m[1].replace(',', '.')) : 0;
        const base = m && grams > 0 ? { quantity: i.quantity as string, grams, unit: m[2], calories: i.calories, protein: i.protein, carbs: i.carbs, fat: i.fat } : undefined;
        return { ...i, calories: String(i.calories), grams: base ? String(grams) : '', base };
      }));
    } catch (err) {
      setError(describeError(err));
    } finally {
      setPending(false);
    }
  };

  const setGrams = (i: number, value: string) => setRows(rs => rs.map((x, j) => {
    if (j !== i || !x.base) return x;
    if (!validGrams(value)) return { ...x, grams: value };
    const { base } = x;
    const k = Number(value) / base.grams;
    return {
      ...x,
      grams: value,
      quantity: base.quantity.replace(GRAM_RE, `${Number(value)} ${base.unit}`),
      calories: String(Math.round(base.calories * k)),
      protein: scaled(base.protein, k, 1),
      carbs: scaled(base.carbs, k, 1),
      fat: scaled(base.fat, k, 1),
    };
  }));

  const add = () => {
    const stamp = Date.now();
    onAdd(rows.map(({ name, quantity, calories, protein, carbs, fat }, i) => ({
      id: `${stamp}-${i}`,
      name,
      calories: Number(calories),
      ...(quantity ? { quantity } : {}),
      ...(protein !== undefined ? { protein } : {}),
      ...(carbs !== undefined ? { carbs } : {}),
      ...(fat !== undefined ? { fat } : {}),
    })));
  };

  const canAdd = dayLoaded && rows.length > 0 && rows.every(r => validCalories(r.calories) && (!r.base || validGrams(r.grams)));

  return (
    <div className="space-y-4">
      <textarea
        aria-label="Mô tả bữa ăn"
        value={text}
        maxLength={500}
        rows={3}
        onChange={e => setText(e.target.value)}
        placeholder="VD: 2 trứng ốp la và 1 ổ bánh mì"
        className="w-full resize-none rounded-xl border border-slate-800 bg-inset px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
      />

      <div className="flex items-center gap-3">
        <label className="flex-1 py-2.5 px-4 rounded-xl border border-slate-800 text-xs font-bold text-slate-300 flex items-center justify-center gap-2 cursor-pointer hover:border-primary">
          <Camera className="size-4" /> {image ? 'Đổi ảnh' : 'Chụp / chọn ảnh món ăn'}
          <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={e => { pickPhoto(e.target.files?.[0]); e.target.value = ''; }} />
        </label>
        {image && (
          <div className="relative">
            <img src={image} alt="Ảnh món ăn" className="size-12 rounded-lg object-cover" />
            <button type="button" aria-label="Bỏ ảnh" onClick={() => setImage('')} className="absolute -top-2 -right-2 rounded-full bg-slate-800 p-0.5 cursor-pointer">
              <X className="size-3" />
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={analyse}
        disabled={pending || (!text.trim() && !image)}
        className="w-full py-2.5 rounded-xl bg-primary text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {pending ? <><Loader2 className="size-4 animate-spin" /> Đang phân tích…</> : 'Phân tích'}
      </button>

      {error && <p role="alert" className="text-xs font-semibold text-destructive">{error}</p>}

      {rows.length > 0 && (
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 p-3">
              <div className="min-w-0 basis-full sm:basis-0 sm:flex-1">
                <p className="text-sm font-bold text-white truncate">{r.name}</p>
                <p className="text-xs text-slate-400">
                  {[r.quantity, r.protein !== undefined && `P ${r.protein}g`, r.carbs !== undefined && `C ${r.carbs}g`, r.fat !== undefined && `F ${r.fat}g`].filter(Boolean).join(' · ')}
                </p>
              </div>
              {r.base && (
                <>
                  <input
                    type="number"
                    aria-label={`Khối lượng ${r.name}`}
                    value={r.grams}
                    min={1}
                    onChange={e => setGrams(i, e.target.value)}
                    className="w-16 rounded-lg border border-slate-800 bg-inset px-2 py-1 text-sm text-white text-right"
                  />
                  <span className="text-xs text-slate-400">{r.base.unit.toLowerCase() === 'ml' ? 'ml' : 'g'}</span>
                </>
              )}
              <input
                type="number"
                aria-label={`Calo ${r.name}`}
                value={r.calories}
                min={0}
                onChange={e => setRows(rs => rs.map((x, j) => (j === i ? { ...x, calories: e.target.value } : x)))}
                className="w-20 rounded-lg border border-slate-800 bg-inset px-2 py-1 text-sm text-white text-right"
              />
              <span className="text-xs text-slate-400">kcal</span>
              <button type="button" aria-label={`Xóa ${r.name}`} onClick={() => setRows(rs => rs.filter((_, j) => j !== i))} className="ml-auto sm:ml-0 text-slate-500 hover:text-destructive cursor-pointer">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          <p className="text-[11px] text-slate-500 font-semibold">AI chỉ ước tính. Nếu khối lượng chưa đúng, hãy chỉnh lại: calo và macro sẽ đổi theo.</p>
          <button
            type="button"
            onClick={add}
            disabled={!canAdd}
            className="w-full py-2.5 rounded-xl bg-success text-slate-950 font-extrabold text-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            Thêm {rows.length} món
          </button>
        </div>
      )}
    </div>
  );
}
