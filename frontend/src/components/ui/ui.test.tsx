import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from './Button';
import Card from './Card';
import EmptyState from './EmptyState';
import ProgressRing from './ProgressRing';
import Skeleton, { PageSkeleton } from './Skeleton';
import StatTile from './StatTile';

describe('Button', () => {
  test('is a type=button by default and fires onClick', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Lưu</Button>);
    const b = screen.getByRole('button', { name: 'Lưu' });
    expect(b).toHaveAttribute('type', 'button');
    await userEvent.click(b);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test('loading disables it, marks it busy and ignores clicks', async () => {
    const onClick = vi.fn();
    render(<Button loading onClick={onClick}>Lưu</Button>);
    const b = screen.getByRole('button', { name: 'Lưu' });
    expect(b).toBeDisabled();
    expect(b).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(b);
    expect(onClick).not.toHaveBeenCalled();
  });

  test('variants and sizes change the look; lg is the big touch target', () => {
    render(<><Button variant="danger" size="lg">Xóa</Button><Button variant="secondary">Hủy</Button></>);
    expect(screen.getByRole('button', { name: 'Xóa' }).className).toMatch(/text-destructive.*min-h-14|min-h-14.*text-destructive/);
    expect(screen.getByRole('button', { name: 'Hủy' }).className).toContain('min-h-11');
  });
});

describe('ProgressRing', () => {
  const arc = (c: HTMLElement) => c.querySelectorAll('circle')[1];

  test('reports value and max to assistive tech and draws the matching share', () => {
    const { container } = render(<ProgressRing value={500} max={2000} label="Calo" size={100} stroke={10}>hi</ProgressRing>);
    const bar = screen.getByRole('progressbar', { name: 'Calo' });
    expect(bar).toHaveAttribute('aria-valuenow', '500');
    expect(bar).toHaveAttribute('aria-valuemax', '2000');
    const circumference = 2 * Math.PI * 45;
    expect(Number(arc(container).getAttribute('stroke-dashoffset'))).toBeCloseTo(circumference * 0.75);
    expect(screen.getByText('hi')).toBeInTheDocument();
  });

  test('over the target it is a full ring and the value is capped', () => {
    const { container } = render(<ProgressRing value={3000} max={2000} />);
    expect(Number(arc(container).getAttribute('stroke-dashoffset'))).toBe(0);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2000');
  });

  test('no target or a negative value gives an empty ring, never NaN', () => {
    const { container, rerender } = render(<ProgressRing value={5} max={0} />);
    const c = 2 * Math.PI * ((120 - 10) / 2);
    expect(Number(arc(container).getAttribute('stroke-dashoffset'))).toBeCloseTo(c);
    rerender(<ProgressRing value={-4} max={100} />);
    expect(Number(arc(container).getAttribute('stroke-dashoffset'))).toBeCloseTo(c);
  });
});

describe('StatTile', () => {
  test('shows label, value, unit and hint', () => {
    render(<StatTile label="Cân nặng" value={72.5} unit="kg" hint="Giảm 0.3 kg" tone="success" />);
    expect(screen.getByText('Cân nặng')).toBeInTheDocument();
    expect(screen.getByText('72.5').className).toContain('text-success');
    expect(screen.getByText('kg')).toBeInTheDocument();
    expect(screen.getByText('Giảm 0.3 kg')).toBeInTheDocument();
  });
});

describe('EmptyState', () => {
  test('a link action goes to the page', () => {
    render(<EmptyState title="Chưa có buổi tập" hint="Bắt đầu ngay" action={{ label: 'Bắt đầu', href: '/workouts' }} />);
    expect(screen.getByText('Chưa có buổi tập')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Bắt đầu' })).toHaveAttribute('href', '/workouts');
  });

  test('a button action calls back; without action there is no button', async () => {
    const onClick = vi.fn();
    const { rerender } = render(<EmptyState title="Trống" action={{ label: 'Thêm', onClick }} />);
    await userEvent.click(screen.getByRole('button', { name: 'Thêm' }));
    expect(onClick).toHaveBeenCalled();
    rerender(<EmptyState title="Trống" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});

describe('Card and Skeleton', () => {
  test('Card passes props through and the highlight tone adds the glow', () => {
    render(<Card data-testid="c" tone="highlight">x</Card>);
    expect(screen.getByTestId('c').className).toContain('glow-primary');
  });

  test('Skeleton is hidden from assistive tech; PageSkeleton announces loading', () => {
    const { container } = render(<><Skeleton className="h-4" /><PageSkeleton rows={2} /></>);
    expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy();
    expect(screen.getByRole('status', { name: 'Đang tải' })).toBeInTheDocument();
  });
});
