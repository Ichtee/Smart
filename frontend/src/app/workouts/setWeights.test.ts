import { describe, expect, test } from 'vitest';
import { completedWeights, setWeightText, withSetWeight } from './setWeights';
import type { ExerciseDetail } from './types';

const base: ExerciseDetail = { sets: 3, reps: '10' };

describe('setWeightText', () => {
  test('empty when nothing is entered', () => {
    expect(setWeightText(undefined, 0)).toBe('');
    expect(setWeightText(base, 0)).toBe('');
    expect(setWeightText({ ...base, setWeights: { 1: '60' } }, 0)).toBe('');
  });
  test('shows the stored value, numbers included (data loaded from the server)', () => {
    expect(setWeightText({ ...base, setWeights: { 0: '62.5', 1: 70 } }, 0)).toBe('62.5');
    expect(setWeightText({ ...base, setWeights: { 0: '62.5', 1: 70 } }, 1)).toBe('70');
  });
});

describe('withSetWeight', () => {
  test('sets the weight of one set and keeps the others and the rest of the details', () => {
    const a = withSetWeight({ ...base, rir: '1' }, 0, '60');
    const b = withSetWeight(a, 2, '65.5');
    expect(b).toEqual({ sets: 3, reps: '10', rir: '1', setWeights: { 0: '60', 2: '65.5' } });
  });

  test('replaces the previous weight of that set', () => {
    expect(withSetWeight(withSetWeight(base, 1, '60'), 1, '62.5').setWeights).toEqual({ 1: '62.5' });
  });

  test('does not mutate the input', () => {
    const input = { ...base, setWeights: { 0: '60' } };
    withSetWeight(input, 0, '70');
    expect(input.setWeights).toEqual({ 0: '60' });
  });

  test('keeps text as typed so a half-typed decimal survives', () => {
    expect(withSetWeight(base, 0, '62.').setWeights).toEqual({ 0: '62.' });
    expect(withSetWeight(base, 0, '0').setWeights).toEqual({ 0: '0' });
  });

  test('accepts a decimal comma and stores a point', () => {
    expect(withSetWeight(base, 0, '62,5').setWeights).toEqual({ 0: '62.5' });
  });

  test('clearing the box removes only that set\'s weight', () => {
    const d = withSetWeight(withSetWeight(base, 0, '60'), 1, '70');
    expect(withSetWeight(d, 0, '').setWeights).toEqual({ 1: '70' });
    expect(withSetWeight(d, 0, '   ').setWeights).toEqual({ 1: '70' });
  });

  test.each(['abc', '-5', '6e1', '1.234', '12345', '1..2', '+5', '60kg'])('refuses %j (details unchanged)', (text) => {
    const d = { ...base, setWeights: { 0: '60' } };
    expect(withSetWeight(d, 0, text)).toBe(d);
  });

  test('refuses more than 1000 kg, accepts exactly 1000', () => {
    expect(withSetWeight(base, 0, '1000').setWeights).toEqual({ 0: '1000' });
    expect(withSetWeight(base, 0, '1000.5')).toBe(base);
    expect(withSetWeight(base, 0, '1001')).toBe(base);
  });
});

describe('completedWeights', () => {
  test('only the weights of finished sets', () => {
    const d = { ...base, setWeights: { 0: '60', 1: '70', 2: '80' } };
    expect(completedWeights(d, [0, 2])).toEqual([60, 80]);
  });
  test('ignores sets without a usable weight', () => {
    expect(completedWeights({ ...base, setWeights: { 0: '0', 1: '' } }, [0, 1, 2])).toEqual([]);
    expect(completedWeights(undefined, [0])).toEqual([]);
  });
});
