'use client';
import { useEffect } from 'react';
import { listChats, newChat } from '/lib/chatStore';
import { useRouter } from 'next/navigation';

export default function NewRouter() {
  const router = useRouter();
  useEffect(() => {
    const first = listChats()[0];
    const id = first?.id || newChat();
    router.replace(`/chat/${id}`);
  }, [router]);
  return null;
}
