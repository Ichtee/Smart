import { Dumbbell, Utensils, type LucideIcon } from 'lucide-react';

export type SectionId = 'training' | 'nutrition';

interface Section {
  label: string;
  /** where the section's sidebar / bottom-bar item points: its first tab */
  href: string;
  icon: LucideIcon;
  tabs: { label: string; href: string }[];
}

export const SECTIONS: Record<SectionId, Section> = {
  training: {
    label: 'Tập luyện',
    href: '/workouts',
    icon: Dumbbell,
    tabs: [
      { label: 'Buổi tập', href: '/workouts' },
      { label: 'Lịch tập', href: '/routines' },
      { label: 'Kỷ lục', href: '/records' },
      { label: 'Khối lượng', href: '/volume' },
    ],
  },
  nutrition: {
    label: 'Dinh dưỡng',
    href: '/nutrition',
    icon: Utensils,
    tabs: [
      { label: 'Nhật ký', href: '/nutrition' },
      { label: 'Thực đơn', href: '/meal-plans' },
    ],
  },
};

/** The section a route belongs to (any of its tabs), or null for pages outside the sections. */
export const sectionOf = (pathname: string): SectionId | null =>
  (Object.keys(SECTIONS) as SectionId[]).find(id =>
    SECTIONS[id].tabs.some(t => pathname === t.href || pathname.startsWith(`${t.href}/`))) ?? null;
