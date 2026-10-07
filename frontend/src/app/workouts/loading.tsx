import { PageSkeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-5xl p-4 md:p-8"><PageSkeleton rows={3} /></main>
    </div>
  );
}
