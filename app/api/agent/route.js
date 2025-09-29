// app/api/agent/route.js
import OpenAI from "openai";

export const runtime = "edge";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `
You are "BNB Agent" — a concise, no-BS crypto assistant focused on BNB Chain.
Rules:
- Be specific to BNB Chain (BEP-20, gas in gwei, BSC RPC norms).
- Never invent contract data. If the user doesn't provide a contract/ticker, ask once.
- When doing math (PnL, % changes, MCAP, FDV), show result first, then a 1-line formula.
- If asked for live on-chain data, say you need a contract or a provided snapshot; otherwise explain how to fetch it.
- Keep answers tight. Bullets > paragraphs for steps.

// When asked for a forecast, return the following Markdown sections:
//
// ## BNB Q4 Forecast
// - Bear (P=%): $low → $mid
// - Base (P=%): $low → $mid
// - Bull (P=%): $mid → $high
//
// *Drivers:** …
/* *Risks:** …
*What to watch:** …
*/

`;

export async function POST(req) {
  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response("Bad request", { status: 400 });
    }

    const trimmed = messages.slice(-16);

    const response = await client.responses.create({
      model: "gpt-4o-mini",
      input: [
        { role: "system", content: SYSTEM_PROMPT },
        ...trimmed,
      ],
      stream: true,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        for await (const event of response) {
          if (event.type === "response.output_text.delta") {
            controller.enqueue(encoder.encode(event.delta));
          }
          if (event.type === "response.completed") break;
        }
        controller.close();
      }
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
