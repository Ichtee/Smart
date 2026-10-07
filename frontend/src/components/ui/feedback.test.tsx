import { afterEach, describe, expect, test, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeedbackProvider, useConfirm, useToast } from './feedback';

function Harness({ onResult = () => {} }: { onResult?: (ok: boolean) => void }) {
  const toast = useToast();
  const confirm = useConfirm();
  return (
    <>
      <button onClick={() => toast.error('Không lưu được')}>err</button>
      <button onClick={() => toast.success('Đã lưu')}>ok</button>
      <button onClick={async () => onResult(await confirm({ message: 'Xóa món này?', tone: 'danger' }))}>del</button>
      <button onClick={async () => onResult(await confirm('Tiếp tục?'))}>plain</button>
    </>
  );
}

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('toast', () => {
  test('an error is announced as an alert, a success as a status', async () => {
    render(<FeedbackProvider><Harness /></FeedbackProvider>);
    await userEvent.click(screen.getByText('err'));
    expect(screen.getByRole('alert')).toHaveTextContent('Không lưu được');
    await userEvent.click(screen.getByText('ok'));
    expect(screen.getByRole('status')).toHaveTextContent('Đã lưu');
  });

  test('it can be closed by hand and disappears by itself after 5 seconds', async () => {
    render(<FeedbackProvider><Harness /></FeedbackProvider>);
    await userEvent.click(screen.getByText('err'));
    await userEvent.click(screen.getByRole('button', { name: 'Đóng thông báo' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    vi.useFakeTimers({ shouldAdvanceTime: true });
    await userEvent.click(screen.getByText('ok'));
    expect(screen.getByRole('status')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(4900); });
    expect(screen.getByRole('status')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(200); });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  test('only the last 4 stay on screen', async () => {
    render(<FeedbackProvider><Harness /></FeedbackProvider>);
    for (let i = 0; i < 6; i++) await userEvent.click(screen.getByText('err'));
    expect(screen.getAllByRole('alert')).toHaveLength(4);
  });
});

describe('confirm', () => {
  test('"Xóa" resolves true and closes the dialog', async () => {
    const result = vi.fn();
    render(<FeedbackProvider><Harness onResult={result} /></FeedbackProvider>);
    await userEvent.click(screen.getByText('del'));
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Xóa món này?');
    expect(screen.getByRole('heading', { name: 'Xác nhận xóa' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Xóa' }));
    expect(result).toHaveBeenCalledWith(true);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  test('"Hủy", Escape and the backdrop all resolve false', async () => {
    const result = vi.fn();
    const { container } = render(<FeedbackProvider><Harness onResult={result} /></FeedbackProvider>);

    await userEvent.click(screen.getByText('del'));
    await userEvent.click(screen.getByRole('button', { name: 'Hủy' }));
    expect(result).toHaveBeenLastCalledWith(false);

    await userEvent.click(screen.getByText('del'));
    await userEvent.keyboard('{Escape}');
    expect(result).toHaveBeenLastCalledWith(false);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

    await userEvent.click(screen.getByText('del'));
    await userEvent.click(container.querySelector('.bg-black\\/60')!);
    expect(result).toHaveBeenCalledTimes(3);
    expect(result).toHaveBeenLastCalledWith(false);
  });

  test('the safe choice (Hủy) has the focus when it opens', async () => {
    render(<FeedbackProvider><Harness /></FeedbackProvider>);
    await userEvent.click(screen.getByText('del'));
    expect(screen.getByRole('button', { name: 'Hủy' })).toHaveFocus();
  });

  test('a plain string and the default tone say "Đồng ý"', async () => {
    const result = vi.fn();
    render(<FeedbackProvider><Harness onResult={result} /></FeedbackProvider>);
    await userEvent.click(screen.getByText('plain'));
    expect(screen.getByRole('heading', { name: 'Xác nhận' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Đồng ý' }));
    expect(result).toHaveBeenCalledWith(true);
  });
});

describe('without a provider', () => {
  test('they fall back to the native alert and confirm', async () => {
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const result = vi.fn();
    render(<Harness onResult={result} />);
    await userEvent.click(screen.getByText('err'));
    expect(alert).toHaveBeenCalledWith('Không lưu được');
    await userEvent.click(screen.getByText('del'));
    expect(confirm).toHaveBeenCalledWith('Xóa món này?');
    expect(result).toHaveBeenCalledWith(true);
  });
});
