import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import SectionTabs from './SectionTabs';
import { SECTIONS, sectionOf } from './sections';

const nav = vi.hoisted(() => ({ path: '/records' }));
vi.mock('next/navigation', () => ({ usePathname: () => nav.path }));

beforeEach(() => { nav.path = '/records'; });

describe('SectionTabs', () => {
  test('renders one link per tab and marks the current route', () => {
    render(<SectionTabs section="training" />);
    const tabs = within(screen.getByRole('navigation', { name: 'Mục Tập luyện' }));
    expect(tabs.getAllByRole('link').map(l => l.textContent)).toEqual(['Buổi tập', 'Lịch tập', 'Kỷ lục', 'Khối lượng']);
    expect(tabs.getByRole('link', { name: 'Kỷ lục' })).toHaveAttribute('aria-current', 'page');
    expect(tabs.getByRole('link', { name: 'Lịch tập' })).not.toHaveAttribute('aria-current');
    expect(tabs.getByRole('link', { name: 'Khối lượng' })).toHaveAttribute('href', '/volume');
  });

  test('the nutrition section has the diary and the meal plans', () => {
    render(<SectionTabs section="nutrition" />);
    const tabs = within(screen.getByRole('navigation', { name: 'Mục Dinh dưỡng' }));
    expect(tabs.getAllByRole('link').map(l => l.textContent)).toEqual(['Nhật ký', 'Thực đơn']);
    expect(tabs.getByRole('link', { name: 'Thực đơn' })).toHaveAttribute('href', '/meal-plans');
  });

  test('renders nothing for a section with fewer than 2 tabs', () => {
    const saved = SECTIONS.nutrition.tabs;
    SECTIONS.nutrition.tabs = saved.slice(0, 1);
    try {
      const { container } = render(<SectionTabs section="nutrition" />);
      expect(container).toBeEmptyDOMElement();
    } finally {
      SECTIONS.nutrition.tabs = saved;
    }
  });
});

describe('sectionOf', () => {
  test('maps tab routes to their section', () => {
    expect(sectionOf('/volume')).toBe('training');
    expect(sectionOf('/workouts')).toBe('training');
    expect(sectionOf('/nutrition')).toBe('nutrition');
    expect(sectionOf('/meal-plans')).toBe('nutrition');
    expect(sectionOf('/body')).toBeNull();
  });
});
