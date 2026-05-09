import { fetchYahooChartResult, getTickerFromRequest, type YahooChartQuery } from "@/lib/server/yahoo";

export type ChartDataResponse =
  | { errorResponse: Response; ticker?: never; result?: never }
  | { errorResponse?: never; ticker: string; result: Record<string, unknown> | null };

export async function getChartDataFromRequest(
  req: Request,
  query: YahooChartQuery
): Promise<ChartDataResponse> {
  const ticker = getTickerFromRequest(req);
  if (!ticker) {
    return {
      errorResponse: Response.json({ error: "Missing ticker" }, { status: 400 }),
    };
  }

  const result = await fetchYahooChartResult(ticker, query);

  return { ticker, result };
}
