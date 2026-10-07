# Repository Guidelines

## Project Structure & Module Organization

This repository contains a FastAPI backend in `backend/` and a Vite React frontend in `finance-frontend/`. Backend entrypoints and helpers live in flat Python modules such as `main.py`, `services.py`, `models.py`, `schemas.py`, and `db.py`. Frontend source lives under `finance-frontend/src/`, with page components in `src/pages/`, reusable UI sections in `src/components/`, API helpers in `src/api.js`, and static assets in `src/assets/` or `public/`.

## Build, Test, and Development Commands

- `cd backend && uvicorn main:app --reload`: start the local API server.
- `cd finance-frontend && npm run dev`: start the Vite development server.
- `cd finance-frontend && npm run build`: create a production frontend build in `dist/`.
- `cd finance-frontend && npm run lint`: run ESLint over the React code.
- `cd finance-frontend && npm run preview`: serve the built frontend locally.

Install backend dependencies with `pip install -r backend/requirements.txt`. Install frontend dependencies with `npm install` from `finance-frontend/`.

## Coding Style & Naming Conventions

Python modules use snake_case filenames and functions. Keep FastAPI route handlers in `main.py`, shared business logic in `services.py`, Pydantic models in `schemas.py`, and SQLAlchemy models in `models.py`. React components use PascalCase filenames and exports, such as `TransactionsPage.jsx` and `AccountsSection.jsx`. Existing frontend code uses 4-space indentation, double quotes, and minimal semicolon usage; follow that style when editing nearby files.

## Testing Guidelines

There is no dedicated automated test suite or test script currently checked in. When adding backend tests, prefer `pytest` and place tests under `backend/tests/` using names like `test_transactions.py`. For frontend tests, add them near the relevant component or under `finance-frontend/src/__tests__/` once a test runner is introduced. Until tests exist, run `npm run lint`, exercise the affected UI locally, and verify relevant API endpoints manually.

## Commit & Pull Request Guidelines

Git history uses short, informal summaries such as `Added readme and other stuff` and `fixed some bugs with transaction adding display`. Keep new commits concise and imperative when possible, for example `Add account balance refresh`. Pull requests should include a brief description, manual test notes, linked issue when applicable, screenshots for UI changes, and any setup or migration steps.

## Security & Configuration Tips

Do not commit local databases, secrets, or real financial exports. Use `backend/.env.example` as the template for Plaid-related variables, and keep actual values in a local `.env` file.

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues for `feldian15/finance-tracker`; use the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the default triage label vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repo: read root `GLOSSARY.md` and `docs/adr/` when they exist. See `docs/agents/domain.md`.
