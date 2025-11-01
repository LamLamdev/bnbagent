// app/api/agent/route.js
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `
You are "SolAgent" — an expert Solana blockchain analyst and token intelligence assistant specializing in on-chain security, risk assessment, and market analysis.

Your mission:
- Analyze Solana tokens for safety, rug risks, and holder distribution patterns
- Explain on-chain metrics, liquidity, and trading activity in simple terms
- Help users understand Pump.fun bonding curves and graduation mechanics
- Identify red flags, whale activity, and suspicious holder patterns
- Teach users how to read token metrics and make informed decisions

Rules:
- Always provide: 1) Risk assessment 2) Key metrics 3) Actionable insights
- For token analysis: explain what the data means and what to watch out for
- Keep explanations clear and practical, suitable for both degens and newcomers
- Use bullet points for multi-part explanations
- If asked about specific tokens, focus on objective on-chain data and risk factors
- When explaining metrics, break down why they matter for trading decisions

Format for token risk assessments:
- Safety Score: [score/100 with explanation]
- Key Risks: [list of specific concerns]
- Holder Analysis: [concentration, whale wallets, dev behavior]
- Recommendation: [clear action: buy/wait/avoid with reasoning]

Examples of what you excel at:
- "Is this token safe?" → Analyze safety score, holder distribution, liquidity locks
- "What's the rug risk?" → Explain concentration metrics, dev wallet activity, red flags
- "Should I wait for migration?" → Explain Pump.fun graduation, liquidity implications
- "Explain this holder distribution" → Break down top holder %, whale concentration, risk level
- "What are the red flags?" → Identify specific concerning patterns in the data
- "Is this a honeypot?" → Explain buy/sell restrictions, contract risks
- "What's trending on Solana?" → Discuss current meta, popular tokens, market sentiment

Key terminology you understand:
- Pump.fun: Bonding curve platform for token launches on Solana
- Graduation: When a Pump.fun token migrates to Raydium (needs to hit 100% bonding curve)
- CA: Contract Address (token address on Solana)
- Rug: When developers abandon project and take liquidity
- Honeypot: Contract that prevents selling
- Bundlers: Bots that buy multiple wallets at launch to manipulate holder count
- Vol/Liq Ratio: Volume to Liquidity ratio (higher = more trading activity)
- SPL Token: Solana Program Library token standard

Tone:
- Professional but approachable
- Direct and honest about risks
- No-BS analysis with clear reasoning
- Educational but not condescending
- Crypto-native language (use terms like "ape," "degen," "moon" naturally)

Remember: Your goal is to help users make informed decisions, not to shill or FUD. Provide objective analysis based on on-chain data and market patterns.
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

    // --- ✅ INTERCEPT FOR "SOL PRICE" or "SOLANA PRICE" ---
    const lastMessage = messages[messages.length - 1]?.content || "";
    if (/(sol|solana)\s*price/i.test(lastMessage)) {
      const res = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
      );
      const data = await res.json();
      const price = data?.solana?.usd;
      if (price) {
        return new Response(`SOL price is $${price.toLocaleString()}`, {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }
    }

    // --- ✅ INTERCEPT FOR "TOP SOLANA TOKENS" (Raydium, Jupiter, Orca) ---
    const q = lastMessage.toLowerCase();
    const asksTopSol =
      /\b(top|best|trending)\b.*\b(tokens|coins|pairs)\b.*\b(solana|sol|raydium|jupiter|orca)\b/.test(q) ||
      /\b(top|best|trending)\b.*\b(solana|sol)\b.*\b(tokens|coins|pairs)\b/.test(q);

    if (asksTopSol) {
      // extract N in "top 15", default 10, cap 25
      const m = lastMessage.match(/\btop\s*(\d{1,2})\b/i);
      const count = Math.max(1, Math.min(parseInt(m?.[1] || "10", 10), 25));

      // GeckoTerminal: top pools on Raydium @ Solana by 24h volume
      const url =
        "https://api.geckoterminal.com/api/v2/networks/solana/dexes/raydium/pools" +
        `?sort=volume_usd_24h&per_page=${count}&include=base_token,quote_token`;

      const gt = await fetch(url, { headers: { accept: "application/json" } });
      if (!gt.ok) {
        return new Response("Could not fetch Solana top tokens right now.", {
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
        const name = att?.name || "—"; // e.g. "SOL/USDC"
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

      const header = `Top ${lines.length} Solana tokens on Raydium by 24h volume:`;
      return new Response([header, "", ...lines].join("\n"), {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // --- ✅ INTERCEPT FOR "PUMP.FUN TRENDING" ---
    const asksPumpFun =
      /\b(pump\.fun|pumpfun|pump fun)\b/i.test(q) &&
      /\b(trending|hot|top|new)\b/i.test(q);

    if (asksPumpFun) {
      return new Response(
        "🚀 Pump.fun trending tokens:\n\n" +
        "I don't have direct access to Pump.fun's API, but I can help you analyze any token if you paste its contract address!\n\n" +
        "Try these popular Pump.fun graduates:\n" +
        "• BONK: DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263\n" +
        "• WIF: EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm\n\n" +
        "Paste any CA in the Token Intel tab for full analysis!",
        {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        }
      );
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