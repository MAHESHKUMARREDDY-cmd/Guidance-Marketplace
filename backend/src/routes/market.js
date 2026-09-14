import { Router } from "express";

const router = Router();
const CACHE_TTL_MS = 60 * 60 * 1000;
const quoteSymbols = [
  { symbol: "^NSEI", name: "NIFTY 50", kind: "index" },
  { symbol: "^BSESN", name: "SENSEX", kind: "index" },
  { symbol: "NIFTYBEES.NS", name: "Nippon India ETF Nifty BeES", kind: "etf" },
  { symbol: "JUNIORBEES.NS", name: "Nippon India ETF Junior BeES", kind: "etf" },
  { symbol: "GOLDBEES.NS", name: "Nippon India ETF Gold BeES", kind: "etf" },
];

let cachedSnapshot = null;
let cacheExpiresAt = 0;

function numberOrNull(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function fetchQuote({ symbol, name, kind }) {
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "GuidanceMarketplace/1.0 market-research",
    },
  });
  if (!response.ok) throw new Error(`Market data request failed for ${symbol}`);

  const payload = await response.json();
  const result = payload.chart?.result?.[0];
  const meta = result?.meta;
  const price = numberOrNull(meta?.regularMarketPrice ?? meta?.previousClose);
  const previousClose = numberOrNull(meta?.chartPreviousClose ?? meta?.previousClose);
  const change = price !== null && previousClose !== null ? price - previousClose : null;
  const changePercent = change !== null && previousClose ? (change / previousClose) * 100 : null;

  return {
    symbol,
    name,
    kind,
    price,
    change,
    changePercent,
    currency: meta?.currency || "INR",
    marketTime: meta?.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : null,
  };
}

async function buildSnapshot() {
  const settled = await Promise.allSettled(quoteSymbols.map(fetchQuote));
  const quotes = settled
    .filter((result) => result.status === "fulfilled" && result.value.price !== null)
    .map((result) => result.value);
  const failedCount = settled.length - quotes.length;

  if (quotes.length === 0) throw new Error("No market data is currently available");

  return {
    updatedAt: new Date().toISOString(),
    source: "Yahoo Finance public chart feed",
    refreshAfter: new Date(Date.now() + CACHE_TTL_MS).toISOString(),
    partial: failedCount > 0,
    quotes,
  };
}

router.get("/snapshot", async (req, res) => {
  if (cachedSnapshot && Date.now() < cacheExpiresAt) {
    return res.json({ ...cachedSnapshot, cached: true });
  }

  try {
    cachedSnapshot = await buildSnapshot();
    cacheExpiresAt = Date.now() + CACHE_TTL_MS;
    return res.json({ ...cachedSnapshot, cached: false });
  } catch (error) {
    console.error("Market snapshot error:", error.message);
    if (cachedSnapshot) {
      return res.json({ ...cachedSnapshot, stale: true, cached: true });
    }
    return res.status(503).json({ error: "Live market data is temporarily unavailable" });
  }
});

export default router;
