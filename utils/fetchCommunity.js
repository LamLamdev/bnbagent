// utils/fetchCommunity.js
export async function fetchCommunity({ contract, ticker = '' }) {
  const qs = new URLSearchParams({ contract });
  if (ticker) qs.set('ticker', ticker);
  const res = await fetch(`/api/community?${qs.toString()}`, { cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.reason || data.error || `HTTP ${res.status}`);
  }
  return data;
}
