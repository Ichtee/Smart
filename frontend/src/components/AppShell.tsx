'use client';
import Sidebar from './Sidebar';
import GoogleTranslate from './GoogleTranslate';
import AccountMenu from './AccountMenu';
import SectionTabs from './SectionTabs';
import type { SectionId } from './sections';

interface AppShellProps {
  title: string;
  subtitle?: string;
  /** shows that section's tab row above the content (Tập luyện, Dinh dưỡng) */
  section?: SectionId;
  icon?: React.ReactNode;
  /** buttons shown at the right of the title bar, before the language picker and the profile button */
  actions?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * The frame every signed-in page shares: sidebar, a 56px title bar and the content area.
 * From `md` up the frame is exactly one screen tall and the content area scrolls inside it,
 * so a page that fits never scrolls and a long panel can scroll on its own (`min-h-0 overflow-y-auto`).
 * Below `md` the page scrolls normally and leaves room for the bottom bar.
 */
export default function AppShell({ title, subtitle, section, icon, actions, children }: AppShellProps) {
  return (
    <div suppressHydrationWarning className="min-h-screen bg-background text-foreground flex font-sans overflow-x-clip">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 md:h-dvh">
        <header className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 md:h-14 md:flex-nowrap md:justify-start md:px-6 md:py-0">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {icon}
            <h1 className="truncate md:shrink-0 font-display text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
            {subtitle && <p className="hidden min-w-0 truncate text-sm font-semibold text-muted-foreground md:block">{subtitle}</p>}
          </div>
          {/* own row under the title on a phone: it would push the translate and account buttons off screen */}
          {actions && <div className="order-last flex min-w-0 basis-full md:order-none md:ml-auto md:basis-auto">{actions}</div>}
          <div className={`flex shrink-0 items-center gap-3 ${actions ? '' : 'md:ml-auto'}`}>
            <GoogleTranslate />
            <AccountMenu />
          </div>
        </header>
        <main className="flex min-h-0 flex-1 flex-col gap-4 p-4 pb-28 md:overflow-y-auto md:p-6 md:pb-6">
          {section && <SectionTabs section={section} />}
          {children}
        </main>
      </div>
    </div>
  );
}
