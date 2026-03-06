// Ordered list — defines tab order in the UI
export const INSTRUMENT_ISINS = [
  'IE0002Y8CX98',  // WisdomTree Europe Defence
  'CH0356550415',  // UBS CH USA Index  (proxy: SPY)
  'US26922A4206',  // Defiance Quantum ETF
  'CH0356507415',  // UBS CH Global Passive  (proxy: URTH)
  'LU0950674175',  // UBS Core MSCI EM
  'CH0106027128',  // UBS Gold hCHF
];

// Equal-weight portfolio (edit values here to change allocations)
export const PORTFOLIO_WEIGHTS = Object.fromEntries(
  INSTRUMENT_ISINS.map(isin => [isin, 1 / INSTRUMENT_ISINS.length])
);

// Frontend mirror of the backend INSTRUMENTS registry
// isProxy / proxyTicker are shown as a disclosure note in the UI
export const INSTRUMENT_META = {
  'IE0002Y8CX98': {
    name:         'WisdomTree Europe Defence UCITS ETF',
    shortName:    'EU Defence',
    hasFundData:  true,
    factSheetUrl: 'https://dataspanapi.wisdomtree.com/pdr/documents/FACTSHEET/UCITS/EU/EN-GB/IE0002Y8CX98/', // direct PDF
  },
  'CH0356550415': {
    name:         'UBS CH Equities USA Index A-acc',
    shortName:    'USA Index',
    hasFundData:  true,
    isProxy:      true,
    proxyTicker:  'EUSA',
    factSheetUrl: 'https://global.morningstar.com/api/v1/en-eu/investments/funds/F00000YNFN/documents/_document?documentId=52&languageId=en', // Morningstar direct PDF (Jan 2026)
  },
  'US26922A4206': {
    name:         'Defiance Quantum ETF',
    shortName:    'Quantum',
    hasFundData:  true,
    factSheetUrl: 'https://www.defianceetfs.com/wp-content/uploads/funddocs/qtum/QTUM-FactSheet.pdf', // direct PDF
  },
  'CH0356507415': {
    name:         'UBS CH Equities Global Passive A-acc',
    shortName:    'Global',
    hasFundData:  true,
    isProxy:      true,
    proxyTicker:  'URTH',
    factSheetUrl: 'https://global.morningstar.com/api/v1/en-eu/investments/funds/F00000YNFP/documents/_document?documentId=52&languageId=en', // Morningstar direct PDF (Jan 2026)
  },
  'LU0950674175': {
    name:         'UBS Core MSCI EM UCITS ETF',
    shortName:    'MSCI EM',
    hasFundData:  true,
    factSheetUrl: 'https://global.morningstar.com/api/v1/en-gb/investments/etfs/0P0001DK7Z/documents/_document?documentId=52&languageId=en', // Morningstar direct PDF (Jan 2026)
  },
  'CH0106027128': {
    name:         'UBS Gold hCHF ETF',
    shortName:    'Gold',
    hasFundData:  true,
    isCommodity:  true,
    factSheetUrl: 'https://global.morningstar.com/api/v1/en-eu/investments/etfs/0P0000MXOU/documents/_document?documentId=52&languageId=en', // Morningstar direct PDF (Jan 2026)
  },
};

export const BENCHMARK_LABEL = 'MSCI World (URTH)';
