import { describe, expect, test } from 'vitest';
import {
  normalizeMuscleId,
  toModelMuscle,
  toFixedReps,
  getYouTubeEmbedUrl,
  getYouTubeSearchUrl,
  findLibraryExercise as findInLibrary,
  formatWorkoutDayTitle,
  DAY_ORDER,
  DEFAULT_ROUTINES,
  MUSCLE_NAMES_VI,
  VALID_MODEL_MUSCLES,
} from './utils';
import type { RoutineExercise } from '@/types/domain';
import type { WorkoutExercise } from './types';

// These tests use minimal fixtures on purpose (raw API objects, templates without a name or id)
const findLibraryExercise = (library: object[], template: object) => findInLibrary(library as WorkoutExercise[], template as RoutineExercise);

describe('normalizeMuscleId', () => {
  test.each([
    // already canonical
    ['chest', 'chest'], ['biceps', 'biceps'], ['triceps', 'triceps'], ['abs', 'abs'], ['gluteal', 'gluteal'],
    // English aliases
    ['quads', 'quadriceps'], ['hamstrings', 'hamstring'], ['glutes', 'gluteal'], ['calves', 'calves'],
    ['traps', 'trapezius'], ['lats', 'lats'], ['forearms', 'forearm'], ['delts', 'front-deltoids'],
    ['deltoids', 'front-deltoids'], ['shoulders', 'front-deltoids'], ['rear delts', 'back-deltoids'],
    ['rear deltoids', 'back-deltoids'], ['upper back', 'upper-back'], ['lower back', 'lower-back'],
    ['adductors', 'adductor'],
    // Vietnamese names used in older routines
    ['ngực', 'chest'], ['tay trước', 'biceps'], ['tay sau', 'triceps'], ['lưng', 'upper-back'],
    ['lưng trên', 'upper-back'], ['lưng dưới', 'lower-back'], ['xô', 'lats'], ['cơ xô', 'lats'], ['vai', 'front-deltoids'],
    ['vai sau', 'back-deltoids'], ['đùi trước', 'quadriceps'], ['đùi sau', 'hamstring'], ['mông', 'gluteal'],
    ['bắp chân', 'calves'], ['bụng', 'abs'], ['cơ bụng', 'abs'], ['cẳng tay', 'forearm'], ['cầu vai', 'trapezius'],
  ])('%s -> %s', (input, expected) => {
    expect(normalizeMuscleId(input)).toBe(expected);
  });

  test('ignores case and surrounding spaces', () => {
    expect(normalizeMuscleId('  CHEST ')).toBe('chest');
    expect(normalizeMuscleId('Rear Delts')).toBe('back-deltoids');
    expect(normalizeMuscleId('NGỰC')).toBe('chest');
  });

  test('empty input -> empty string; unknown names pass through lower-cased so they never crash', () => {
    expect(normalizeMuscleId('')).toBe('');
    expect(normalizeMuscleId('Neck')).toBe('neck');
    expect(normalizeMuscleId('some-new-muscle')).toBe('some-new-muscle');
  });

  test('every canonical id that has a Vietnamese label is a muscle the app can name', () => {
    for (const id of ['chest', 'upper-back', 'lower-back', 'lats', 'trapezius', 'front-deltoids', 'back-deltoids', 'biceps', 'triceps', 'forearm', 'quadriceps', 'hamstring', 'calves', 'gluteal', 'abs', 'obliques']) {
      expect(MUSCLE_NAMES_VI[id]).toBeTruthy();
    }
  });
});

describe('toModelMuscle (what the 3D body model can draw)', () => {
  test('lats has no model region: it is drawn on the upper back', () => {
    expect(toModelMuscle('lats')).toBe('upper-back');
    expect(VALID_MODEL_MUSCLES.has('lats')).toBe(false);
    expect(VALID_MODEL_MUSCLES.has(toModelMuscle('lats'))).toBe(true);
  });

  test('other muscles are unchanged', () => {
    for (const m of ['chest', 'biceps', 'quadriceps', 'upper-back']) expect(toModelMuscle(m)).toBe(m);
  });

  test('every normalized muscle the app produces is drawable or deliberately skipped', () => {
    const drawable = ['chest', 'upper-back', 'lower-back', 'trapezius', 'front-deltoids', 'back-deltoids', 'biceps', 'triceps', 'forearm', 'quadriceps', 'hamstring', 'calves', 'gluteal', 'abs', 'obliques', 'adductor'];
    for (const m of drawable) expect(VALID_MODEL_MUSCLES.has(toModelMuscle(m))).toBe(true);
  });
});

describe('toFixedReps', () => {
  test.each([
    ['10', '10'], [12, '12'], ['8-12', '8'], ['10 reps', '10'], ['  15  ', '15'], ['AMRAP 20', '20'],
  ])('%j -> %s', (input, expected) => {
    expect(toFixedReps(input)).toBe(expected);
  });

  test.each([undefined, null, '', 0, 'max'])('%j falls back to 10', (input) => {
    expect(toFixedReps(input as string)).toBe('10');
  });
});

describe('YouTube helpers', () => {
  const id = 'dQw4w9WgXcQ';
  test.each([
    `https://www.youtube.com/watch?v=${id}`,
    `https://youtu.be/${id}`,
    `https://www.youtube.com/embed/${id}`,
    `https://www.youtube.com/shorts/${id}`,
    `https://www.youtube.com/watch?v=${id}&t=30s`,
    `https://www.youtube.com/watch?feature=share&v=${id}`,
  ])('turns %s into an embed URL', (url) => {
    expect(getYouTubeEmbedUrl(url)).toBe(`https://www.youtube.com/embed/${id}?autoplay=0&rel=0&enablejsapi=1`);
  });

  test.each([undefined, '', 'not a url', 'https://vimeo.com/123456', 'https://youtu.be/short', 'https://www.youtube.com/watch?v=tooShort'])(
    '%j has no embed (the UI falls back to a search link)',
    (url) => {
      expect(getYouTubeEmbedUrl(url)).toBe('');
    }
  );

  test('the search link encodes the exercise name', () => {
    expect(getYouTubeSearchUrl('Bench Press')).toBe('https://www.youtube.com/results?search_query=Bench%20Press');
    expect(getYouTubeSearchUrl('Squat & Lunge #1')).toBe('https://www.youtube.com/results?search_query=Squat%20%26%20Lunge%20%231');
  });
});

describe('findLibraryExercise (routine template -> exercise library)', () => {
  const library = [
    { id: 'a1', _id: 'a1', name: 'Bench Press' },
    { id: 'b2', _id: 'b2', name: 'Incline Press' },
    { id: 'c3', _id: 'c3', name: 'Squat' },
  ];

  test('matches by exerciseId first, so a renamed exercise still resolves', () => {
    const tmpl = { exerciseId: 'a1', exerciseName: 'Old name of the bench press' };
    expect(findLibraryExercise(library, tmpl)?.name).toBe('Bench Press');
  });

  test('the id wins even when another exercise has the template\'s name', () => {
    expect(findLibraryExercise(library, { exerciseId: 'b2', exerciseName: 'Squat' })?.id).toBe('b2');
  });

  test('falls back to the name (case and spacing insensitive) for routines saved before ids existed', () => {
    expect(findLibraryExercise(library, { exerciseName: 'bench press' })?.id).toBe('a1');
    expect(findLibraryExercise(library, { exerciseName: '  SQUAT ' })?.id).toBe('c3');
  });

  test('an unknown id still falls back to the name', () => {
    expect(findLibraryExercise(library, { exerciseId: 'gone', exerciseName: 'Squat' })?.id).toBe('c3');
  });

  test('returns undefined when nothing matches', () => {
    expect(findLibraryExercise(library, { exerciseId: 'gone', exerciseName: 'Deadlift' })).toBeUndefined();
    expect(findLibraryExercise([], { exerciseName: 'Squat' })).toBeUndefined();
  });

  test('works with library items that only have _id (raw API objects)', () => {
    expect(findLibraryExercise([{ _id: 'x9', name: 'Row' }], { exerciseId: 'x9', exerciseName: 'Row' })?._id).toBe('x9');
  });

  test('a template with no name and no id matches nothing instead of crashing', () => {
    expect(findLibraryExercise(library, {})).toBeUndefined();
  });
});

describe('weekdays and routines', () => {
  test('DAY_ORDER runs Monday to Sunday with Sunday last', () => {
    const sorted = Object.keys(DAY_ORDER).sort((a, b) => DAY_ORDER[a] - DAY_ORDER[b]);
    expect(sorted).toEqual(['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật']);
  });

  test('the built-in free routine has no schedule', () => {
    expect(DEFAULT_ROUTINES.none).toMatchObject({ id: 'none', schedule: [] });
  });

  test('formatWorkoutDayTitle leaves Vietnamese as is and maps known names to English', () => {
    const day = { day: 'Thứ 2', name: 'Thân trên A' };
    expect(formatWorkoutDayTitle(day, 'vi')).toEqual(day);
    expect(formatWorkoutDayTitle(day, 'en')).toEqual({ day: 'Mon', name: 'Upper Body A' });
    expect(formatWorkoutDayTitle({ day: 'Chủ nhật', name: 'Nghỉ ngơi' }, 'en')).toEqual({ day: 'Sun', name: 'Rest Day' });
    expect(formatWorkoutDayTitle({ day: 'Thứ 4', name: 'Custom day' }, 'en')).toEqual({ day: 'Wed', name: 'Custom day' });
    expect(formatWorkoutDayTitle(null, 'en')).toEqual({ day: '', name: '' });
  });
});
