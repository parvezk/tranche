import { fetchYahooChartResult } from "@/lib/server/yahoo";
import { isNumber } from "@/lib/utils";
import { type MarketDefinition, type MarketQuote } from "@/lib/utils/market-strip";

export const dynamic = "force-dynamic";

interface MarketMeta {
  regularMarketPrice?: number;
  chartPreviousClose?: number;
  previousClose?: number;
}

const INDEXES: MarketDefinition[] = [
  { symbol: "^GSPC", label: "S&P 500" },
  { symbol: "^IXIC", label: "Nasdaq" },
  { symbol: "^DJI", label: "Dow Jones" },
  { symbol: "^RUT", label: "Russell 2000" },
  { symbol: "^990100-USD-STRD", label: "MSCI World" },
];

const ETFS: MarketDefinition[] = [
  { symbol: "VOO", label: "VOO" },
  { symbol: "QQQ", label: "QQQ" },
  { symbol: "VTI", label: "VTI" },
  { symbol: "VT", label: "VT" },
  { symbol: "VXUS", label: "VXUS" },
  { symbol: "VONE", label: "VONE" },
  { symbol: "IEUR", label: "IEUR" },
  { symbol: "EEM", label: "EEM" },
];

// Normalize a Yahoo chart response into the compact quote shape consumed by the header strip.
async function fetchMarketQuote(definition: MarketDefinition): Promise<MarketQuote> {
  const result = await fetchYahooChartResult(definition.symbol, { interval: "1d", range: "1d" });
  const meta = (result?.meta as MarketMeta | undefined) ?? null;
  const price = meta?.regularMarketPrice;
  const previousClose = meta?.chartPreviousClose ?? meta?.previousClose;
  const change = isNumber(price) && isNumber(previousClose) ? price - previousClose : null;
  const changePct =
    isNumber(change) && isNumber(previousClose) && previousClose !== 0 ? (change / previousClose) * 100 : null;

  return {
    symbol: definition.symbol,
    label: definition.label,
    price: isNumber(price) ? price : null,
    change,
    changePct,
  };
}

async function fetchQuoteGroup(definitions: MarketDefinition[]) {
  return Promise.all(definitions.map(fetchMarketQuote));
}

// Serves both index and ETF quote groups in one request so the client can toggle instantly.
export async function GET() {
  const indexesPromise = fetchQuoteGroup(INDEXES);
  const etfsPromise = fetchQuoteGroup(ETFS);
  const [indexes, etfs] = await Promise.all([indexesPromise, etfsPromise]);

  return Response.json(
    { indexes, etfs },
    { headers: { "Cache-Control": "s-maxage=15, stale-while-revalidate=30" } },
  );
}
