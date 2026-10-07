import { redirect } from 'next/navigation';

// The progress report (calendar, diary, calories) now lives on the Dashboard.
// Kept as a server-side redirect so old links/bookmarks still work, without loading any data here.
export default function ProgressPage() {
  redirect('/dashboard');
}
