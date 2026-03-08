import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  LineChart, Line,
  BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import Spinner from 'react-bootstrap/Spinner';
import Table from 'react-bootstrap/Table';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Button from 'react-bootstrap/Button';

import { INSTRUMENT_ISINS, INSTRUMENT_META, PORTFOLIO_WEIGHTS, BENCHMARK_LABEL } from './instruments.js';
import {
  buildPortfolioChartData, buildPortfolioSectors, CHART_TOOLTIP_STYLE,
  buildPortfolioRelativeSectors, buildPortfolioRelativeHoldings,
} from './chartHelpers.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';
const PERIODS = ['1y', '3y', '5y', 'custom'];

export default function PortfolioTab({
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
  // ── Trigger fetches for all instruments missing data ──
  useEffect(() => {
    if (period === 'custom' && customFrom >= customTo) return;
    for (const isin of INSTRUMENT_ISINS) {
      if (!perfCache[isin]?.[cacheKey]) {
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
              [isin]: { ...prev[isin], [cacheKey]: { error: 'Could not reach backend.' } },
            }));
          });
      }

      if (!fundCache[isin]) {
        const meta = INSTRUMENT_META[isin];
        if (!meta.hasFundData) {
          setFundCache(prev => ({ ...prev, [isin]: { sectors: [], holdings: [], note: 'No fund data' } }));
          continue;
        }
        setFundCache(prev => ({ ...prev, [isin]: 'loading' }));
        axios.get(`${API_URL}/api/etf/fund-data`, { params: { isin } })
          .then(res => {
            setFundCache(prev => ({
              ...prev,
              [isin]: res.data.error ? { error: res.data.error, sectors: [], holdings: [] } : res.data,
            }));
          })
          .catch(() => {
            setFundCache(prev => ({ ...prev, [isin]: { error: 'Could not reach backend.', sectors: [], holdings: [] } }));
          });
      }
    }
  }, [cacheKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Loading state: how many instruments have perf data for this cacheKey ──
  const loadedCount = INSTRUMENT_ISINS.filter(
    isin => perfCache[isin]?.[cacheKey] && perfCache[isin][cacheKey] !== 'loading' && !perfCache[isin][cacheKey]?.error
  ).length;
  const allPerfLoaded = loadedCount === INSTRUMENT_ISINS.length;

  // ── FX rates for the current cacheKey ──
  const fxRates  = Array.isArray(fxCache[cacheKey]) ? fxCache[cacheKey] : [];
  const fxByDate = useMemo(
    () => Object.fromEntries(fxRates.map(d => [d.date, d])),
    [fxRates]
  );

  // ── Portfolio chart data ──
  const chartData = useMemo(
    () => buildPortfolioChartData(perfCache, cacheKey, fxByDate, currency),
    [perfCache, cacheKey, fxByDate, currency]
  );

  // ── Actual date range shown in chart ──
  const actualRange = chartData.length >= 2
    ? `${chartData[0].date} – ${chartData[chartData.length - 1].date}`
    : null;

  // ── Portfolio stats ──
  const stats = useMemo(() => {
    if (chartData.length < 2) return null;
    const first = chartData[0];
    const last  = chartData[chartData.length - 1];
    const portRet  = (last.portfolio_idx  / first.portfolio_idx  - 1) * 100;
    const benchRet = (last.bench_idx / first.bench_idx - 1) * 100;
    return {
      portRet:  portRet.toFixed(1),
      benchRet: benchRet.toFixed(1),
      diff:     (portRet - benchRet).toFixed(1),
    };
  }, [chartData]);

  // ── Portfolio sectors ──
  const fundDataLoaded = INSTRUMENT_ISINS.every(
    isin => fundCache[isin] && fundCache[isin] !== 'loading'
  );
  const sectors = useMemo(
    () => (fundDataLoaded ? buildPortfolioSectors(fundCache) : []),
    [fundCache, fundDataLoaded]
  );

  const benchReady          = Array.isArray(benchmarkFundData?.sectors) && benchmarkFundData.sectors.length > 0;
  const benchSectors        = benchReady ? benchmarkFundData.sectors  : [];
  const benchHoldings       = benchReady ? (benchmarkFundData.holdings || []) : [];

  const relativeSectors     = useMemo(
    () => (fundDataLoaded && benchReady ? buildPortfolioRelativeSectors(fundCache, benchSectors) : []),
    [fundCache, fundDataLoaded, benchSectors, benchReady] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const relativeHoldings    = useMemo(
    () => (fundDataLoaded && benchReady ? buildPortfolioRelativeHoldings(fundCache, benchHoldings) : []),
    [fundCache, fundDataLoaded, benchHoldings, benchReady] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const blendedHoldings     = useMemo(() => {
    if (!fundDataLoaded) return [];
    const eligible = INSTRUMENT_ISINS.filter(isin => {
      const fund = fundCache[isin];
      return fund && !fund.error && fund.holdings?.length > 0;
    });
    if (!eligible.length) return [];
    const totalWeight = eligible.reduce((s, isin) => s + PORTFOLIO_WEIGHTS[isin], 0);
    const accum = {};
    const names = {};
    for (const isin of eligible) {
      const normW = PORTFOLIO_WEIGHTS[isin] / totalWeight;
      for (const { symbol, name, weight } of fundCache[isin].holdings) {
        accum[symbol] = (accum[symbol] ?? 0) + normW * weight;
        names[symbol] = name;
      }
    }
    return Object.entries(accum)
      .map(([symbol, weight]) => ({ symbol, name: names[symbol] || symbol, weight: Math.round(weight * 100) / 100 }))
      .sort((a, b) => b.weight - a.weight);
  }, [fundCache, fundDataLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const perfDataKey = chartMode === 'relative' ? 'portfolio_relative_idx' : 'portfolio_idx';

  return (
    <>
      {/* ── Portfolio header ── */}
      <div className="etf-instrument-header">
        <div>
          <div className="etf-instrument-name">Portfolio</div>
          <div className="etf-meta">
            <span>{INSTRUMENT_ISINS.length} instruments · equal weight</span>
            <span>· Benchmark: {BENCHMARK_LABEL}</span>
          </div>
        </div>
      </div>

      {/* ── Weights display ── */}
      <div className="etf-weights-row">
        {INSTRUMENT_ISINS.map(isin => (
          <div key={isin} className="etf-weight-badge">
            <strong>{INSTRUMENT_META[isin].shortName}</strong>
            {(PORTFOLIO_WEIGHTS[isin] * 100).toFixed(1)}%
          </div>
        ))}
      </div>

      {/* ── Performance chart ── */}
      <div className="etf-card">
        <div className="etf-card-header">
          <span>Portfolio Performance</span>
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
          {!allPerfLoaded && (
            <div className="etf-loading">
              <Spinner animation="border" size="sm" className="me-2" />
              Loading {loadedCount}/{INSTRUMENT_ISINS.length} instruments…
            </div>
          )}

          {allPerfLoaded && chartData.length === 0 && (
            <div className="etf-loading">Not enough data to compute portfolio performance.</div>
          )}

          {allPerfLoaded && chartData.length > 0 && (
            <>
              {stats && (
                <div className="etf-stats-row">
                  <div className="etf-stat">
                    <div className="etf-stat-label">Portfolio in {currency} ({actualRange ?? period.toUpperCase()})</div>
                    <div className={`etf-stat-value ${parseFloat(stats.portRet) >= 0 ? 'pos' : 'neg'}`}>
                      {parseFloat(stats.portRet) >= 0 ? '+' : ''}{stats.portRet}%
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
                    dataKey={perfDataKey}
                    name={chartMode === 'relative' ? `Portfolio vs ${BENCHMARK_LABEL}` : 'Portfolio'}
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
        </div>
      </div>

      {/* ── Blended sector exposure ── */}
      <div className="etf-card">
        <div className="etf-card-header">
          <span>Blended Sector Exposure</span>
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
          {!fundDataLoaded && (
            <div className="etf-loading">
              <Spinner animation="border" size="sm" className="me-2" />
              Loading sector data…
            </div>
          )}
          {fundDataLoaded && sectorView === 'absolute' && sectors.length === 0 && (
            <div className="etf-loading">No sector data available.</div>
          )}
          {fundDataLoaded && sectorView === 'absolute' && sectors.length > 0 && (
            <ResponsiveContainer width="100%" height={Math.max(200, sectors.length * 28)}>
              <BarChart data={sectors} layout="vertical" margin={{ top: 0, right: 40, left: 160, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={false} />
                <XAxis type="number" tickFormatter={v => `${v}%`}
                  tick={{ fill: '#bbb', fontSize: 11 }} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.18)' }} />
                <YAxis type="category" dataKey="name" width={155}
                  tick={{ fill: '#ddd', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip formatter={v => [`${v.toFixed(2)}%`, 'Weight']} contentStyle={CHART_TOOLTIP_STYLE} />
                <Bar dataKey="pct" fill="#198754" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
          {fundDataLoaded && sectorView === 'relative' && relativeSectors.length > 0 && (
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
        </div>
      </div>

      {/* ── Blended holdings ── */}
      <div className="etf-card">
        <div className="etf-card-header">
          <span>Blended Holdings</span>
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
          {!fundDataLoaded && (
            <div className="etf-loading">
              <Spinner animation="border" size="sm" className="me-2" />
              Loading holdings data…
            </div>
          )}
          {fundDataLoaded && holdingsView === 'absolute' && blendedHoldings.length > 0 && (
            <Table responsive size="sm" className="etf-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Name</th>
                  <th className="text-end">Blended Weight</th>
                </tr>
              </thead>
              <tbody>
                {blendedHoldings.slice(0, 25).map(h => (
                  <tr key={h.symbol}>
                    <td><span className="etf-sector-badge">{h.symbol}</span></td>
                    <td>{h.name}</td>
                    <td className="text-end">{h.weight.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          {fundDataLoaded && holdingsView === 'relative' && relativeHoldings.length > 0 && (
            <>
              <div className="etf-rel-note">vs {BENCHMARK_LABEL} · top 20 by absolute deviation · positive = overweight</div>
              <Table responsive size="sm" className="etf-table">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Name</th>
                    <th className="text-end">Portfolio %</th>
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
          {fundDataLoaded && blendedHoldings.length === 0 && holdingsView === 'absolute' && (
            <div className="etf-loading">No holdings data available.</div>
          )}
        </div>
      </div>
    </>
  );
}
