import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  LineChart, Line, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import Spinner from 'react-bootstrap/Spinner';
import Table from 'react-bootstrap/Table';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Button from 'react-bootstrap/Button';

import { INSTRUMENT_META, BENCHMARK_LABEL } from './instruments.js';
import {
  buildChartData, formatSectorKey, CHART_TOOLTIP_STYLE,
  computeRelativeSectors, computeRelativeHoldings,
} from './chartHelpers.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';
const PERIODS = ['1y', '3y', '5y', 'custom'];

export default function InstrumentTab({
  isin,
  period,
  setPeriod,
  customFrom,
  setCustomFrom,
  customTo,
  setCustomTo,
  cacheKey,
  periodParams,
  chartMode,
  setChartMode,
  currency,
  fxCache,
  perfCache,
  setPerfCache,
  fundCache,
  setFundCache,
  benchmarkFundData,
}) {
  const [sectorView,   setSectorView]   = useState('absolute');
  const [holdingsView, setHoldingsView] = useState('absolute');
  const meta = INSTRUMENT_META[isin];

  // ── Fetch performance whenever isin or cacheKey changes ──
  useEffect(() => {
    if (period === 'custom' && customFrom >= customTo) return;
    if (perfCache[isin]?.[cacheKey]) return;   // already loaded

    setPerfCache(prev => ({
      ...prev,
      [isin]: { ...prev[isin], [cacheKey]: 'loading' },
    }));

    axios.get(`${API_URL}/api/etf/performance`, { params: { isin, ...periodParams } })
      .then(res => {
        setPerfCache(prev => ({
          ...prev,
          [isin]: { ...prev[isin], [cacheKey]: res.data.error ? { error: res.data.error } : res.data },
        }));
      })
      .catch(() => {
        setPerfCache(prev => ({
          ...prev,
          [isin]: { ...prev[isin], [cacheKey]: { error: 'Could not reach the backend.' } },
        }));
      });
  }, [isin, cacheKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch fund data once per isin ──
  useEffect(() => {
    if (fundCache[isin]) return;   // already loaded
    if (!meta.hasFundData) {
      setFundCache(prev => ({ ...prev, [isin]: { sectors: [], holdings: [], note: 'No fund data' } }));
      return;
    }

    setFundCache(prev => ({ ...prev, [isin]: 'loading' }));

    axios.get(`${API_URL}/api/etf/fund-data`, { params: { isin } })
      .then(res => {
        setFundCache(prev => ({ ...prev, [isin]: res.data.error ? { error: res.data.error, sectors: [], holdings: [] } : res.data }));
      })
      .catch(() => {
        setFundCache(prev => ({ ...prev, [isin]: { error: 'Could not reach the backend.', sectors: [], holdings: [] } }));
      });
  }, [isin]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derive state from cache ──
  const perfEntry = perfCache[isin]?.[cacheKey];
  const perfLoading = !perfEntry || perfEntry === 'loading';
  const perfError   = typeof perfEntry === 'object' && perfEntry?.error ? perfEntry.error : null;
  const perfData    = !perfLoading && !perfError ? perfEntry : null;

  const fundEntry = fundCache[isin];
  const fundLoading = !fundEntry || fundEntry === 'loading';
  const fundError   = typeof fundEntry === 'object' && fundEntry?.error ? fundEntry.error : null;
  const fundData    = !fundLoading && !fundError ? fundEntry : null;

  // ── FX rates for the current cacheKey ──
  const fxRates   = Array.isArray(fxCache[cacheKey]) ? fxCache[cacheKey] : [];
  const fxByDate  = useMemo(
    () => Object.fromEntries(fxRates.map(d => [d.date, d])),
    [fxRates]
  );

  // ── Chart data ──
  const chartData = useMemo(() => {
    if (!perfData) return [];
    const etfCcy   = perfData.etf_currency       || 'USD';
    const benchCcy = perfData.benchmark_currency  || 'USD';
    return buildChartData(perfData.etf, perfData.benchmark, etfCcy, benchCcy, fxByDate, currency);
  }, [perfData, fxByDate, currency]);

  const stats = useMemo(() => {
    if (chartData.length < 2) return null;
    const first = chartData[0];
    const last  = chartData[chartData.length - 1];
    const etfRet   = (last.etf   / first.etf   - 1) * 100;
    const benchRet = (last.bench / first.bench - 1) * 100;
    return {
      etfRet:   etfRet.toFixed(1),
      benchRet: benchRet.toFixed(1),
      diff:     (etfRet - benchRet).toFixed(1),
    };
  }, [chartData]);

  // ── Actual date range shown in chart ──
  const actualRange = chartData.length >= 2
    ? `${chartData[0].date} – ${chartData[chartData.length - 1].date}`
    : null;

  // ── Sector data sorted for chart ──
  const sectors = useMemo(() => {
    if (!fundData?.sectors?.length) return [];
    return [...fundData.sectors]
      .map(s => ({ ...s, name: formatSectorKey(s.key) }))
      .sort((a, b) => b.pct - a.pct);
  }, [fundData]);

  const benchReady       = Array.isArray(benchmarkFundData?.sectors) && benchmarkFundData.sectors.length > 0;
  const benchSectors     = benchReady ? benchmarkFundData.sectors  : [];
  const benchHoldings    = benchReady ? (benchmarkFundData.holdings || []) : [];

  const relativeSectors  = useMemo(
    () => (sectors.length && benchReady ? computeRelativeSectors(sectors, benchSectors) : []),
    [sectors, benchSectors, benchReady] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const relativeHoldings = useMemo(
    () => (fundData?.holdings?.length && benchReady
      ? computeRelativeHoldings(fundData.holdings, benchHoldings)
      : []),
    [fundData, benchHoldings, benchReady] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const etfDataKey   = chartMode === 'relative' ? 'relative_idx' : 'etf_idx';
  const etfTicker    = perfData?.etf_ticker || '';
  const isProxy      = perfData?.is_proxy ?? meta.isProxy ?? false;

  return (
    <>
      {/* ── Instrument header ── */}
      <div className="etf-instrument-header">
        <div>
          <div className="etf-instrument-name">{meta.name}</div>
          <div className="etf-meta">
            <span>ISIN {isin}</span>
            {etfTicker && <span>· {etfTicker}</span>}
            {isProxy && meta.proxyTicker && (
              <span className="etf-proxy-note">· Market data via proxy {meta.proxyTicker}</span>
            )}
            <span>· Benchmark: {BENCHMARK_LABEL}</span>
            <span>· <a href={`${import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:5000'}/api/etf/factsheet?isin=${isin}`} download={`${isin}_fact_sheet.pdf`} className="etf-factsheet-link">Fact Sheet ↓</a></span>
          </div>
        </div>
      </div>

      {/* ── Performance chart ── */}
      <div className="etf-card">
        <div className="etf-card-header">
          <span>Performance</span>
          <div className="etf-controls">
            <ButtonGroup size="sm" className="me-2">
              {PERIODS.map(p => (
                <Button
                  key={p}
                  variant={period === p ? 'primary' : 'outline-secondary'}
                  onClick={() => setPeriod(p)}
                  className="etf-period-btn"
                >
                  {p === 'custom' ? 'Custom' : p.toUpperCase()}
                </Button>
              ))}
            </ButtonGroup>
            {period === 'custom' && (
              <div className="etf-date-inputs me-2">
                <input
                  type="date"
                  className="etf-date-input"
                  value={customFrom}
                  max={customTo}
                  onChange={e => setCustomFrom(e.target.value)}
                />
                <span className="etf-date-sep">–</span>
                <input
                  type="date"
                  className="etf-date-input"
                  value={customTo}
                  min={customFrom}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={e => setCustomTo(e.target.value)}
                />
              </div>
            )}
            <ButtonGroup size="sm">
              {['relative', 'absolute'].map(m => (
                <Button
                  key={m}
                  variant={chartMode === m ? 'primary' : 'outline-secondary'}
                  onClick={() => setChartMode(m)}
                  className="etf-period-btn etf-period-btn--cap"
                >
                  {m}
                </Button>
              ))}
            </ButtonGroup>
          </div>
        </div>

        <div className="etf-card-body">
          {perfLoading && (
            <div className="etf-loading">
              <Spinner animation="border" size="sm" className="me-2" />
              Loading performance data…
            </div>
          )}
          {perfError && <div className="etf-error">{perfError}</div>}

          {!perfLoading && !perfError && chartData.length > 0 && (
            <>
              {stats && (
                <div className="etf-stats-row">
                  <div className="etf-stat">
                    <div className="etf-stat-label">Return in {currency} ({actualRange ?? period.toUpperCase()})</div>
                    <div className={`etf-stat-value ${parseFloat(stats.etfRet) >= 0 ? 'pos' : 'neg'}`}>
                      {parseFloat(stats.etfRet) >= 0 ? '+' : ''}{stats.etfRet}%
                    </div>
                  </div>
                  <div className="etf-stat">
                    <div className="etf-stat-label">{BENCHMARK_LABEL}</div>
                    <div className={`etf-stat-value ${parseFloat(stats.benchRet) >= 0 ? 'pos' : 'neg'}`}>
                      {parseFloat(stats.benchRet) >= 0 ? '+' : ''}{stats.benchRet}%
                    </div>
                  </div>
                  <div className="etf-stat">
                    <div className="etf-stat-label">Difference</div>
                    <div className={`etf-stat-value ${parseFloat(stats.diff) >= 0 ? 'pos' : 'neg'}`}>
                      {parseFloat(stats.diff) >= 0 ? '+' : ''}{stats.diff}%
                    </div>
                  </div>
                </div>
              )}

              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#bbb', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(255,255,255,0.18)' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tickFormatter={v => v.toFixed(0)}
                    tick={{ fill: '#bbb', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(255,255,255,0.18)' }}
                    domain={['auto', 'auto']}
                    width={55}
                  />
                  <ReferenceLine y={100} stroke="#555" strokeDasharray="4 4" />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={v => [v.toFixed(2), '']} />
                  <Legend wrapperStyle={{ color: '#ccc', fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey={etfDataKey}
                    name={chartMode === 'relative' ? `${etfTicker || meta.shortName} vs ${BENCHMARK_LABEL}` : (etfTicker || meta.shortName)}
                    stroke="#0d6efd"
                    dot={false}
                    strokeWidth={2}
                  />
                  {chartMode === 'absolute' && (
                    <Line
                      type="monotone"
                      dataKey="bench_idx"
                      name={BENCHMARK_LABEL}
                      stroke="#fd7e14"
                      dot={false}
                      strokeWidth={2}
                      strokeDasharray="5 3"
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </>
          )}

          {!perfLoading && !perfError && chartData.length === 0 && (
            <div className="etf-loading">No data returned from backend.</div>
          )}
        </div>
      </div>

      {/* ── Sector Exposure ── */}
      <div className="etf-card">
        <div className="etf-card-header">
          <span>Sector Exposure</span>
          <ButtonGroup size="sm">
            <Button
              variant={sectorView === 'absolute' ? 'primary' : 'outline-secondary'}
              onClick={() => setSectorView('absolute')}
              className="etf-period-btn"
            >Abs</Button>
            <Button
              variant={sectorView === 'relative' ? 'primary' : 'outline-secondary'}
              onClick={() => setSectorView('relative')}
              className="etf-period-btn"
              disabled={!benchReady}
            >Rel</Button>
          </ButtonGroup>
        </div>
        <div className="etf-card-body">
          {fundData?.fund_data_ticker && (
            <div className="etf-rel-note" style={{ marginBottom: '0.5rem' }}>
              Fund data sourced from {fundData.fund_data_ticker} (closest index-equivalent with reliable data)
            </div>
          )}
          {fundLoading && (
            <div className="etf-loading">
              <Spinner animation="border" size="sm" className="me-2" />
              Loading fund data…
            </div>
          )}
          {fundError && <div className="etf-error">{fundError}</div>}
          {!fundLoading && !fundError && sectorView === 'absolute' && sectors.length > 0 && (
            <ResponsiveContainer width="100%" height={Math.max(200, sectors.length * 28)}>
              <BarChart data={sectors} layout="vertical" margin={{ top: 0, right: 40, left: 160, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={false} />
                <XAxis type="number" tickFormatter={v => `${v}%`}
                  tick={{ fill: '#bbb', fontSize: 11 }} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.18)' }} />
                <YAxis type="category" dataKey="name" width={155}
                  tick={{ fill: '#ddd', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip formatter={v => [`${v.toFixed(2)}%`, 'Weight']} contentStyle={CHART_TOOLTIP_STYLE} />
                <Bar dataKey="pct" fill="#0d6efd" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
          {!fundLoading && !fundError && sectorView === 'relative' && relativeSectors.length > 0 && (
            <>
              <div className="etf-rel-note">vs {BENCHMARK_LABEL} · positive = overweight</div>
              <ResponsiveContainer width="100%" height={Math.max(200, relativeSectors.length * 28)}>
                <BarChart data={relativeSectors} layout="vertical" margin={{ top: 0, right: 40, left: 160, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={false} />
                  <XAxis type="number" tickFormatter={v => `${v >= 0 ? '+' : ''}${v}%`}
                    tick={{ fill: '#bbb', fontSize: 11 }} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.18)' }} />
                  <YAxis type="category" dataKey="name" width={155}
                    tick={{ fill: '#ddd', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <ReferenceLine x={0} stroke="rgba(255,255,255,0.3)" />
                  <Tooltip
                    formatter={v => [`${v >= 0 ? '+' : ''}${v.toFixed(2)}%`, 'vs Benchmark']}
                    contentStyle={CHART_TOOLTIP_STYLE}
                  />
                  <Bar dataKey="pct">
                    {relativeSectors.map((entry, i) => (
                      <Cell key={i} fill={entry.pct >= 0 ? '#28a745' : '#dc3545'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </>
          )}
          {!fundLoading && !fundError && sectors.length === 0 && (
            <div className="etf-loading">No sector data available for this ticker.</div>
          )}
        </div>
      </div>

      {/* ── Top Holdings ── */}
      <div className="etf-card">
        <div className="etf-card-header">
          <span>Top Holdings</span>
          <ButtonGroup size="sm">
            <Button
              variant={holdingsView === 'absolute' ? 'primary' : 'outline-secondary'}
              onClick={() => setHoldingsView('absolute')}
              className="etf-period-btn"
            >Abs</Button>
            <Button
              variant={holdingsView === 'relative' ? 'primary' : 'outline-secondary'}
              onClick={() => setHoldingsView('relative')}
              className="etf-period-btn"
              disabled={!benchReady}
            >Rel</Button>
          </ButtonGroup>
        </div>
        <div className="etf-card-body">
          {fundData?.fund_data_ticker && (
            <div className="etf-rel-note" style={{ marginBottom: '0.5rem' }}>
              Fund data sourced from {fundData.fund_data_ticker} (closest index-equivalent with reliable data)
            </div>
          )}
          {fundLoading && (
            <div className="etf-loading">
              <Spinner animation="border" size="sm" className="me-2" />
              Loading fund data…
            </div>
          )}
          {fundError && <div className="etf-error">{fundError}</div>}
          {!fundLoading && !fundError && holdingsView === 'absolute' && fundData?.holdings?.length > 0 && (
            <Table responsive size="sm" className="etf-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Symbol</th>
                  <th>Name</th>
                  <th className="text-end">Weight</th>
                </tr>
              </thead>
              <tbody>
                {fundData.holdings.map(h => (
                  <tr key={h.rank}>
                    <td className="text-muted">{h.rank}</td>
                    <td><span className="etf-sector-badge">{h.symbol}</span></td>
                    <td>{h.name}</td>
                    <td className="text-end">{h.weight.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          {!fundLoading && !fundError && holdingsView === 'relative' && relativeHoldings.length > 0 && (
            <>
              <div className="etf-rel-note">vs {BENCHMARK_LABEL} · top 20 by absolute deviation · positive = overweight</div>
              <Table responsive size="sm" className="etf-table">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Name</th>
                    <th className="text-end">ETF %</th>
                    <th className="text-end">Benchmark %</th>
                    <th className="text-end">Delta</th>
                  </tr>
                </thead>
                <tbody>
                  {relativeHoldings.slice(0, 20).map(h => (
                    <tr key={h.symbol}>
                      <td><span className="etf-sector-badge">{h.symbol}</span></td>
                      <td>{h.name}</td>
                      <td className="text-end">{h.etfWeight > 0 ? `${h.etfWeight.toFixed(2)}%` : '—'}</td>
                      <td className="text-end">{h.benchWeight > 0 ? `${h.benchWeight.toFixed(2)}%` : '—'}</td>
                      <td className={`text-end ${h.delta >= 0 ? 'etf-delta-pos' : 'etf-delta-neg'}`}>
                        {h.delta >= 0 ? '+' : ''}{h.delta.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </>
          )}
          {!fundLoading && !fundError && !fundData?.holdings?.length && (
            <div className="etf-loading">No holdings data available for this ticker.</div>
          )}
        </div>
      </div>
    </>
  );
}
