'use client';
import { useRef, useState, useEffect } from 'react';
import { sendAgentMessage } from '@/lib/sendAgentMessage';
import Image from 'next/image';
import { getMessages as lsGet, setMessages as lsSet, upsertChatMeta } from '@/lib/chatStore';

export default function Terminal({ startInHero = true, sessionId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hero, setHero] = useState(startInHero);
  const bottomRef = useRef(null);

  // Cycling placeholders
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const placeholders = [
    'Ask TutorAI: "What does 龙币 mean?"',
    'Ask TutorAI: "Translate this token name — 悟空."',
    'Ask TutorAI: "Explain the meaning of 发财."',
    'Ask TutorAI: "What\'s trending in the Chinese meta?"'
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Persistence Hooks
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

  // HERO MODE
  if (hero) {
    return (
      <div style={{ 
        width: '100%', 
        height: '100vh', 
        background: '#000', 
        color: '#E32E30',
        fontFamily: "'Courier New', monospace",
        position: 'relative'
      }}>
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(transparent 50%, rgba(227, 46, 48, 0.02) 50%)',
          backgroundSize: '100% 4px',
          pointerEvents: 'none',
          zIndex: 1000
        }} />
        
        <div className="fixed left-1/2 top-[400px] -translate-x-1/2 z-10 flex flex-col items-center gap-3">
          <Image
            src="/heromas.png"
            alt="TutorAI Mascot"
            width={75}
            height={75}
            className="object-contain"
          />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', textAlign: 'center' }}>
            <span style={{ color: '#E32E30', textShadow: '0 0 10px #E32E30' }}>Tutor</span>
            <span style={{ color: 'white' }}>AI</span>
          </h1>
          <div style={{ fontSize: '13px', marginTop: '10px' }}>
            <span style={{ color: '#E32E30', textShadow: '0 0 5px #E32E30' }}>tutorai@bnb:~$</span> system ready
          </div>
        </div>

        <div className="fixed left-1/2 top-[565px] -translate-x-1/2 w-[92vw] max-w-3xl z-10">
          <div style={{
            background: '#0a0a0a',
            border: '1px solid #E32E30',
            borderRadius: '0',
            padding: '20px',
            display: 'flex',
            gap: '10px',
            alignItems: 'center'
          }}>
            <form onSubmit={send} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={placeholders[placeholderIndex]}
                style={{
                  flex: 1,
                  background: '#000',
                  border: '1px solid #E32E30',
                  color: '#E32E30',
                  padding: '12px',
                  fontFamily: "'Courier New', monospace",
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                style={{
                  background: '#E32E30',
                  color: '#000',
                  border: 'none',
                  padding: '12px 24px',
                  fontFamily: "'Courier New', monospace",
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#FF4444';
                  e.target.style.boxShadow = '0 0 15px #E32E30';
                  e.target.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#E32E30';
                  e.target.style.boxShadow = 'none';
                  e.target.style.transform = 'scale(1)';
                }}
              >
                SEND
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // CONVERSATION MODE
  return (
 <div style={{ 
  width: '100%', 
  height: '100%',  // Changed from 100vh
  minHeight: '100vh',  // Added this
  background: '#000', 
  fontFamily: "'Courier New', monospace",
  display: 'flex',
  flexDirection: 'column',
  position: 'relative'
}}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(transparent 50%, rgba(227, 46, 48, 0.02) 50%)',
        backgroundSize: '100% 4px',
        pointerEvents: 'none',
        zIndex: 1000
      }} />
      
      <div style={{ 
        flex: 1, 
        padding: '20px',
        paddingBottom: '140px',
        overflowY: 'auto',
        background: '#000'
      }}>
        {messages.length === 0 && (
          <>
            <div style={{ marginBottom: '15px', lineHeight: 1.6 }}>
              <span style={{ color: '#E32E30', textShadow: '0 0 5px #E32E30' }}>tutorai@bnb:~$</span> initializing...
            </div>
            <div style={{ marginBottom: '15px', lineHeight: 1.6 }}>
              <span style={{ color: '#E32E30', textShadow: '0 0 5px #E32E30' }}>tutorai@bnb:~$</span> system ready
            </div>
            <div style={{ marginBottom: '15px', lineHeight: 1.6 }}>
              <span style={{ color: '#E32E30', textShadow: '0 0 5px #E32E30' }}>tutorai@bnb:~$</span> Chinese language & crypto tutor loaded
            </div>
            <br />
          </>
        )}

        {messages.map((m, i) => (
          <div key={i}>
            {m.role === 'user' && (
              <div style={{
                color: '#FFD700',
                background: 'rgba(255, 215, 0, 0.1)',
                borderLeft: '3px solid #FFD700',
                padding: '10px',
                margin: '10px 0',
                fontSize: '14px',
                textShadow: '0 0 3px #FFD700'
              }}>
                <span style={{ color: '#E32E30', textShadow: '0 0 5px #E32E30' }}>user@terminal:~$</span> {m.text}
              </div>
            )}

            {m.role === 'ai' && (
              <div style={{
                color: '#E32E30',
                borderLeft: '3px solid #E32E30',
                padding: '10px',
                margin: '10px 0',
                background: 'rgba(227, 46, 48, 0.05)',
                fontSize: '13px'
              }}>
                <div style={{
                  color: '#FF4444',
                  fontWeight: 'bold',
                  marginBottom: '5px',
                  textShadow: '0 0 5px #E32E30'
                }}>
                  [ANSWER]
                </div>
                <div style={{ whiteSpace: 'pre-wrap' }}>
                  {m.text}
                </div>
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div style={{ marginBottom: '15px', lineHeight: 1.6 }}>
            <span style={{ color: '#E32E30', textShadow: '0 0 5px #E32E30' }}>tutorai@bnb:~$</span> awaiting input
            <span style={{
              display: 'inline-block',
              width: '8px',
              height: '14px',
              background: '#E32E30',
              marginLeft: '2px',
              animation: 'blink 1s infinite'
            }}></span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar INSIDE terminal at bottom */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        right: '20px',
        background: '#000',
        border: '1px solid #E32E30',
        padding: '20px',
        zIndex: 1001
      }}>
        <form onSubmit={send} style={{ display: 'flex', gap: '10px', width: '100%' }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholders[placeholderIndex]}
            disabled={isTyping}
            style={{
              flex: 1,
              background: '#000',
              border: '1px solid #E32E30',
              color: '#E32E30',
              padding: '12px',
              fontFamily: "'Courier New', monospace",
              fontSize: '14px',
              outline: 'none'
            }}
          />
          <button
            type="submit"
            disabled={isTyping}
            style={{
              background: '#E32E30',
              color: '#000',
              border: 'none',
              padding: '12px 24px',
              fontFamily: "'Courier New', monospace",
              fontWeight: 'bold',
              cursor: isTyping ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s',
              opacity: isTyping ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (!isTyping) {
                e.target.style.background = '#FF4444';
                e.target.style.boxShadow = '0 0 15px #E32E30';
                e.target.style.transform = 'scale(1.05)';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.background = '#E32E30';
              e.target.style.boxShadow = 'none';
              e.target.style.transform = 'scale(1)';
            }}
          >
            SEND
          </button>
        </form>
      </div>

      <style jsx>{`
        @keyframes blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        input::placeholder {
          color: #a32;
        }
        div::-webkit-scrollbar {
          width: 10px;
        }
        div::-webkit-scrollbar-track {
          background: #000;
        }
        div::-webkit-scrollbar-thumb {
          background: #E32E30;
          border: 1px solid #000;
        }
        div::-webkit-scrollbar-thumb:hover {
          background: #FF4444;
        }
      `}</style>
    </div>
  );
}