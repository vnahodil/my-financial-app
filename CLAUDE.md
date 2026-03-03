# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack personal portfolio app ("Zmuda s.r.o.") with a React frontend and Python Flask backend.

## Commands

### Frontend (`frontend/`)
```bash
npm run dev      # Dev server with HMR
npm run build    # Production build
npm run lint     # ESLint (strict, 0 warnings tolerance)
npm run preview  # Preview production build
```

### Backend (`backend/`)
```bash
flask run                          # Dev server
gunicorn app:app --log-file=-      # Production server
```

### Database
```bash
docker-compose up -d   # Start PostgreSQL 15 container
flask db migrate       # Generate migration
flask db upgrade       # Apply migrations
```

## Architecture

### Frontend
- **React 19** with Vite + SWC, React Bootstrap, React Router Dom 7, Axios
- View switching is state-managed in [frontend/src/App.jsx](frontend/src/App.jsx) — not URL-based routing
- Views: `LandingPageView`, `ItemsView` (chat/messages), `ProfileView` (CV), `CookbookView` (markdown renderer)
- API base URL configured via `VITE_API_URL` env var (defaults to `http://127.0.0.1:5000`)
- Markdown content files are imported as raw strings via Vite's `?raw` import syntax

### Backend
- **Flask 3** with SQLAlchemy, Flask-Migrate (Alembic), Flask-CORS
- Single `Item` model (`id`, `name`, `description`) in [backend/app.py](backend/app.py)
- API endpoints: `GET/POST /api/items`, `GET /api/db-status`
- Uses PostgreSQL in production (via `DATABASE_URL` env var), SQLite fallback for dev
- CORS currently allows all origins

### Styling
- Dark glass-morphism theme: `rgba` backgrounds, `backdrop-filter: blur`, fixed background image
- Montserrat font, dark grays (#333–#555), light text (#eee), accent blue (#0d6efd)
- All custom styles in [frontend/src/App.css](frontend/src/App.css)

### Docker
- PostgreSQL 15 credentials: user `myuser`, password `mypassword`, db `mydatabase`
