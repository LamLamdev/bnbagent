// app/api/agent/route.js
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `
You are "BNB Agent" — a concise, no-BS crypto assistant focused on BNB Chain.
Rules:
- Be specific to BNB Chain (BEP-20, gas in gwei, BSC RPC norms).
- Never invent contract data. If the user doesn't provide a contract/ticker, ask once.
- When doing math (PnL, % changes, MCAP, FDV), show result first, then a 1-line formula.
- If asked for live on-chain data, say you need a contract or a provided snapshot; otherwise explain how to fetch it.
- Keep answers tight. Bullets > paragraphs for steps.
`;

// --- helpers for compact numbers ---
const compactUSD = (n) =>
  typeof n === "number"
    ? `$${Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n)}`
    : "$0";

const fmtPrice = (n) =>
  typeof n === "number"
    ? `$${n < 1 ? n.toFixed(6) : n < 10 ? n.toFixed(4) : n < 100 ? n.toFixed(2) : n.toFixed(2)}`
    : "$0";


export async function POST(req) {
  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response("Bad request", { status: 400 });
    }

    // --- ✅ INTERCEPT FOR "BNB PRICE" ---
    const lastMessage = messages[messages.length - 1]?.content || "";
    if (/bnb\s*price/i.test(lastMessage)) {
      const res = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd"
      );
      const data = await res.json();
      const price = data?.binancecoin?.usd;
      if (price) {
        return new Response(`BNB price is $${price.toLocaleString()}`, {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }
    }

    // --- ✅ INTERCEPT FOR "TOP BNB TOKENS" (market cap or 24h volume) ---
// --- ✅ INTERCEPT: "Top tokens on PancakeSwap (BNB)" by 24h volume ---
const q = lastMessage.toLowerCase();
const asksTopPcs =
  /\b(top|best)\b.*\b(tokens|coins|pairs)\b.*\b(pancakeswap|pcs)\b/.test(q) &&
  /\b(bnb|bsc|binance(?: smart)? chain)\b/.test(q);

if (asksTopPcs) {
  // extract N in "top 15", default 10, cap 25
  const m = lastMessage.match(/\btop\s*(\d{1,2})\b/i);
  const count = Math.max(1, Math.min(parseInt(m?.[1] || "10", 10), 25));

  // GeckoTerminal: top pools on PancakeSwap @ BSC by 24h volume
  const url =
    "https://api.geckoterminal.com/api/v2/networks/bsc/dexes/pancakeswap/pools" +
    `?sort=volume_usd_24h&per_page=${count}&include=base_token,quote_token`;

  const gt = await fetch(url, { headers: { accept: "application/json" } });
  if (!gt.ok) {
    return new Response("Could not fetch PancakeSwap (BNB) top tokens right now.", {
      status: 502,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const payload = await gt.json(); // { data: [pools], included: [tokens] }
  const pools = Array.isArray(payload?.data) ? payload.data : [];
  const included = Array.isArray(payload?.included) ? payload.included : [];

  // index included tokens by id for quick lookup
  const byId = new Map(included.map((i) => [i.id, i]));
  const safeNum = (x) => {
    const n = Number(x);
    return Number.isFinite(n) ? n : undefined;
  };

  const lines = pools.slice(0, count).map((p, i) => {
    const att = p?.attributes || {};
    const name = att?.name || "—"; // e.g. "CAKE/WBNB"
    const vol = compactUSD(safeNum(att?.volume_usd_24h));
    const liq = compactUSD(safeNum(att?.reserve_in_usd));

    // try to show base token price if provided
    const priceBase = safeNum(att?.base_token_price_usd);
    const price = priceBase !== undefined ? fmtPrice(priceBase) : "—";

    // show pair symbols if available via 'included'
    const baseRel = p?.relationships?.base_token?.data?.id;
    const quoteRel = p?.relationships?.quote_token?.data?.id;
    const baseTok = baseRel ? byId.get(baseRel) : undefined;
    const quoteTok = quoteRel ? byId.get(quoteRel) : undefined;
    const baseSym = baseTok?.attributes?.symbol?.toUpperCase?.();
    const quoteSym = quoteTok?.attributes?.symbol?.toUpperCase?.();
    const pairLabel = baseSym && quoteSym ? `${baseSym}/${quoteSym}` : name;

    return `${i + 1}. ${pairLabel} — ${price} • Vol ${vol} • Liq ${liq}`;
  });

  const header = `Top ${lines.length} PancakeSwap (BNB) tokens by 24h volume:`;
  return new Response([header, "", ...lines].join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}




    // --- OTHERWISE → FALLBACK TO OPENAI ---
    const trimmed = messages.slice(-16);

    const response = await client.responses.create({
      model: "gpt-4o-mini",
      input: [{ role: "system", content: SYSTEM_PROMPT }, ...trimmed],
      stream: true,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        for await (const event of response) {
          if (event.type === "response.output_text.delta") {
            let delta = event.delta;

            // 🔹 Sanitize markdown (remove bolds, italics, etc.)
            delta = delta.replace(/\*\*(.*?)\*\*/g, "$1"); // remove **bold**
            delta = delta.replace(/\*(.*?)\*/g, "$1");     // remove *italics*

            controller.enqueue(encoder.encode(delta));
          }
          if (event.type === "response.completed") break;
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    return new Response(err?.message || "Server error", { status: 500 });
  }
}
