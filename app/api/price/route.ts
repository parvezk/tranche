import { fetchYahooChartResult, getTickerFromRequest } from "@/lib/server/yahoo";

interface PriceMeta {
  regularMarketPrice?: number;
  chartPreviousClose?: number;
  previousClose?: number;
  longName?: string;
  shortName?: string;
}

export async function GET(req: Request) {
  const ticker = getTickerFromRequest(req);
  if (!ticker) {
    return Response.json({ error: "Missing ticker" }, { status: 400 });
  }

  const result = await fetchYahooChartResult(ticker, { interval: "1d", range: "1d" });
  const meta = (result?.meta as PriceMeta | undefined) ?? null;
  const price = meta?.regularMarketPrice;

  if (!meta || typeof price !== "number") {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const prevClose = meta.chartPreviousClose ?? meta.previousClose;
  const changePct1D =
    typeof prevClose === "number" && prevClose !== 0 ? ((price - prevClose) / prevClose) * 100 : null;

  return Response.json(
    {
      ticker,
      name: meta.longName ?? meta.shortName ?? ticker,
      price,
      changePct1D,
    },
    { headers: { "Cache-Control": "s-maxage=60" } },
  );
}
