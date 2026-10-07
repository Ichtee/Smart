import { expect } from '@playwright/test';
import { api, createAdmin } from '../support';

const DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

/**
 * An admin creates three exercises and a built-in routine with a workout on every weekday (so "today" always
 * has one). Safe to call from every spec that needs them.
 */
export async function seedRoutine(id = 'ppl') {
  // idempotent: several spec files share one backend, and new users start on the routine called "ppl"
  const existing = await (await api('/api/routines')).json();
  if (existing.some((r: { id: string }) => r.id === id)) return;

  const { token } = await createAdmin();
  const ex: Record<string, string> = {};
  for (const [name, muscle] of [['Bench Press', 'chest'], ['Incline Dumbbell Press', 'chest'], ['Triceps Pushdown', 'triceps']]) {
    const r = await api('/api/exercises', { name, muscle, defaultSets: 3, defaultReps: '10', equipment: 'Barbell' }, token);
    ex[name] = (await r.json())._id;
  }
  const res = await api('/api/routines', {
    id, name: 'Push Pull Legs', type: 'PPL', frequencyDaysPerWeek: 7,
    schedule: DAYS.map(day => ({
      day, name: 'Push', isRestDay: false,
      targets: [{ id: 'chest', label: 'Ngực', count: 2 }, { id: 'triceps', label: 'Tay sau', count: 1 }],
      exercises: Object.entries(ex).map(([name, exId]) => ({ exerciseId: exId, exerciseName: name, muscle: name.includes('Triceps') ? 'triceps' : 'chest', sets: 3, repsRange: '10', rir: '1', restTimeSeconds: 60 })),
    })),
  }, token);
  expect(res.status).toBe(201);
}
