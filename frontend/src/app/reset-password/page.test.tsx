import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => ({ query: '' }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(mocks.query),
  useParams: () => ({ token: 'from-path' }),
}));

import QueryPage from './page';
import PathPage from './[token]/page';

describe('reset-password pages', () => {
  test('/reset-password/<token>: the token comes from the path, so no token box', () => {
    render(<PathPage />);
    expect(screen.queryByLabelText(/Token/)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^Mật khẩu mới/)).toBeInTheDocument();
  });

  test('/reset-password?token=...: the legacy link also hides the token box', () => {
    mocks.query = 'token=legacy';
    render(<QueryPage />);
    expect(screen.queryByLabelText(/Token/)).not.toBeInTheDocument();
  });

  test('/reset-password with no token asks for it', () => {
    mocks.query = '';
    render(<QueryPage />);
    expect(screen.getByLabelText(/Token/)).toBeInTheDocument();
  });
});
