import { useState, useEffect } from 'react';
import axios from 'axios';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';

import { INSTRUMENT_ISINS, INSTRUMENT_META } from './etf/instruments.js';
import InstrumentTab from './etf/InstrumentTab.jsx';
import PortfolioTab from './etf/PortfolioTab.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';
const CURRENCIES = ['USD', 'CHF', 'EUR', 'CZK'];

function todayStr() { return new Date().toISOString().slice(0, 10); }
function yearsAgoStr(n) {
  const d = new Date(); d.setFullYear(d.getFullYear() - n); return d.toISOString().slice(0, 10);
}

export default function EtfView() {
  // Active tab: 'portfolio' or one of the ISINs
  const [activeTab, setActiveTab] = useState('portfolio');

  // Shared period/chartMode controls — preserved across tab switches
  const [period, setPeriod]       = useState('1y');
  const [chartMode, setChartMode] = useState('relative');

  // Custom date range (used when period === 'custom')
  const [customFrom, setCustomFrom] = useState(yearsAgoStr(2));
  const [customTo,   setCustomTo]   = useState(todayStr());

  // Display currency for all charts
  const [currency, setCurrency] = useState('USD');

  // Shared data caches — prevent re-fetching on tab switches
  // perfCache: { [isin]: { [cacheKey]: responseData | 'loading' | {error} } }
  // fundCache: { [isin]: responseData | 'loading' | {error} }
  // fxCache:   { [cacheKey]: [{date, CHF, EUR, CZK}] | 'loading' | {error} }
  const [perfCache, setPerfCache] = useState({});
  const [fundCache, setFundCache] = useState({});
  const [fxCache,   setFxCache]   = useState({});

  // Benchmark fund data (URTH sectors + holdings) — fetched once on mount
  const [benchmarkFundData, setBenchmarkFundData] = useState(null);

  // cacheKey uniquely identifies the time range for cache lookups
  const cacheKey = period === 'custom' ? `custom_${customFrom}_${customTo}` : period;
  // API params for the selected period
  const periodParams = period === 'custom'
    ? { start_date: customFrom, end_date: customTo }
    : { period };

  // Fetch benchmark (URTH) fund data once on mount
  useEffect(() => {
    axios.get(`${API_URL}/api/etf/benchmark-fund-data`)
      .then(res => setBenchmarkFundData(res.data))
      .catch(() => setBenchmarkFundData({ error: 'Failed to load benchmark data', sectors: [], holdings: [] }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch FX rates whenever cacheKey changes (cached per key)
  useEffect(() => {
    if (period === 'custom' && customFrom >= customTo) return;
    if (fxCache[cacheKey]) return;
    setFxCache(prev => ({ ...prev, [cacheKey]: 'loading' }));
    axios.get(`${API_URL}/api/etf/fx-rates`, { params: periodParams })
      .then(res => setFxCache(prev => ({ ...prev, [cacheKey]: res.data.rates })))
      .catch(() => setFxCache(prev => ({ ...prev, [cacheKey]: { error: 'FX fetch failed' } })));
  }, [cacheKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const sharedProps = {
    period, setPeriod,
    customFrom, setCustomFrom,
    customTo, setCustomTo,
    cacheKey, periodParams,
    chartMode, setChartMode,
    currency,
    fxCache,
    perfCache, setPerfCache,
    fundCache, setFundCache,
    benchmarkFundData,
  };

  return (
    <div className="etf-view">

      {/* ── Instrument switcher + currency selector ── */}
      <div className="etf-switcher">
        <Button
          variant={activeTab === 'portfolio' ? 'primary' : 'outline-secondary'}
          onClick={() => setActiveTab('portfolio')}
          className="etf-switcher-btn"
        >
          Portfolio
        </Button>
        <div className="etf-switcher-divider" />
        {INSTRUMENT_ISINS.map(isin => (
          <Button
            key={isin}
            variant={activeTab === isin ? 'primary' : 'outline-secondary'}
            onClick={() => setActiveTab(isin)}
            className="etf-switcher-btn"
          >
            {INSTRUMENT_META[isin].shortName}
          </Button>
        ))}
        <div className="etf-currency-selector">
          <ButtonGroup size="sm">
            {CURRENCIES.map(c => (
              <Button
                key={c}
                variant={currency === c ? 'primary' : 'outline-secondary'}
                onClick={() => setCurrency(c)}
                className="etf-period-btn"
              >
                {c}
              </Button>
            ))}
          </ButtonGroup>
        </div>
      </div>

      {/* ── Active panel ── */}
      {activeTab === 'portfolio'
        ? <PortfolioTab {...sharedProps} />
        : <InstrumentTab isin={activeTab} {...sharedProps} />
      }

    </div>
  );
}
