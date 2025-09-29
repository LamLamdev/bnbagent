// app/chat/[id]/page.js
'use client';
import Terminal from '@/components/Terminal.jsx';
import { getMessages } from '@/lib/chatStore';

export default function ChatSessionPage({ params }) {
  const { id } = params;

  // localStorage is available here (client component),
  // so it's safe to read synchronously:
  const hasMsgs = (getMessages(id) || []).length > 0;

  return <Terminal sessionId={id} startInHero={!hasMsgs} />;
}