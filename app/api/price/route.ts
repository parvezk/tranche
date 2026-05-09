import { isNumber } from "@/lib/utils";
import { getChartDataFromRequest } from "@/lib/server/api-helpers";

interface PriceMeta {
  regularMarketPrice?: number;
  chartPreviousClose?: number;
  previousClose?: number;
  longName?: string;
  shortName?: string;
}

export async function GET(req: Request) {
  const { errorResponse, ticker, result } = await getChartDataFromRequest(req, { interval: "1d", range: "1d" });
  if (errorResponse) {
    return errorResponse;
  }

  const meta = (result?.meta as PriceMeta | undefined) ?? null;
  const price = meta?.regularMarketPrice;

  if (!meta || !isNumber(price)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const prevClose = meta.chartPreviousClose ?? meta.previousClose;
  const changePct1D =
    isNumber(prevClose) && prevClose !== 0 ? ((price - prevClose) / prevClose) * 100 : null;

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
