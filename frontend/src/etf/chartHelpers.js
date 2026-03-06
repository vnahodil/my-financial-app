import { INSTRUMENT_ISINS, PORTFOLIO_WEIGHTS, INSTRUMENT_META } from './instruments.js';

// ── Sector label map ─────────────────────────────────────────────────────────
// Yahoo Finance uses camelCase keys; map them to display names.

const SECTOR_LABEL_MAP = {
  technology:             'Information Technology',
  financialServices:      'Financials',
  consumerCyclical:       'Consumer Discretionary',
  communicationServices:  'Communication Services',
  basicMaterials:         'Materials',
  energy:                 'Energy',
  consumerDefensive:      'Consumer Staples',
  industrials:            'Industrials',
  healthcare:             'Health Care',
  utilities:              'Utilities',
  realestate:             'Real Estate',
};

export function formatSectorKey(key) {
  return SECTOR_LABEL_MAP[key] ||
    key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
}

// ── Shared chart style ────────────────────────────────────────────────────────

export const CHART_TOOLTIP_STYLE = {
  background: 'rgba(18,18,18,0.97)',
  border: '1px solid #555',
  borderRadius: 6,
  color: '#eee',
  fontSize: 12,
};

// ── Currency conversion ───────────────────────────────────────────────────────

/**
 * Convert a price from one currency to another using a date-keyed FX map.
 * fxByDate values are "USD per 1 unit of that currency" (e.g. CHFUSD=X).
 * USD is treated as 1.0. Returns null if conversion data is unavailable.
 *
 * @param {number}  price
 * @param {string}  fromCcy  - e.g. 'GBP', 'CHF', 'USD'
 * @param {string}  toCcy    - target display currency
 * @param {Object}  fxByDate - { [date]: { CHF: 1.12, EUR: 1.08, CZK: 0.043 } }
 * @param {string}  date     - 'YYYY-MM-DD'
 * @returns {number|null}
 */
function convertPrice(price, fromCcy, toCcy, fxByDate, date) {
  if (!price || fromCcy === toCcy) return price;
  const fromRate = fromCcy === 'USD' ? 1.0 : (fxByDate[date]?.[fromCcy] ?? null);
  const toRate   = toCcy   === 'USD' ? 1.0 : (fxByDate[date]?.[toCcy]   ?? null);
  if (fromRate == null || toRate == null) return null;
  return price * (fromRate / toRate);
}

// ── Per-instrument chart data ─────────────────────────────────────────────────

/**
 * Merges an ETF price series and a benchmark price series by date,
 * deduplicates to one point per month, optionally converts to targetCurrency,
 * and indexes both to 100 at start.
 *
 * @param {Array<{date,close}>} etf
 * @param {Array<{date,close}>} benchmark
 * @param {string} etfCurrency       - native currency of the ETF (e.g. 'GBP')
 * @param {string} benchCurrency     - native currency of the benchmark (e.g. 'USD')
 * @param {Object} fxByDate          - { [date]: { CHF, EUR, CZK } } — may be {} for USD display
 * @param {string} targetCurrency    - display currency (e.g. 'CHF')
 * @returns {Array<{date, etf, bench, etf_idx, bench_idx}>}
 */
export function buildChartData(etf, benchmark, etfCurrency = 'USD', benchCurrency = 'USD', fxByDate = {}, targetCurrency = 'USD') {
  const benchMap = Object.fromEntries(benchmark.map(d => [d.date, d.close]));

  // Merge and convert to monthly (take first occurrence per YYYY-MM)
  const seen = new Set();
  const merged = [];
  for (const d of etf) {
    const benchRaw = benchMap[d.date] ?? null;
    if (benchRaw == null) continue;

    const month = d.date.slice(0, 7);
    if (seen.has(month)) continue;
    seen.add(month);

    const etfConverted   = convertPrice(d.close,   etfCurrency,   targetCurrency, fxByDate, d.date);
    const benchConverted = convertPrice(benchRaw,   benchCurrency, targetCurrency, fxByDate, d.date);
    if (etfConverted == null || benchConverted == null) continue;  // FX missing for this date

    merged.push({ date: month, etf: etfConverted, bench: benchConverted });
  }

  if (!merged.length) return [];
  const e0 = merged[0].etf;
  const b0 = merged[0].bench;
  return merged.map(d => {
    const etf_idx   = e0 ? (d.etf   / e0 * 100) : 100;
    const bench_idx = b0 ? (d.bench / b0 * 100) : 100;
    return {
      ...d,
      etf_idx,
      bench_idx,
      relative_idx: bench_idx ? Math.round((etf_idx / bench_idx) * 100 * 100) / 100 : 100,
    };
  });
}

// ── Portfolio chart data ──────────────────────────────────────────────────────

/**
 * Build a blended portfolio performance series from per-instrument perf cache entries.
 *
 * @param {Object} perfCache     - { [isin]: { [period]: { etf: [], benchmark: [], etf_currency, benchmark_currency } } }
 * @param {string} period        - '1y' | '3y' | '5y'
 * @param {Object} fxByDate      - { [date]: { CHF, EUR, CZK } }
 * @param {string} targetCurrency - display currency
 * @returns {Array<{date, portfolio_idx, bench_idx}>}
 */
export function buildPortfolioChartData(perfCache, period, fxByDate = {}, targetCurrency = 'USD') {
  // Collect instruments that have loaded data for this period
  const available = INSTRUMENT_ISINS.filter(
    isin => perfCache[isin]?.[period]?.etf?.length > 0
  );
  if (available.length === 0) return [];

  // Build per-instrument indexed monthly series (with currency conversion)
  const series = {};
  let benchSeries = null;

  for (const isin of available) {
    const entry = perfCache[isin][period];
    const { etf, benchmark } = entry;
    const etfCcy   = entry.etf_currency       || 'USD';
    const benchCcy = entry.benchmark_currency  || 'USD';
    const merged = buildChartData(etf, benchmark, etfCcy, benchCcy, fxByDate, targetCurrency);
    if (!merged.length) continue;
    series[isin] = merged;
    if (!benchSeries) benchSeries = merged; // use first available as benchmark reference
  }

  const isinsWithData = Object.keys(series);
  if (!isinsWithData.length) return [];

  // Collect union of all dates
  const allDates = [...new Set(
    isinsWithData.flatMap(isin => series[isin].map(d => d.date))
  )].sort();

  // Build lookup: { isin -> { date -> etf_idx } }
  const idxByIsin = {};
  for (const isin of isinsWithData) {
    idxByIsin[isin] = Object.fromEntries(series[isin].map(d => [d.date, d.etf_idx]));
  }
  const benchMap = Object.fromEntries((benchSeries || []).map(d => [d.date, d.bench_idx]));

  // Compute portfolio_idx at each date
  return allDates
    .map(date => {
      // Instruments present at this date + their raw weights
      const present = isinsWithData.filter(isin => idxByIsin[isin][date] != null);
      if (!present.length) return null;

      const totalWeight = present.reduce((s, isin) => s + PORTFOLIO_WEIGHTS[isin], 0);
      const portfolio_idx = present.reduce((s, isin) => {
        const normWeight = PORTFOLIO_WEIGHTS[isin] / totalWeight;
        return s + normWeight * idxByIsin[isin][date];
      }, 0);

      const bench_idx = benchMap[date] ?? null;
      return {
        date,
        portfolio_idx:          Math.round(portfolio_idx * 100) / 100,
        bench_idx,
        portfolio_relative_idx: bench_idx
          ? Math.round((portfolio_idx / bench_idx) * 100 * 100) / 100
          : null,
      };
    })
    .filter(d => d !== null && d.bench_idx !== null);
}

// ── Portfolio sector blend ────────────────────────────────────────────────────

/**
 * Compute weighted sector exposure across all instruments that have sector data.
 * Gold (hasFundData=false) is excluded; remaining weights are renormalized.
 *
 * @param {Object} fundCache - { [isin]: { sectors: [{key,pct}] } }
 * @returns {Array<{key, name, pct}>} sorted ascending by pct
 */
export function buildPortfolioSectors(fundCache) {
  // Only include ISINs that have loaded sector data
  const eligible = INSTRUMENT_ISINS.filter(isin => {
    const meta = INSTRUMENT_META[isin];
    if (!meta.hasFundData) return false;
    const fund = fundCache[isin];
    return fund && !fund.error && fund.sectors?.length > 0;
  });

  if (!eligible.length) return [];

  // Renormalize weights among eligible instruments
  const totalWeight = eligible.reduce((s, isin) => s + PORTFOLIO_WEIGHTS[isin], 0);

  // Accumulate sector percentages
  const sectorAccum = {};
  for (const isin of eligible) {
    const normWeight = PORTFOLIO_WEIGHTS[isin] / totalWeight;
    for (const { key, pct } of fundCache[isin].sectors) {
      sectorAccum[key] = (sectorAccum[key] ?? 0) + normWeight * pct;
    }
  }

  return Object.entries(sectorAccum)
    .map(([key, pct]) => ({ key, name: formatSectorKey(key), pct: Math.round(pct * 100) / 100 }))
    .sort((a, b) => b.pct - a.pct);
}

// ── Relative sector helpers ───────────────────────────────────────────────────

/**
 * Compute per-sector over/underweight of etfSectors vs benchSectors.
 * Returns [{key, name, pct (delta)}] sorted by delta descending.
 */
export function computeRelativeSectors(etfSectors, benchSectors) {
  const benchMap = Object.fromEntries(benchSectors.map(s => [s.key, s.pct]));
  const etfMap   = Object.fromEntries(etfSectors.map(s => [s.key, s.pct]));
  const allKeys  = [...new Set([...etfSectors.map(s => s.key), ...benchSectors.map(s => s.key)])];
  return allKeys
    .map(key => ({
      key,
      name: formatSectorKey(key),
      pct:  Math.round(((etfMap[key] ?? 0) - (benchMap[key] ?? 0)) * 100) / 100,
    }))
    .sort((a, b) => b.pct - a.pct);
}

export function buildPortfolioRelativeSectors(fundCache, benchSectors) {
  return computeRelativeSectors(buildPortfolioSectors(fundCache), benchSectors);
}

// ── Relative holdings helpers ─────────────────────────────────────────────────

/**
 * Merge etfHoldings and benchHoldings by symbol, returning over/underweights
 * sorted by absolute delta descending.
 */
export function computeRelativeHoldings(etfHoldings, benchHoldings) {
  const benchMap = Object.fromEntries(benchHoldings.map(h => [h.symbol, h]));
  const etfMap   = Object.fromEntries(etfHoldings.map(h => [h.symbol, h]));
  const allSyms  = [...new Set([...etfHoldings.map(h => h.symbol), ...benchHoldings.map(h => h.symbol)])];
  return allSyms
    .map(sym => {
      const etfH  = etfMap[sym];
      const bH    = benchMap[sym];
      const etfW  = etfH?.weight ?? 0;
      const benchW = bH?.weight ?? 0;
      return {
        symbol:      sym,
        name:        etfH?.name || bH?.name || sym,
        etfWeight:   etfW,
        benchWeight: benchW,
        delta:       Math.round((etfW - benchW) * 100) / 100,
      };
    })
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

/**
 * Blend holdings across all instruments by portfolio weight, then compare to benchmark.
 */
export function buildPortfolioRelativeHoldings(fundCache, benchHoldings) {
  const eligible = INSTRUMENT_ISINS.filter(isin => {
    const fund = fundCache[isin];
    return fund && !fund.error && fund.holdings?.length > 0;
  });
  if (!eligible.length) return computeRelativeHoldings([], benchHoldings);

  const totalWeight  = eligible.reduce((s, isin) => s + PORTFOLIO_WEIGHTS[isin], 0);
  const holdingAccum = {};
  const holdingNames = {};

  for (const isin of eligible) {
    const normWeight = PORTFOLIO_WEIGHTS[isin] / totalWeight;
    for (const { symbol, name, weight } of fundCache[isin].holdings) {
      holdingAccum[symbol] = (holdingAccum[symbol] ?? 0) + normWeight * weight;
      holdingNames[symbol] = name;
    }
  }

  const blended = Object.entries(holdingAccum).map(([symbol, weight]) => ({
    symbol,
    name:   holdingNames[symbol] || symbol,
    weight: Math.round(weight * 100) / 100,
  }));

  return computeRelativeHoldings(blended, benchHoldings);
}
