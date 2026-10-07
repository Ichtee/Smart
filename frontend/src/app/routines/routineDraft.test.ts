import { describe, expect, test } from 'vitest';
import { WEEK_DAYS, draftFromRoutine, draftToBody, emptyDraft, exerciseFromLibrary, routineSummary, validateDraft, type RoutineDraft } from './routineDraft';

const exercise = (over = {}) => ({ exerciseId: 'e1', exerciseName: 'Bench Press', muscle: 'chest', sets: '4', repsRange: '8-12', restTimeSeconds: '90', ...over });
const filled = (over: Partial<RoutineDraft> = {}): RoutineDraft => {
  const d = emptyDraft();
  d.name = 'My Split';
  d.days[0] = { day: 'Thứ 2', mode: 'train', name: 'Push', exercises: [exercise()] };
  d.days[2] = { day: 'Thứ 4', mode: 'rest', name: '', exercises: [] };
  return { ...d, ...over };
};
const withExercise = (over: object) => { const d = filled(); d.days[0].exercises = [exercise(over)]; return d; };

describe('emptyDraft', () => {
  test('seven days, Monday to Sunday, none used', () => {
    const d = emptyDraft();
    expect(d.days.map(x => x.day)).toEqual([...WEEK_DAYS]);
    expect(d.days.every(x => x.mode === 'off' && x.exercises.length === 0)).toBe(true);
  });
  test('each call is a fresh object', () => {
    const a = emptyDraft();
    a.days[0].exercises.push(exercise());
    expect(emptyDraft().days[0].exercises).toEqual([]);
  });
});

describe('draftFromRoutine', () => {
  const routine = {
    name: 'PPL', description: 'x',
    schedule: [
      { day: 'Thứ 6', name: 'Legs', isRestDay: false, exercises: [{ exerciseId: 'q', exerciseName: 'Squat', muscle: 'quadriceps', sets: 5, repsRange: '5', restTimeSeconds: 180 }] },
      { day: 'Thứ 3', name: 'Nghỉ', isRestDay: true, exercises: [] },
    ],
  };

  test('places days in their weekday slot; unlisted days are off; numbers become text', () => {
    const d = draftFromRoutine(routine);
    expect(d.name).toBe('PPL');
    expect(d.days[4]).toEqual({ day: 'Thứ 6', mode: 'train', name: 'Legs', exercises: [{ exerciseId: 'q', exerciseName: 'Squat', muscle: 'quadriceps', sets: '5', repsRange: '5', restTimeSeconds: '180' }] });
    expect(d.days[1].mode).toBe('rest');
    expect(d.days[0].mode).toBe('off');
  });

  test('missing fields get defaults; an unknown day is ignored', () => {
    const d = draftFromRoutine({ schedule: [{ day: 'Someday', name: 'x' }, { day: 'Thứ 2', exercises: [{ exerciseName: 'A', muscle: 'abs' }] }] });
    expect(d.name).toBe('');
    expect(d.days[0].exercises[0]).toMatchObject({ sets: '3', repsRange: '10', restTimeSeconds: '90', exerciseId: '' });
    expect(d.days.filter(x => x.mode !== 'off')).toHaveLength(1);
  });

  test('null input gives an empty draft', () => {
    expect(draftFromRoutine(null)).toEqual(emptyDraft());
  });
});

describe('exerciseFromLibrary', () => {
  test('uses the defaults of the library entry', () => {
    expect(exerciseFromLibrary({ _id: 'x', name: 'Row', muscle: 'lats', defaultSets: 4, defaultReps: '8-10' })).toEqual({
      exerciseId: 'x', exerciseName: 'Row', muscle: 'lats', sets: '4', repsRange: '8-10', restTimeSeconds: '90',
    });
  });
  test('falls back to 3 x 10', () => {
    expect(exerciseFromLibrary({ _id: 'x', name: 'Row', muscle: 'lats' })).toMatchObject({ sets: '3', repsRange: '10' });
  });
});

describe('validateDraft', () => {
  test('a complete draft is fine', () => expect(validateDraft(filled())).toBeNull());

  test.each(['', ' ', 'A'])('name %j is refused', (name) => {
    expect(validateDraft(filled({ name }))).toContain('Tên lịch tập');
  });

  test('needs at least one training day (rest days alone are not a routine)', () => {
    expect(validateDraft({ ...emptyDraft(), name: 'My Split' })).toContain('ít nhất một ngày tập');
    const d = filled(); d.days[0].mode = 'rest';
    expect(validateDraft(d)).toContain('ít nhất một ngày tập');
  });

  test('a training day needs a name and exercises, and names the day in the message', () => {
    const noName = filled(); noName.days[0].name = '  ';
    expect(validateDraft(noName)).toContain('Thứ 2');
    const none = filled(); none.days[0].exercises = [];
    expect(validateDraft(none)).toMatch(/Thứ 2.*ít nhất một bài/);
  });

  test('at most 30 exercises a day', () => {
    const d = filled(); d.days[0].exercises = Array.from({ length: 31 }, () => exercise());
    expect(validateDraft(d)).toContain('tối đa 30');
    d.days[0].exercises.pop();
    expect(validateDraft(d)).toBeNull();
  });

  test.each(['0', '51', '', '2.5', 'abc', '-1'])('sets %j is refused', (sets) => {
    expect(validateDraft(withExercise({ sets }))).toContain('số hiệp');
  });
  test('sets 1 and 50 are accepted', () => {
    expect(validateDraft(withExercise({ sets: '1' }))).toBeNull();
    expect(validateDraft(withExercise({ sets: '50' }))).toBeNull();
  });

  test.each(['', 'many', '8-', '1000', '8-12-15', '-5'])('reps %j is refused', (repsRange) => {
    expect(validateDraft(withExercise({ repsRange }))).toContain('số lần');
  });
  test.each(['10', '8-12', ' 8 - 12 ', '100'])('reps %j is accepted', (repsRange) => {
    expect(validateDraft(withExercise({ repsRange }))).toBeNull();
  });

  test.each(['-1', '601', '', 'x', '1.5'])('rest %j is refused', (restTimeSeconds) => {
    expect(validateDraft(withExercise({ restTimeSeconds }))).toContain('thời gian nghỉ');
  });
  test('rest 0 and 600 are accepted', () => {
    expect(validateDraft(withExercise({ restTimeSeconds: '0' }))).toBeNull();
    expect(validateDraft(withExercise({ restTimeSeconds: '600' }))).toBeNull();
  });

  test('exercises of a rest day or an unused day are not checked', () => {
    const d = filled();
    d.days[2].exercises = [exercise({ sets: '999' })];
    d.days[3].exercises = [exercise({ sets: '999' })];
    expect(validateDraft(d)).toBeNull();
  });
});

describe('draftToBody', () => {
  test('sends only the used days, with numbers and tidy text', () => {
    const d = filled();
    d.name = '  My   Split ';
    d.description = ' notes ';
    d.days[0].name = ' Push  Day ';
    expect(draftToBody(d)).toEqual({
      name: 'My Split',
      description: 'notes',
      schedule: [
        { day: 'Thứ 2', name: 'Push Day', isRestDay: false, exercises: [{ exerciseId: 'e1', exerciseName: 'Bench Press', muscle: 'chest', sets: 4, repsRange: '8-12', restTimeSeconds: 90 }] },
        { day: 'Thứ 4', name: 'Nghỉ ngơi', isRestDay: true, exercises: [] },
      ],
    });
  });

  test('a rest day never carries exercises', () => {
    const d = filled();
    d.days[2].exercises = [exercise()];
    expect(draftToBody(d).schedule[1].exercises).toEqual([]);
  });

  test('round trip: API routine -> draft -> body keeps the content', () => {
    const body = draftToBody(filled());
    const again = draftToBody(draftFromRoutine({ ...body }));
    expect(again).toEqual(body);
  });
});

describe('routineSummary', () => {
  test('counts training days and exercises, ignoring rest days', () => {
    expect(routineSummary({ schedule: [
      { isRestDay: false, exercises: [1, 2, 3] }, { isRestDay: false, exercises: [1] }, { isRestDay: true, exercises: [] },
    ] })).toBe('2 ngày tập · 4 bài');
  });
  test('an empty or missing schedule', () => {
    expect(routineSummary({ schedule: [] })).toBe('0 ngày tập · 0 bài');
    expect(routineSummary(null)).toBe('0 ngày tập · 0 bài');
  });
});
