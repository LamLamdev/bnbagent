// lib/fetchContext.ts
export async function fetchBNBContext(q: string) {
  try {
    const resp = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.TAVILY_API_KEY}` },
      body: JSON.stringify({
        query: q,
        search_depth: "basic",
        max_results: 6,
        include_answer: false,
        include_raw_content: false,
      }),
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    // Normalize to lightweight snippets
    return (data.results || []).map((r: any) => ({
      title: r.title,
      url: r.url,
      snippet: r.content?.slice(0, 500) || r.snippet || ""
    }));
  } catch {
    return [];
  }
}
