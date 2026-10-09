'use client';
import { useEffect, useRef, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { describeError } from '@/utils/api';
import { postAi } from '@/utils/ai';
import { Loader2, Send, Sparkles } from 'lucide-react';

interface ChatMessage { role: 'user' | 'model'; text: string }

const MAX_SENT = 20; // the server accepts at most 20 messages per request
const SUGGESTIONS = [
  'Hôm nay tôi nên ăn gì để đủ protein?',
  'Đánh giá tuần tập vừa rồi của tôi',
  'Làm sao để phá vỡ giai đoạn chững cân?',
];

export default function CoachPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, pending]);

  const send = async (raw = input) => {
    const text = raw.trim();
    if (!text || pending) return;
    const next: ChatMessage[] = [...messages, { role: 'user', text }];
    setMessages(next);
    setInput('');
    setError('');
    setPending(true);
    try {
      let recent = next.slice(-MAX_SENT);
      while (recent[0].role === 'model') recent = recent.slice(1); // a conversation starts with the user
      const { reply } = await postAi<{ reply: string }>('/api/ai/chat', { messages: recent });
      setMessages([...next, { role: 'model', text: reply }]);
    } catch (err) {
      setMessages(messages);
      setInput(text);
      setError(describeError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <div suppressHydrationWarning className="min-h-screen bg-background text-foreground flex font-sans overflow-x-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 p-4 md:p-8 lg:p-10 pb-28 md:pb-10">
        <div className="max-w-[800px] w-full mx-auto flex flex-col flex-1 gap-4">
          <div className="border-b border-border pb-6">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3">
              <Sparkles className="size-8 text-primary" /> Trợ lý AI
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm font-semibold mt-1">
              Hỏi về tập luyện và dinh dưỡng. Trợ lý biết hồ sơ và nhật ký 7 ngày gần đây của bạn.
            </p>
          </div>

          <div ref={listRef} className="flex-1 min-h-[40vh] max-h-[60vh] overflow-y-auto space-y-3" aria-live="polite">
            {messages.length === 0 && (
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setInput(s)}
                    className="px-3 py-2 rounded-2xl border border-border bg-card text-xs font-semibold hover:border-primary cursor-pointer"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <p className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border'}`}>
                  {m.text}
                </p>
              </div>
            ))}
            {pending && (
              <div className="flex justify-start">
                <Loader2 className="size-5 text-primary animate-spin" aria-label="Đang trả lời" />
              </div>
            )}
          </div>

          {error && (
            <div role="alert" className="p-3 rounded-2xl border bg-destructive/10 border-destructive/30 text-destructive text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="flex items-end gap-2">
            <textarea
              aria-label="Tin nhắn"
              value={input}
              rows={2}
              maxLength={2000}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Nhập câu hỏi…"
              className="flex-1 resize-none rounded-2xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:border-primary"
            />
            <button
              type="button"
              aria-label="Gửi"
              disabled={pending || !input.trim()}
              onClick={() => send()}
              className="size-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              <Send className="size-5" />
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground font-semibold">AI có thể sai. Không thay thế tư vấn y tế.</p>
        </div>
      </main>
    </div>
  );
}
