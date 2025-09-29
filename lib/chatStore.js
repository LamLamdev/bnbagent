// Simple localStorage-backed chat store (no timestamps)
const LS_CHATS = 'bnb_agent_chats';       // [{ id, title }]
const LS_PREFIX = 'bnb_agent_chat_';      // messages per id

const safeParse = (s, f) => { try { return JSON.parse(s) ?? f; } catch { return f; } };
const hasWin = () => typeof window !== 'undefined';

function genId() {
  // Browser/modern
  if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    if (typeof globalThis.crypto.randomUUID === 'function') {
      return globalThis.crypto.randomUUID();
    }
    if (typeof globalThis.crypto.getRandomValues === 'function') {
      // RFC4122 v4 from getRandomValues
      const buf = new Uint8Array(16);
      globalThis.crypto.getRandomValues(buf);
      buf[6] = (buf[6] & 0x0f) | 0x40; // version 4
      buf[8] = (buf[8] & 0x3f) | 0x80; // variant
      const hex = [...buf].map(b => b.toString(16).padStart(2, '0')).join('');
      return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
    }
  }
  // Fallback (not cryptographically strong, but fine for ids)
  return 'id-' + Math.random().toString(36).slice(2,10) + Date.now().toString(36);
}


export function listChats() {
  if (!hasWin()) return [];
  return safeParse(localStorage.getItem(LS_CHATS), []);
}

export function getMessages(id) {
  if (!hasWin()) return [];
  return safeParse(localStorage.getItem(LS_PREFIX + id), []);
}

export function setMessages(id, messages) {
  if (!hasWin()) return;
  localStorage.setItem(LS_PREFIX + id, JSON.stringify(messages));
}

export function upsertChatMeta(id, title) {
  if (!hasWin()) return;
  const chats = listChats();
  const i = chats.findIndex(c => c.id === id);
  if (i >= 0) chats[i].title = title;
  else chats.unshift({ id, title });          // newest first
  localStorage.setItem(LS_CHATS, JSON.stringify(chats));
}

export function deleteChat(id) {
  if (!hasWin()) return;
  const chats = listChats().filter(c => c.id !== id);
  localStorage.setItem(LS_CHATS, JSON.stringify(chats));
  localStorage.removeItem(LS_PREFIX + id);
}

export function renameChat(id, title) {
  upsertChatMeta(id, title);
}

export function newChat() {
  const id = genId();          // <-- use safe generator
  upsertChatMeta(id, 'New chat');
  setMessages(id, []);         // start empty
  return id;
}
