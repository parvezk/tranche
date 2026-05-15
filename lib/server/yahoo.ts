import {
  MAX_TICKER_LENGTH,
  TICKER_REGEX,
  YAHOO_FINANCE_CHART_BASE_URL,
  YAHOO_FINANCE_USER_AGENT,
} from "@/lib/constants/yahoo";

interface YahooChartResponse {
  chart?: {
    result?: Array<Record<string, unknown>>;
  };
}

export interface YahooChartQuery {
  interval: "1d";
  range: "1d" | "1y";
}

export function getTickerFromRequest(req: Request): string | null {
  const rawTicker = new URL(req.url).searchParams.get("ticker");
  if (!rawTicker || rawTicker.length > MAX_TICKER_LENGTH) {
    return null;
  }

  const ticker = rawTicker.toUpperCase().trim();
  if (ticker.length === 0 || !TICKER_REGEX.test(ticker)) {
    return null;
  }

  return ticker;
}

export async function fetchYahooChartResult(
  ticker: string,
  query: YahooChartQuery,
): Promise<Record<string, unknown> | null> {
  try {
    const params = new URLSearchParams({
      interval: query.interval,
      range: query.range,
    });
    const url = `${YAHOO_FINANCE_CHART_BASE_URL}/${encodeURIComponent(ticker)}?${params.toString()}`;

    const res = await fetch(url, {
      headers: { "User-Agent": YAHOO_FINANCE_USER_AGENT },
    });

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as YahooChartResponse;
    const result = data?.chart?.result?.[0];
    return result ?? null;
  } catch {
    return null;
  }
}
