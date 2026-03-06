import { useState, useEffect } from 'react';
import axios from 'axios';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';

import { INSTRUMENT_ISINS, INSTRUMENT_META } from './etf/instruments.js';
import InstrumentTab from './etf/InstrumentTab.jsx';
import PortfolioTab from './etf/PortfolioTab.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';
const CURRENCIES = ['USD', 'CHF', 'EUR', 'CZK'];

export default function EtfView() {
  // Active tab: 'portfolio' or one of the ISINs
  const [activeTab, setActiveTab] = useState('portfolio');

  // Shared period/chartMode controls — preserved across tab switches
  const [period, setPeriod]       = useState('1y');
  const [chartMode, setChartMode] = useState('relative');

  // Display currency for all charts
  const [currency, setCurrency] = useState('USD');

  // Shared data caches — prevent re-fetching on tab switches
  // perfCache: { [isin]: { [period]: responseData | 'loading' | {error} } }
  // fundCache: { [isin]: responseData | 'loading' | {error} }
  // fxCache:   { [period]: [{date, CHF, EUR, CZK}] | 'loading' | {error} }
  const [perfCache, setPerfCache] = useState({});
  const [fundCache, setFundCache] = useState({});
  const [fxCache,   setFxCache]   = useState({});

  // Benchmark fund data (URTH sectors + holdings) — fetched once on mount
  const [benchmarkFundData, setBenchmarkFundData] = useState(null);

  // Fetch benchmark (URTH) fund data once on mount
  useEffect(() => {
    axios.get(`${API_URL}/api/etf/benchmark-fund-data`)
      .then(res => setBenchmarkFundData(res.data))
      .catch(() => setBenchmarkFundData({ error: 'Failed to load benchmark data', sectors: [], holdings: [] }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch FX rates whenever period changes (cached per period)
  useEffect(() => {
    if (fxCache[period]) return;
    setFxCache(prev => ({ ...prev, [period]: 'loading' }));
    axios.get(`${API_URL}/api/etf/fx-rates`, { params: { period } })
      .then(res => setFxCache(prev => ({ ...prev, [period]: res.data.rates })))
      .catch(() => setFxCache(prev => ({ ...prev, [period]: { error: 'FX fetch failed' } })));
  }, [period]); // eslint-disable-line react-hooks/exhaustive-deps

  const sharedProps = {
    period, setPeriod,
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
