import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CoachPage from './page';
import { postAi } from '@/utils/ai';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => '/coach' }));
vi.mock('@/components/Sidebar', () => ({ default: () => <aside /> }));
vi.mock('@/hooks/useApi', () => ({ useProfile: () => ({ profile: undefined }) }));
vi.mock('@/utils/ai', () => ({ postAi: vi.fn() }));

beforeEach(() => {
  vi.mocked(postAi).mockReset();
});

const input = () => screen.getByRole('textbox', { name: /Tin nhắn/ });
const sendButton = () => screen.getByRole('button', { name: /Gửi/ });

describe('Coach page', () => {
  test('sends the conversation and shows the reply', async () => {
    vi.mocked(postAi).mockResolvedValue({ reply: 'Ăn thêm đạm nhé' });
    render(<CoachPage />);
    await userEvent.type(input(), 'hi');
    await userEvent.click(sendButton());

    expect(await screen.findByText('Ăn thêm đạm nhé')).toBeInTheDocument();
    expect(postAi).toHaveBeenCalledWith('/api/ai/chat', { messages: [{ role: 'user', text: 'hi' }] });
    expect(screen.getByText('hi')).toBeInTheDocument();
  });

  test('sends earlier turns with the next question', async () => {
    vi.mocked(postAi).mockResolvedValueOnce({ reply: 'one' }).mockResolvedValueOnce({ reply: 'two' });
    render(<CoachPage />);
    await userEvent.type(input(), 'q1');
    await userEvent.click(sendButton());
    await screen.findByText('one');
    await userEvent.type(input(), 'q2');
    await userEvent.click(sendButton());
    await screen.findByText('two');

    expect(vi.mocked(postAi).mock.calls[1][1]).toEqual({
      messages: [{ role: 'user', text: 'q1' }, { role: 'model', text: 'one' }, { role: 'user', text: 'q2' }],
    });
  });

  test('send button disabled while pending', async () => {
    let finish: (v: { reply: string }) => void = () => {};
    vi.mocked(postAi).mockReturnValue(new Promise(resolve => { finish = resolve; }));
    render(<CoachPage />);
    await userEvent.type(input(), 'hi');
    await userEvent.click(sendButton());

    expect(sendButton()).toBeDisabled();
    await userEvent.type(input(), 'again');
    expect(sendButton()).toBeDisabled();
    expect(postAi).toHaveBeenCalledTimes(1);

    finish({ reply: 'done' });
    await screen.findByText('done');
  });

  test('shows the error and keeps the typed message on failure', async () => {
    vi.mocked(postAi).mockRejectedValue(new Error('AI đang quá tải, vui lòng thử lại sau.'));
    render(<CoachPage />);
    await userEvent.type(input(), 'hello coach');
    await userEvent.click(sendButton());

    expect(await screen.findByRole('alert')).toHaveTextContent('AI đang quá tải');
    await waitFor(() => expect(input()).toHaveValue('hello coach'));
  });
});
