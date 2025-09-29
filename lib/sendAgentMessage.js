export async function sendAgentMessage(history, onToken, signal) {
  const res = await fetch("/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: history }),
    signal
  });

  // Don't try res.json() — the API streams text/plain
  if (!res.body) throw new Error(`HTTP ${res.status}: ${await res.text()}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    onToken(decoder.decode(value, { stream: true })); // append chunk
  }
}
