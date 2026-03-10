export async function GET(req: Request) {
  const ticker = new URL(req.url).searchParams.get("ticker")?.toUpperCase();
  if (!ticker) {
    return Response.json({ error: "Missing ticker" }, { status: 400 });
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1y`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    const meta = result?.meta;
    const closes: Array<number | null> = result?.indicators?.quote?.[0]?.close ?? [];
    const timestamps: number[] = result?.timestamp ?? [];

    if (!meta || closes.length === 0) {
      return Response.json({ error: "No data" }, { status: 404 });
    }

    const currentPrice = meta.regularMarketPrice;
    if (typeof currentPrice !== "number") {
      return Response.json({ error: "No data" }, { status: 404 });
    }
    const now = new Date();

    const latestCloseAtOffset = (daysAgo: number): number | null => {
      const idx = Math.max(0, closes.length - 1 - daysAgo);
      const target = closes[idx];
      return typeof target === "number" ? target : null;
    };

    const pct = (past: number | null) =>
      typeof past === "number" ? ((currentPrice - past) / past) * 100 : null;

    const ytdIndex = timestamps.findIndex(
      (timestamp) => new Date(timestamp * 1000).getFullYear() === now.getFullYear(),
    );
    const ytdClose = ytdIndex >= 0 ? closes[ytdIndex] : null;

    return Response.json(
      {
        changePct1W: pct(latestCloseAtOffset(5)),
        changePct3M: pct(latestCloseAtOffset(63)),
        changePctYTD: pct(typeof ytdClose === "number" ? ytdClose : null),
        changePct1Y: pct(typeof closes[0] === "number" ? closes[0] : null),
      },
      { headers: { "Cache-Control": "s-maxage=3600" } },
    );
  } catch {
    return Response.json({ error: "No data" }, { status: 404 });
  }
}
