// app/api/agent/route.ts
import { NextRequest } from "next/server";
import OpenAI from "openai";
import { fetchBNBContext } from "@/lib/fetchContext";

export const runtime = "edge";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const SYSTEM_PROMPT = `
You are "BNB Agent" — BNB Chain specialist.
You MAY give **forward-looking estimates** when asked (e.g., "Q4 price"), but:
- Always output a probability-weighted RANGE (bear/base/bull) with % probabilities that sum to 100%.
- Cite drivers (macro, crypto liquidity, Binance/BNBChain roadmap, regulatory), and key risks.
- Use any provided web/context snippets to anchor claims; DO NOT fabricate sources.
- End with a concise "What to watch" checklist (3–5 bullets).
- Not financial advice.

When doing math (% changes, MCAP, FDV), show result first, then 1-line formula.
If no context is provided, say "no fresh context" and proceed with a model-based estimate + uncertainty.
`;


function wantsForecast(text: string) {
  const s = text.toLowerCase();
  return /q\d|quarter|forecast|predict|target|price target|projection|next month|end of (q|quarter|year)/.test(s);
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages) || !messages.length) {
      return new Response("Bad request", { status: 400 });
    }

    const trimmed = messages.slice(-16);
    const lastUser = [...trimmed].reverse().find(m => m.role === "user")?.content || "";
    let contextMsg: { role: "user" | "system"; content: string } | null = null;

    if (wantsForecast(String(lastUser))) {
      const ctx = await fetchBNBContext("BNB price outlook Q4, catalysts, risks, analyst views, BNB Chain roadmap");
      if (ctx.length) {
        const bullets = ctx.map((c, i) => `- [${i+1}] ${c.title}\n  ${c.snippet}\n  ${c.url}`).join("\n");
        contextMsg = {
          role: "user",
          content:
            `Context snippets (do NOT fabricate):\n${bullets}\n\nUse these to anchor your forecast.`
        };
      }
    }

    const input = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(contextMsg ? [contextMsg] : []),
      ...trimmed
    ];

    const response = await client.responses.create({
      model: "gpt-4o-mini",
      input,
      stream: true,
    });

    const enc = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const evt of response) {
            if (evt.type === "response.output_text.delta") {
              controller.enqueue(enc.encode(evt.delta));
            }
            if (evt.type === "response.completed") break;
          }
        } catch (e: any) {
          const msg = e?.code === "insufficient_quota"
            ? "Error: OpenAI quota exceeded for this project. Add credits and try again."
            : `Error: ${e?.message || "Unexpected error"}`;
          controller.enqueue(enc.encode(msg));
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
    });
  } catch (err: any) {
    return new Response(err?.message || "Server error", { status: 500 });
  }
}
