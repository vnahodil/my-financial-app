# app.py
from flask import Flask, jsonify, request, Response
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.exc import OperationalError # Import specific exception
from flask_migrate import Migrate
from flask_cors import CORS
from config import Config
from datetime import datetime, timedelta
import os

try:
    import yfinance as yf
    import requests as http_requests
    YFINANCE_AVAILABLE = True
except ImportError:
    YFINANCE_AVAILABLE = False
    yf = None
    http_requests = None

# ── Instrument registry ───────────────────────────────────────────────────────
# resolve='isin'   → call Yahoo Finance search API using the ISIN
# resolve='direct' → use ticker directly (known, no lookup needed)
# resolve='proxy'  → use a proxy ticker that tracks the same index
#                    (used for Swiss institutional funds not listed on Yahoo Finance)

BENCHMARK_TICKER = 'URTH'   # iShares MSCI World ETF

FACTSHEET_URLS = {
    'IE0002Y8CX98': 'https://dataspanapi.wisdomtree.com/pdr/documents/FACTSHEET/UCITS/EU/EN-GB/IE0002Y8CX98/',
    'CH0356550415': 'https://global.morningstar.com/api/v1/en-eu/investments/funds/F00000YNFN/documents/_document?documentId=52&languageId=en',
    'US26922A4206': 'https://www.defianceetfs.com/wp-content/uploads/funddocs/qtum/QTUM-FactSheet.pdf',
    'CH0356507415': 'https://global.morningstar.com/api/v1/en-eu/investments/funds/F00000YNFP/documents/_document?documentId=52&languageId=en',
    'LU0950674175': 'https://global.morningstar.com/api/v1/en-gb/investments/etfs/0P0001DK7Z/documents/_document?documentId=52&languageId=en',
    'CH0106027128': 'https://global.morningstar.com/api/v1/en-eu/investments/etfs/0P0000MXOU/documents/_document?documentId=52&languageId=en',
}

INSTRUMENTS = {
    'IE0002Y8CX98': {
        'name':          'WisdomTree Europe Defence UCITS ETF',
        'resolve':       'isin',
        'ticker':        None,
        'has_fund_data': True,
    },
    'CH0356550415': {
        'name':            'UBS CH Equities USA Index A-acc',
        'resolve':         'proxy',
        'ticker':          'EUSA',      # iShares MSCI USA ETF — performance proxy
        'fund_data_ticker': 'IVV',     # iShares Core S&P 500 — fund data (EUSA data unreliable in yfinance)
        'has_fund_data':   True,
    },
    'US26922A4206': {
        'name':          'Defiance Quantum ETF',
        'resolve':       'direct',
        'ticker':        'QTUM',
        'has_fund_data': True,
    },
    'CH0356507415': {
        'name':          'UBS CH Equities Global Passive A-acc',
        'resolve':       'proxy',
        'ticker':        'URTH',      # MSCI World proxy
        'has_fund_data': True,
    },
    'LU0950674175': {
        'name':          'UBS Core MSCI EM UCITS ETF',
        'resolve':       'isin',
        'ticker':        None,
        'has_fund_data': True,
    },
    'CH0106027128': {
        'name':          'UBS Gold hCHF ETF',
        'resolve':       'direct',
        'ticker':        'AUCHAH.SW',
        'has_fund_data': True,
        'is_commodity':  True,
        'commodity_name': 'Gold',
    },
}

_ticker_cache   = {}   # in-process cache: {isin: ticker_str}
_currency_cache = {}   # in-process cache: {ticker: currency_str}

# Each value is "USD per 1 unit of that currency" (e.g. CHFUSD=X ≈ 1.13 means 1 CHF = 1.13 USD).
# GBP is needed because WisdomTree Europe Defence (WDEF.L) is listed on the LSE in GBP.
FX_TICKERS = {
    'CHF': 'CHFUSD=X',
    'EUR': 'EURUSD=X',
    'CZK': 'CZKUSD=X',
    'GBP': 'GBPUSD=X',
}


app = Flask(__name__)
app.config.from_object(Config)

db = SQLAlchemy(app)
migrate = Migrate(app, db)

# Example: Allow specific origin later
# origins = ["https://yourdomain.com", "https://www.yourdomain.com"] # Your production frontend URL(s)
# CORS(app, origins=origins, supports_credentials=True)
CORS(app) # Enable CORS for all routes

# --- Define Database Models (Example) ---
class Item(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), unique=True, nullable=False)
    description = db.Column(db.String(120))

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description
        }

# --- Define API Routes ---
@app.route('/')
def index():
    return "Hello from Flask Backend!"

# Example GET route
@app.route('/api/items', methods=['GET'])
def get_items():
    try:
        items = Item.query.all()
        return jsonify([item.to_dict() for item in items])
    except Exception as e:
        # Basic error handling
        return jsonify({"error": str(e)}), 500

# Example POST route
@app.route('/api/items', methods=['POST'])
def add_item():
    try:
        data = request.get_json()
        if not data or 'name' not in data:
            return jsonify({"error": "Missing 'name' in request body"}), 400

        new_item = Item(name=data['name'], description=data.get('description'))
        db.session.add(new_item)
        db.session.commit()
        return jsonify(new_item.to_dict()), 201 # 201 Created status
    except Exception as e:
        db.session.rollback() # Rollback in case of error
        return jsonify({"error": str(e)}), 500

# Route to check database connection status
@app.route('/api/db-status', methods=['GET'])
def db_status():
    try:
        # Try getting a connection from the engine pool
        connection = db.engine.connect()
        connection.close() # Close the connection immediately after successful check
        return jsonify({"connected": True, "message": "Database connection successful."})
    except OperationalError as e:
        # Handle specific connection errors (e.g., bad host, credentials)
        app.logger.error(f"Database connection failed: {e}") # Log the error
        return jsonify({"connected": False, "message": f"Database connection failed."}), 500
    except Exception as e:
        # Handle other potential errors during the check
        app.logger.error(f"Error checking DB status: {e}")
        return jsonify({"connected": False, "message": f"An error occurred while checking database status."}), 500


# ── ETF helpers ───────────────────────────────────────────────────────────────

def _resolve_etf_ticker(isin):
    """Look up a Yahoo Finance ticker by ISIN via the Yahoo search API."""
    try:
        resp = http_requests.get(
            'https://query2.finance.yahoo.com/v1/finance/search',
            params={'q': isin, 'quotesCount': 1, 'newsCount': 0},
            headers={'User-Agent': 'Mozilla/5.0'},
            timeout=5
        )
        quotes = resp.json().get('quotes', [])
        if quotes:
            return quotes[0]['symbol']
    except Exception as e:
        app.logger.warning(f'ISIN lookup failed: {e}')
    return None


def _get_ticker(isin):
    """
    Return (ticker, is_proxy) for the given ISIN using the INSTRUMENTS registry.
    Uses an in-process cache to avoid redundant Yahoo Finance searches.
    """
    instrument = INSTRUMENTS.get(isin)
    if not instrument:
        return None, False

    resolve = instrument['resolve']

    if resolve in ('direct', 'proxy'):
        return instrument['ticker'], (resolve == 'proxy')

    # resolve == 'isin'
    if isin in _ticker_cache:
        return _ticker_cache[isin], False

    ticker = _resolve_etf_ticker(isin)
    if ticker:
        _ticker_cache[isin] = ticker
    return ticker, False


def _get_currency(ticker):
    """Return the currency string for a resolved ticker, cached in-process."""
    if ticker in _currency_cache:
        return _currency_cache[ticker]
    try:
        ccy = yf.Ticker(ticker).info.get('currency', 'USD') or 'USD'
        _currency_cache[ticker] = ccy
        return ccy
    except Exception:
        return 'USD'


def _history_to_list(ticker_obj, start_str, end_str):
    """Fetch daily close prices as a list of {date, close} dicts."""
    hist = ticker_obj.history(start=start_str, end=end_str)
    return [
        {'date': idx.strftime('%Y-%m-%d'), 'close': round(float(row['Close']), 4)}
        for idx, row in hist.iterrows()
    ]


# ── ETF API routes ────────────────────────────────────────────────────────────

@app.route('/api/etf/instruments', methods=['GET'])
def etf_instruments():
    """Return the static instrument registry so the frontend has a single source of truth."""
    return jsonify({
        isin: {
            'name':         v['name'],
            'has_fund_data': v['has_fund_data'],
            'is_proxy':     v['resolve'] == 'proxy',
        }
        for isin, v in INSTRUMENTS.items()
    })


@app.route('/api/etf/performance', methods=['GET'])
def etf_performance():
    if not YFINANCE_AVAILABLE:
        return jsonify({'error': 'yfinance not installed. Run: pip install yfinance',
                        'etf': [], 'benchmark': [], 'etf_ticker': None}), 200

    isin = request.args.get('isin', 'LU0950674175')
    if isin not in INSTRUMENTS:
        return jsonify({'error': f'Unknown ISIN: {isin}', 'etf': [], 'benchmark': [],
                        'etf_ticker': None, 'isin': isin}), 200

    start_date = request.args.get('start_date')
    end_date   = request.args.get('end_date')
    if start_date and end_date:
        start_str = start_date
        end_str   = end_date
    else:
        period = request.args.get('period', '1y')
        period_to_days = {'1y': 365, '3y': 365 * 3, '5y': 365 * 5}
        days = period_to_days.get(period, 365)
        end = datetime.now()
        start = end - timedelta(days=days)
        start_str = start.strftime('%Y-%m-%d')
        end_str   = end.strftime('%Y-%m-%d')

    etf_ticker, is_proxy = _get_ticker(isin)
    if not etf_ticker:
        return jsonify({'error': 'Could not resolve ticker', 'etf': [], 'benchmark': [],
                        'etf_ticker': None, 'isin': isin, 'is_proxy': False}), 200

    etf_currency = _get_currency(etf_ticker)

    etf_data = []
    try:
        etf_data = _history_to_list(yf.Ticker(etf_ticker), start_str, end_str)
    except Exception as e:
        app.logger.warning(f'ETF history fetch failed ({etf_ticker}): {e}')

    bench_data = []
    try:
        bench_data = _history_to_list(yf.Ticker(BENCHMARK_TICKER), start_str, end_str)
    except Exception as e:
        app.logger.warning(f'Benchmark history fetch failed: {e}')

    return jsonify({
        'isin':               isin,
        'etf_ticker':         etf_ticker,
        'is_proxy':           is_proxy,
        'etf':                etf_data,
        'benchmark':          bench_data,
        'benchmark_ticker':   BENCHMARK_TICKER,
        'etf_currency':       etf_currency,
        'benchmark_currency': 'USD',
    })


def _fetch_fund_data_for_ticker(ticker):
    """Fetch sector weightings and top holdings for a ticker via yfinance funds_data.
    Returns (sectors, holdings, error_str_or_None)."""
    sectors  = []
    holdings = []
    try:
        fd = yf.Ticker(ticker).funds_data

        sw = fd.sector_weightings or {}
        sectors = [{'key': k, 'pct': round(v * 100, 2)} for k, v in sw.items() if v]

        df = fd.top_holdings
        if df is not None and not df.empty:
            df_reset = df.reset_index()
            col_map  = {c.lower().replace(' ', ''): c for c in df_reset.columns}
            sym_col  = col_map.get('symbol')
            name_col = col_map.get('holdingname') or col_map.get('name')
            pct_col  = col_map.get('holdingpercent') or col_map.get('percent')
            app.logger.info(f'top_holdings columns for {ticker}: {list(df_reset.columns)}')
            for i, row in df_reset.iterrows():
                symbol = str(row[sym_col]) if sym_col else str(i)
                name   = str(row[name_col]) if name_col else symbol
                pct    = float(row[pct_col]) if pct_col else 0.0
                holdings.append({'rank': i + 1, 'symbol': symbol, 'name': name,
                                  'weight': round(pct * 100, 2)})
    except Exception as e:
        return [], [], str(e)
    return sectors, holdings, None


@app.route('/api/etf/fund-data', methods=['GET'])
def etf_fund_data():
    if not YFINANCE_AVAILABLE:
        return jsonify({'error': 'yfinance not installed. Run: pip install yfinance',
                        'sectors': [], 'holdings': [], 'etf_ticker': None}), 200

    isin = request.args.get('isin', 'LU0950674175')
    instrument = INSTRUMENTS.get(isin)
    if not instrument:
        return jsonify({'error': f'Unknown ISIN: {isin}', 'sectors': [], 'holdings': [],
                        'etf_ticker': None, 'isin': isin}), 200

    etf_ticker, is_proxy = _get_ticker(isin)
    if not etf_ticker:
        return jsonify({'error': 'Could not resolve ticker', 'sectors': [], 'holdings': [],
                        'etf_ticker': None, 'isin': isin, 'is_proxy': False}), 200

    # Commodity instruments return synthetic 100 % exposure data
    if instrument.get('is_commodity'):
        commodity_name = instrument.get('commodity_name', 'Commodity')
        return jsonify({
            'isin':       isin,
            'etf_ticker': etf_ticker,
            'is_proxy':   is_proxy,
            'sectors':    [{'key': 'commodities', 'pct': 100.0}],
            'holdings':   [{'rank': 1, 'symbol': commodity_name,
                            'name': f'{commodity_name} (Physical)', 'weight': 100.0}],
        })

    fund_ticker = instrument.get('fund_data_ticker') or etf_ticker
    sectors, holdings, err = _fetch_fund_data_for_ticker(fund_ticker)
    if err:
        app.logger.error(f'fund-data fetch error ({isin}): {err}')
        return jsonify({'error': err, 'isin': isin, 'etf_ticker': etf_ticker,
                        'is_proxy': is_proxy, 'sectors': [], 'holdings': []}), 200

    return jsonify({
        'isin':             isin,
        'etf_ticker':       etf_ticker,
        'fund_data_ticker': fund_ticker if fund_ticker != etf_ticker else None,
        'is_proxy':         is_proxy,
        'sectors':          sectors,
        'holdings':         holdings,
    })


@app.route('/api/etf/benchmark-fund-data', methods=['GET'])
def etf_benchmark_fund_data():
    """Return sector weightings and top holdings for the benchmark (URTH)."""
    if not YFINANCE_AVAILABLE:
        return jsonify({'error': 'yfinance not installed', 'sectors': [], 'holdings': []}), 200

    sectors, holdings, err = _fetch_fund_data_for_ticker(BENCHMARK_TICKER)
    if err:
        app.logger.error(f'benchmark fund-data fetch error: {err}')
        return jsonify({'error': err, 'ticker': BENCHMARK_TICKER,
                        'sectors': [], 'holdings': []}), 200

    return jsonify({'ticker': BENCHMARK_TICKER, 'sectors': sectors, 'holdings': holdings})


@app.route('/api/etf/fx-rates', methods=['GET'])
def etf_fx_rates():
    """Return daily FX rates (USD per 1 unit of CHF/EUR/CZK) for the requested period."""
    if not YFINANCE_AVAILABLE:
        return jsonify({'error': 'yfinance not installed', 'rates': []}), 200

    start_date = request.args.get('start_date')
    end_date   = request.args.get('end_date')
    if start_date and end_date:
        start_str = start_date
        end_str   = end_date
    else:
        period = request.args.get('period', '1y')
        period_to_days = {'1y': 365, '3y': 365 * 3, '5y': 365 * 5}
        days = period_to_days.get(period, 365)
        end = datetime.now()
        start = end - timedelta(days=days)
        start_str = start.strftime('%Y-%m-%d')
        end_str   = end.strftime('%Y-%m-%d')

    fx_by_date = {}
    for ccy, fx_ticker in FX_TICKERS.items():
        try:
            hist = yf.Ticker(fx_ticker).history(start=start_str, end=end_str)
            for idx, row in hist.iterrows():
                date_str = idx.strftime('%Y-%m-%d')
                if date_str not in fx_by_date:
                    fx_by_date[date_str] = {'date': date_str}
                fx_by_date[date_str][ccy] = round(float(row['Close']), 6)
        except Exception as e:
            app.logger.warning(f'FX fetch failed for {fx_ticker}: {e}')

    rates = sorted(fx_by_date.values(), key=lambda d: d['date'])
    return jsonify({'rates': rates})


_FACTSHEET_DIR = os.path.join(os.path.dirname(__file__), '..', 'factsheets')
_FETCH_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'


@app.route('/api/etf/factsheet', methods=['GET'])
def etf_factsheet():
    isin = request.args.get('isin', '')
    if isin not in FACTSHEET_URLS:
        return jsonify({'error': f'Unknown ISIN: {isin}'}), 404

    filename = f'{isin}_fact_sheet.pdf'
    disposition = f'attachment; filename="{filename}"'

    # Try local cache first (required for Morningstar, which blocks plain HTTP)
    local_path = os.path.join(_FACTSHEET_DIR, filename)
    if os.path.isfile(local_path):
        with open(local_path, 'rb') as f:
            data = f.read()
        return Response(data, headers={'Content-Type': 'application/pdf',
                                       'Content-Disposition': disposition})

    # Fall back to upstream fetch (works for WisdomTree, Defiance, etc.)
    url = FACTSHEET_URLS[isin]
    try:
        r = http_requests.get(url, headers={'User-Agent': _FETCH_UA}, timeout=20)
    except Exception as e:
        return jsonify({'error': str(e)}), 502
    if r.status_code != 200 or r.content[:4] != b'%PDF':
        return jsonify({'error': f'upstream returned {r.status_code}'}), 502
    return Response(r.content, headers={'Content-Type': 'application/pdf',
                                        'Content-Disposition': disposition})


# You don't need the __main__ block if using `flask run`
# if __name__ == '__main__':
#     app.run(debug=True) # Debug will be handled by FLASK_DEBUG env var
