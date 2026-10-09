import { afterEach, describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ThemeColorPicker from './ThemeColorPicker';

afterEach(() => {
  document.documentElement.removeAttribute('style');
  localStorage.clear();
});

const setup = async () => {
  render(<ThemeColorPicker>logo</ThemeColorPicker>);
  const user = userEvent.setup({ delay: null });
  await user.click(screen.getByRole('button', { name: 'Đổi màu giao diện' }));
  return user;
};

describe('ThemeColorPicker', () => {
  test('the button opens a panel with only the colour box, the hex field and the reset; Escape closes it', async () => {
    render(<ThemeColorPicker>logo</ThemeColorPicker>);
    const user = userEvent.setup({ delay: null });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Đổi màu giao diện' }));
    const dialog = screen.getByRole('dialog', { name: 'Màu giao diện' });
    expect(dialog.querySelector('input[type="color"]')).not.toBeNull();
    expect(screen.getByRole('textbox', { name: 'Mã màu hex' })).toBeInTheDocument();
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('an exact RGB colour (hex box) becomes the accent, with readable text on it, and survives in storage', async () => {
    const user = await setup();
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
  });

  test('"Về màu mặc định" removes the custom colour again', async () => {
    const user = await setup();
    const box = screen.getByRole('textbox', { name: 'Mã màu hex' });
    await user.clear(box);
    await user.type(box, '#3366ff');
    await user.click(screen.getByRole('button', { name: 'Về màu mặc định' }));
    expect(document.documentElement.style.getPropertyValue('--primary')).toBe('');
    expect(localStorage.getItem('accentVars')).toBeNull();
    expect(box).toHaveValue('#b8f200');
  });

  test('reopening shows the colour that is applied', async () => {
    document.documentElement.style.setProperty('--primary', '#3366ff');
    await setup();
    expect(screen.getByRole('textbox', { name: 'Mã màu hex' })).toHaveValue('#3366ff');
  });
});
