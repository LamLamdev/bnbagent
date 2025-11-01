'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { listChats, deleteChat, newChat, renameChat } from '@/lib/chatStore';
import { useEffect, useState } from 'react';

export default function Sidebar() {
  const [chats, setChats] = useState([]);
  const pathname = usePathname();
  const router = useRouter();

  const refresh = () => setChats(listChats());
  useEffect(() => { refresh(); }, []);

  const onNew = () => {
    const id = newChat();
    refresh();
    router.push(`/chat/${id}`);
  };

  const onDelete = (e, id) => {
    e.stopPropagation(); e.preventDefault();
    deleteChat(id);
    refresh();
    // if deleting current, go to /chat (redirect will pick a chat or create one)
    if (pathname === `/chat/${id}`) router.push('/chat');
  };

  const onRename = (e, id, oldTitle) => {
    e.stopPropagation(); e.preventDefault();
    const title = prompt('Rename chat:', oldTitle ?? '');
    if (title) { renameChat(id, title); refresh(); }
  };

  return (
    <aside style={{
      width: '200px',
      background: '#0a0a0a',
      borderRight: '1px solid #8c52ff',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      fontFamily: "'Courier New', monospace"
    }}>
      <button
        onClick={onNew}
        style={{
          background: '#8c52ff',
          color: '#000',
          border: 'none',
          padding: '10px',
          fontFamily: "'Courier New', monospace",
          fontWeight: 'bold',
          cursor: 'pointer',
          fontSize: '14px',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          e.target.style.background = '#8c52ff';
          e.target.style.boxShadow = '0 0 10px #8c52ff';
        }}
        onMouseLeave={(e) => {
          e.target.style.background = '#8c52ff';
          e.target.style.boxShadow = 'none';
        }}
      >
        + NEW CHAT
      </button>

      <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {chats.length === 0 && (
          <div style={{
            fontSize: '12px',
            color: '#8c52ff',
            textAlign: 'center',
            padding: '20px 0'
          }}>
            No chats yet.
          </div>
        )}
        {chats.map((c) => {
          const active = pathname === `/chat/${c.id}`;
          return (
            <Link
              key={c.id}
              href={`/chat/${c.id}`}
              style={{
                background: active ? '#1a1a1a' : '#111',
                border: '1px solid #8c52ff',
                padding: '8px',
                fontSize: '12px',
                color: '#8c52ff',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textDecoration: 'none',
                display: 'block',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = '#1a1a1a';
                  e.currentTarget.style.boxShadow = '0 0 5px #8c52ff';
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = '#111';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              <span style={{
                display: 'block',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                paddingRight: '50px'
              }}>
                {c.title || 'Untitled'}
              </span>
              <span style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex',
                gap: '5px',
                opacity: 0.8
              }}>
                <button
                  onClick={(e) => onRename(e, c.id, c.title)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#8c52ff',
                    cursor: 'pointer',
                    fontSize: '12px',
                    padding: '0 3px'
                  }}
                  title="Rename"
                >
                  ✎
                </button>
                <button
                  onClick={(e) => onDelete(e, c.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#8c52ff',
                    cursor: 'pointer',
                    fontSize: '12px',
                    padding: '0 3px'
                  }}
                  title="Delete"
                >
                  ×
                </button>
              </span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}