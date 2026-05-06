# LineupOS

Weekly fantasy football lineup automation with a production-style data pipeline and dashboard.

LineupOS ingests Sleeper player data, stores weekly stats and projections, and generates optimized lineups on a schedule. It exposes the results through a FastAPI backend and a React dashboard for lineup review, player ranking, and historical stat inspection. The project demonstrates practical backend API design, scheduled data processing, relational modeling, and cloud deployment patterns that mirror real-world services.

## Architecture

```text
Sleeper API -> AWS Lambda -> PostgreSQL (RDS)
                  |
             EventBridge
             (Tues 9AM)
                  |
               FastAPI (local/App Runner)
                  |
             React Dashboard
```

## Tech Stack

| Layer | Technology |
| --- | --- |
| Language | Python 3.11, JavaScript (ES6+) |
| Backend API | FastAPI, SQLAlchemy, Pydantic |
| Database | PostgreSQL (Docker locally, AWS RDS in cloud) |
| Frontend | React + Vite + Tailwind CSS + React Query |
| Scheduled Worker | AWS Lambda |
| Scheduling | AWS EventBridge |

## Local Setup

```bash
git clone https://github.com/mosesvk/lineup_os.git
cd lineup_os
cp backend/.env.example backend/.env
docker compose up -d
cd backend
/opt/homebrew/bin/python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt -r requirements-dev.txt
alembic upgrade head
python scripts/seed_db.py
uvicorn app.main:app --reload
cd ../frontend
npm install
npm run dev
```

## Starting Services After Initial Setup

If Docker, Python dependencies, and npm packages are already installed, use these commands to start everything again:

```bash
# from repo root
docker compose up -d
```

Backend API:

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload
```

If backend commands fail after a restart (for example `uvicorn: command not found` or `bad interpreter`), recreate the backend virtual environment:

```bash
cd backend
rm -rf .venv
/opt/homebrew/bin/python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt -r requirements-dev.txt
uvicorn app.main:app --reload
```

Frontend dashboard (new terminal):

```bash
cd frontend
npm run dev
```

## AWS Deploy

1. Provision PostgreSQL on RDS and apply migrations against the RDS `DATABASE_URL`.
2. Package the worker with `cd backend && ./build_lambda.sh`.
3. Deploy/update the Lambda function (`handler.lambda_handler`) with the new zip.
4. Add environment variables (at minimum `DATABASE_URL`) to Lambda.
5. Create an EventBridge rule for Tuesday execution and attach the Lambda target.
6. Verify execution with `aws lambda invoke` and inspect CloudWatch logs.

## Project Structure

```text
lineup_os/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   └── routers/
│   ├── lambda/
│   │   └── handler.py
│   ├── scripts/
│   └── alembic/
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   └── pages/
├── docs/
├── infra/
└── docker-compose.yml
```

## How It Works

- AWS Lambda fetches current NFL context and applies offseason fallback logic when needed.
- The ingest pipeline pulls Sleeper players and weekly projections, then upserts into PostgreSQL.
- The optimizer builds a valid lineup by slot constraints and projected points.
- FastAPI exposes lineup and player/stat endpoints used by the frontend.
- The React dashboard presents current or historical lineup views, sortable player projections, and per-player weekly stat history.
