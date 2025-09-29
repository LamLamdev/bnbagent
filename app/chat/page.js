// app/chat/page.js
import { redirect } from 'next/navigation';

export default function ChatRoot() {
  redirect('/chat/new'); // immediately route to latest/created chat
}








