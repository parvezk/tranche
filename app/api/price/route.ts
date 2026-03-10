export async function GET(req: Request) {
  const ticker = new URL(req.url).searchParams.get("ticker")?.toUpperCase();
  if (!ticker) {
    return Response.json({ error: "Missing ticker" }, { status: 400 });
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const price = meta.regularMarketPrice;
    if (typeof price !== "number") {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    const prevClose = meta.chartPreviousClose ?? meta.previousClose;
    const changePct1D = prevClose ? ((price - prevClose) / prevClose) * 100 : null;

    return Response.json(
      {
        ticker,
        name: meta.longName ?? meta.shortName ?? ticker,
        price,
        changePct1D,
      },
      { headers: { "Cache-Control": "s-maxage=60" } },
    );
  } catch {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
}
