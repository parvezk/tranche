import { fetchYahooChartResult, getTickerFromRequest } from "@/lib/server/yahoo";

interface PerfMeta {
  regularMarketPrice?: number;
}

interface PerfQuote {
  close?: Array<number | null>;
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function getCloseAtOffset(closes: Array<number | null>, daysAgo: number): number | null {
  const idx = Math.max(0, closes.length - 1 - daysAgo);
  const value = closes[idx];
  return isNumber(value) ? value : null;
}

function calculatePct(current: number, past: number | null): number | null {
  if (!isNumber(past) || past === 0) {
    return null;
  }
  return ((current - past) / past) * 100;
}

function getYtdBaseClose(closes: Array<number | null>, timestamps: number[], currentYear: number): number | null {
  const firstThisYearIndex = timestamps.findIndex(
    (timestamp) => new Date(timestamp * 1000).getFullYear() === currentYear,
  );

  if (firstThisYearIndex <= 0) {
    return null;
  }

  const previousYearClose = closes[firstThisYearIndex - 1];
  return isNumber(previousYearClose) ? previousYearClose : null;
}

export async function GET(req: Request) {
  const ticker = getTickerFromRequest(req);
  if (!ticker) {
    return Response.json(
      { error: "Missing ticker" },
      { status: 400 },
    );
  }

  const result = await fetchYahooChartResult(ticker, { interval: "1d", range: "1y" });
  if (!result) {
    return Response.json(
      { error: "No data" },
      { status: 404 },
    );
  }

  const meta = (result.meta as PerfMeta | undefined) ?? null;
  const closes = ((result.indicators as { quote?: PerfQuote[] } | undefined)?.quote?.[0]?.close ??
    []) as Array<number | null>;
  const timestamps = (result.timestamp as number[] | undefined) ?? [];

  const currPrice = meta?.regularMarketPrice;
  if (!isNumber(currPrice) || closes.length === 0) {
    return Response.json(
      { error: "No data" },
      { status: 404 },
    );
  }

  const ytdBaseClose = getYtdBaseClose(closes, timestamps, new Date().getFullYear());

  return Response.json(
    {
      changePct1W: calculatePct(currPrice, getCloseAtOffset(closes, 5)),
      changePct3M: calculatePct(currPrice, getCloseAtOffset(closes, 63)),
      changePctYTD: calculatePct(currPrice, ytdBaseClose),
      changePct1Y: calculatePct(currPrice, isNumber(closes[0]) ? closes[0] : null),
    },
    { headers: { "Cache-Control": "s-maxage=3600" } },
  );
}
