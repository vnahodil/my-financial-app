# Zmuda s.r.o. — Personal Portfolio

A full-stack personal portfolio web application for Stanislav Zmuda. Built with React on the frontend and Python Flask on the backend.

## Features

- **Landing page** — Hero section with name, title, and a direct link to the CV view.
- **CV / Profile** — Displays work experience, education, skills with progress bars, and contact links (LinkedIn, GitHub, email).
- **Chat / Leave a message** — Visitors can submit messages that are stored in the database and listed in real time.
- **Cookbook** — Renders a Markdown file (`frontend/src/assets/Cookbook.md`) with GitHub-Flavored Markdown support including tables.

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React 19, Vite, React Bootstrap, Axios, React Markdown |
| Backend | Python Flask 3, SQLAlchemy, Flask-Migrate, Flask-CORS |
| Database | PostgreSQL 15 (Docker) · SQLite fallback for local dev |
| Deployment | Gunicorn · Procfile (Heroku-compatible) |

## Getting Started

### Prerequisites

- Node.js (for the frontend)
- Python 3.8+ with `pip` (for the backend)
- Docker (for PostgreSQL)

### 1. Start the database

```bash
docker-compose up -d
```

### 2. Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create a `backend/.env` file:

```env
DATABASE_URL=postgresql://myuser:mypassword@localhost:5432/mydatabase
SECRET_KEY=your-secret-key
FLASK_DEBUG=1
```

Run migrations and start the server:

```bash
flask db upgrade
flask run
```

The backend runs at `http://127.0.0.1:5000`.

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173`.

To point the frontend at a different backend URL, set `VITE_API_URL` in a `frontend/.env` file:

```env
VITE_API_URL=http://127.0.0.1:5000
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Health check |
| `GET` | `/api/items` | Fetch all messages |
| `POST` | `/api/items` | Submit a new message (`{ "name": "..." }`) |
| `GET` | `/api/db-status` | Database connection check |

## Project Structure

```
my-financial-app/
├── backend/
│   ├── app.py          # Flask app, models, routes
│   ├── config.py       # Environment-based config
│   ├── requirements.txt
│   └── migrations/     # Alembic migrations
├── frontend/
│   ├── src/
│   │   ├── App.jsx             # Navigation & view routing
│   │   ├── LandingPageView.jsx
│   │   ├── ProfileView.jsx
│   │   ├── ItemsView.jsx       # Chat / message board
│   │   ├── CookbookView.jsx
│   │   └── assets/Cookbook.md  # Cookbook content
│   └── package.json
└── docker-compose.yml  # PostgreSQL service
```

## Deployment

The backend includes a `Procfile` for Heroku-compatible platforms:

```
web: gunicorn app:app --log-file=-
```

Set `DATABASE_URL` and `SECRET_KEY` as environment variables in your hosting platform. Update the CORS origin whitelist in `backend/app.py` to your production frontend URL before deploying.
