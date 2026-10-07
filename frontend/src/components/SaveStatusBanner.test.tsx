import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SaveStatusBanner from './SaveStatusBanner';

describe('SaveStatusBanner', () => {
  test('renders nothing when idle', () => {
    const { container } = render(<SaveStatusBanner status="idle" onRetry={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  test('shows a quiet "saving" hint with no retry button', () => {
    render(<SaveStatusBanner status="saving" onRetry={() => {}} />);
    expect(screen.getByText('Đang lưu...')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  test('on error tells the user the data is not synced and offers a retry', async () => {
    const onRetry = vi.fn();
    render(<SaveStatusBanner status="error" onRetry={onRetry} />);
    expect(screen.getByText(/Chưa lưu được lên máy chủ/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  test('retry is not triggered just by rendering', () => {
    const onRetry = vi.fn();
    render(<SaveStatusBanner status="error" onRetry={onRetry} />);
    expect(onRetry).not.toHaveBeenCalled();
  });
});
