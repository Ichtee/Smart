'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SECTIONS, type SectionId } from './sections';

/** The tab row of a section (Tập luyện, Dinh dưỡng). Tabs are real routes, so back and deep links keep working. */
export default function SectionTabs({ section }: { section: SectionId }) {
  const pathname = usePathname();
  const { label, tabs } = SECTIONS[section];
  if (tabs.length < 2) return null;

  return (
    <nav aria-label={`Mục ${label}`} className="-mx-4 shrink-0 overflow-x-auto px-4 md:mx-0 md:px-0">
      <ul className="flex w-max gap-2">
        {tabs.map(tab => {
          const active = pathname === tab.href;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-bold transition-colors ${
                  active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
