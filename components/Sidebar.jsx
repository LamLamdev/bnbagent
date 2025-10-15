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
    const title = prompt('Rename chat:', oldTitle ?? '')?.trim();
    if (title) { renameChat(id, title); refresh(); }
  };

  return (
    <aside className="hidden md:flex md:w-64 shrink-0 border-r border-white/10 bg-black/20">
      <div className="flex h-screen flex-col p-4 gap-3">
        <button
          onClick={onNew}
          className="w-28 rounded-lg ml-5 bg-chinese-red mt-6 text-black text-sm font-semibold py-2 hover:opacity-90"
        >
          + New Chat
        </button>

        <div className="overflow-auto pr-1 space-y-1">
          {chats.length === 0 && (
            <div className="text-sm text-white/50 px-2 py-3">No chats yet</div>
          )}
          {chats.map(c => {
            const active = pathname === `/chat/${c.id}`;
            return (
              <Link
                key={c.id}
                href={`/chat/${c.id}`}
                className={`group flex items-center  justify-between rounded-md px-3 py-2 text-sm
                  ${active ? 'bg-white/80 text-black' : 'text-white/80 hover:bg-white/10'}`}
              >
                <span className="truncate">{c.title || 'Untitled'}</span>
                <span className="ml-2 flex gap-1 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={(e)=>onRename(e, c.id, c.title)}
                    className="text-xs px-2 py-0.5 rounded bg-white/10 hover:bg-white/20"
                    title="Rename"
                  >✎</button>
                  <button
                    onClick={(e)=>onDelete(e, c.id)}
                    className="text-xs px-2 py-0.5 rounded bg-white/10 hover:bg-white/20"
                    title="Delete"
                  >✕</button>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
