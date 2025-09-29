'use client';
import { useRef, useState, useEffect } from 'react';
import { sendAgentMessage } from '@/lib/sendAgentMessage';
import Image from 'next/image';
import { getMessages as lsGet, setMessages as lsSet, upsertChatMeta } from '@/lib/chatStore';

// map UI messages -> OpenAI messages
function toOpenAIMessages(uiMessages) {
  return uiMessages.map(m => ({
    role: m.role === 'ai' ? 'assistant' : 'user',
    content: m.text
  }));
}

function Chip({ children }) {
  return (
    <span className="text-xs px-3 py-1 rounded-full bg-white/70 text-black/80 border border-black/10">
      {children}
    </span>
  );
}

export default function Terminal({ startInHero = true, sessionId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hero, setHero] = useState(startInHero);
  const bottomRef = useRef(null);

  // scroll down when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // --- 🔥 Persistence Hooks ---
  useEffect(() => {
    if (!sessionId) return;
    const existing = lsGet(sessionId);
    if (existing?.length) {
      setMessages(existing);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    lsSet(sessionId, messages);
  }, [sessionId, messages]);

  useEffect(() => {
    if (!sessionId) return;
    const firstUser = messages.find((m) => m.role === 'user');
    if (firstUser) {
      const title = firstUser.text.slice(0, 30).trim() || 'Chat';
      upsertChatMeta(sessionId, title);
    }
  }, [sessionId, messages]);
  // --- 🔥 End persistence hooks ---

  const send = async (e) => {
    e.preventDefault();
    const q = input.trim();
    if (!q || isTyping) return;

    if (hero) setHero(false);

    const next = [...messages, { role: 'user', text: q }];
    setMessages(next);
    setInput('');
    setIsTyping(true);

    setMessages(m => [...m, { role: 'ai', text: '' }]);

    try {
      const history = next.map(m => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: m.text
      }));

      await sendAgentMessage(history, (chunk) => {
        setMessages(curr => {
          const last = curr[curr.length - 1];
          if (!last || last.role !== 'ai') return curr;
          return [...curr.slice(0, -1), { ...last, text: last.text + chunk }];
        });
      });
    } catch (err) {
      setMessages(m => [...m, { role: 'ai', text: `Error: ${err.message}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  // --- helper to render AI lines with bold labels ---
  const renderAiLine = (line, li) => {
    const bulletMatch = line.match(/^[-•]\s*(.*?):\s*(.*)$/);
    if (bulletMatch) {
      const [, label, rest] = bulletMatch;
      return (
        <p key={li} className="text-white/100 mt-2 whitespace-pre-wrap">
          - <span className="font-bold">{label}:</span> {rest}
        </p>
      );
    }
    return (
      <p key={li} className="text-white/100 mt-2 whitespace-pre-wrap">
        {line}
      </p>
    );
  };

  // ---------- HERO ----------
  if (hero) {
    return (
      <div className="w-full">
        <div className="fixed left-1/2 top-[400px] -translate-x-1/2 z-10 flex flex-col items-center gap-3">
          <div className="h-18 w-18 rounded-xl bg-yellow-600 border-2 border-black flex items-center justify-center shadow-md">
            <Image
              src="/head.png"
              alt="BNB Agent Mascot"
              width={75}
              height={75}
              className="object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-white drop-shadow-strong">
            <span className="text-bnb-yellow">BNB</span>
            <span className="text-white">AGENT</span>
          </h1>
        </div>

        <div className="fixed left-1/2 top-[565px] -translate-x-1/2 w-[92vw] max-w-3xl z-10">
          <div className="rounded-2xl border border-black/10 font-semibold bg-gradient-to-r from-yellow-600 to-yellow-500 shadow-lg backdrop-blur">
            <form onSubmit={send} className="p-6 flex items-center">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder='Ask about BNB: What is the current price of BNB?”'
                className="w-full bg-transparent text-[15px] text-white/95 [text-shadow:0_0_2px_rgba(0,0,0,0.5)] placeholder:text-white/70 outline-none "
              />
              <button
                type="submit"
                className="ml-4 h-9 w-9 grid place-items-center rounded-lg bg-black/20 hover:bg-black/40 transition"
                aria-label="Send"
                title="Send"
              >
                <img
                  src="/arrow.png"
                  alt="Send"
                  className="w-4 h-4 object-contain"
                />
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ---------- CONVERSATION ----------
  return (
    <div className="relative w-full max-w-5xl">
      <div className="pb-40">
        {messages.map((m, i) => (
          <div key={i} className="max-w-3xl ml-0 mx-auto">
            {m.role === 'user' && (
              <div className="px-4 sm:px-6 mt-9">
                <div className="inline-block rounded-xl bg-bnb-yellow bg-gradient-to-r from-yellow-600 to-yellow-500 shadow-lg backdrop-blur px-4 py-2 text-white text-lg font-medium shadow-md">
                  {m.text}
                </div>
              </div>
            )}

            {m.role === 'ai' && (
              <div className="mt-4 rounded-xl border border-black/10 bg-white/10 backdrop-blur text-white border-white/20">
                <div className="flex items-center gap-2 px-4 py-2 text-xs text-white/60">
                  <div className="h-6 w-6 rounded-md bg-bnb-yellow flex items-center justify-center shadow-sm">
                    <Image
                      src="/head.png"
                      alt="BNB Agent Mascot"
                      width={24}
                      height={24}
                      className="object-contain"
                    />
                  </div>
                  Answer
                </div>
                <div className="px-4 pb-4">
                  <div className="mt-1 text-white/90 font-bold">
                    {m.text.split('\n')[0]}
                  </div>
                  {m.text
                    .split('\n')
                    .slice(1)
                    .map((line, li) => renderAiLine(line, li))}
                </div>
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="inline-block mx-4 mt-2 rounded-xl border-2 border-bnb-yellow bg-transparent px-4 py-2 text-sm text-white/80">
            Thinking…
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="fixed left-1/2 -translate-x-1/2 bottom-6 w-[92vw] max-w-3xl">
        <div className="rounded-2xl border border-black/10 font-semibold bg-gradient-to-r from-yellow-600 to-yellow-500 shadow-lg backdrop-blur shadow-lg backdrop-blur">
          <form onSubmit={send} className="p-4 flex items-center">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about BNB: “What is the current price of BNB?”"
              className="w-full bg-transparent text-[15px] text-white placeholder:text-white/70 outline-none"
            />
            <button
              type="submit"
              className="ml-4 h-9 w-9 grid place-items-center rounded-lg bg-black/20 hover:bg-black/40 transition"
              aria-label="Send"
              title="Send"
            >
              <img
                src="/arrow.png"
                alt="Send"
                className="w-4 h-4 object-contain"
              />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
