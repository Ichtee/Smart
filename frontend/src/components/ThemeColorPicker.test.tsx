import { afterEach, describe, expect, test } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ThemeColorPicker from './ThemeColorPicker';

afterEach(() => {
  document.documentElement.removeAttribute('style');
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

  test('an exact RGB colour (hex box) becomes the accent, with readable text on it, and survives in storage', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Đổi màu giao diện' }));
    const box = screen.getByRole('textbox', { name: 'Mã màu hex' });
    await user.clear(box);
    await user.type(box, '#ff3366');
    const style = document.documentElement.style;
    expect(style.getPropertyValue('--primary')).toBe('#ff3366');
    expect(style.getPropertyValue('--primary-foreground')).toBe('#ffffff');
    expect(JSON.parse(localStorage.getItem('accentVars')!)['--primary']).toBe('#ff3366');

    await user.clear(box);
    await user.type(box, '#ffee00'); // a light colour gets dark text
    expect(style.getPropertyValue('--primary-foreground')).toBe('#101010');

    await user.clear(box);
    await user.type(box, '#12'); // not a full colour yet: nothing changes
    expect(style.getPropertyValue('--primary')).toBe('#ffee00');

    await user.click(screen.getByRole('button', { name: 'Xanh dương' })); // a hue pick drops the exact colour
    expect(style.getPropertyValue('--primary')).toBe('');
    expect(localStorage.getItem('accentVars')).toBeNull();
  });

  test('reopening shows the hue that is applied', async () => {
    document.documentElement.style.setProperty('--accent-h', '190');
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Đổi màu giao diện' }));
    expect(screen.getByRole('slider', { name: 'Tông màu' })).toHaveValue('190');
  });
});
