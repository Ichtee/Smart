import { afterEach, describe, expect, test } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ThemeColorPicker from './ThemeColorPicker';

afterEach(() => {
  document.documentElement.style.removeProperty('--accent-h');
  localStorage.clear();
});

const setup = () => {
  render(<ThemeColorPicker>logo</ThemeColorPicker>);
  return userEvent.setup({ delay: null });
};

describe('ThemeColorPicker', () => {
  test('the button opens a panel, Escape or a click outside closes it', async () => {
    const user = setup();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Đổi màu giao diện' }));
    expect(screen.getByRole('dialog', { name: 'Màu giao diện' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('picking a preset sets the accent hue on <html> and remembers it', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Đổi màu giao diện' }));
    await user.click(screen.getByRole('button', { name: 'Xanh dương' }));
    expect(document.documentElement.style.getPropertyValue('--accent-h')).toBe('250');
    expect(localStorage.getItem('accentHue')).toBe('250');
  });

  test('the slider picks any hue; "Về màu mặc định" goes back to the lime', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Đổi màu giao diện' }));
    fireEvent.change(screen.getByRole('slider', { name: 'Tông màu' }), { target: { value: '305' } });
    expect(document.documentElement.style.getPropertyValue('--accent-h')).toBe('305');
    await user.click(screen.getByRole('button', { name: 'Về màu mặc định' }));
    expect(document.documentElement.style.getPropertyValue('--accent-h')).toBe('125');
    expect(localStorage.getItem('accentHue')).toBe('125');
  });

  test('reopening shows the hue that is applied', async () => {
    document.documentElement.style.setProperty('--accent-h', '190');
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Đổi màu giao diện' }));
    expect(screen.getByRole('slider', { name: 'Tông màu' })).toHaveValue('190');
  });
});
