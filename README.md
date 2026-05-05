# Fantasy Sports Autopilot

Weekly fantasy football lineup automation with a production-style data pipeline and dashboard.

Fantasy Sports Autopilot ingests Sleeper player data, stores weekly stats and projections, and generates optimized lineups on a schedule. It exposes the results through a FastAPI backend and a React dashboard for lineup review, player ranking, and historical stat inspection. The project demonstrates practical backend API design, scheduled data processing, relational modeling, and cloud deployment patterns that mirror real-world services.

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
git clone https://github.com/mosesvk/fantasy_sports_autopilot.git
cd fantasy_sports_autopilot
cp backend/.env.example backend/.env
docker compose up -d
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
alembic upgrade head
python scripts/seed_db.py
uvicorn app.main:app --reload
cd ../frontend
npm install
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
fantasy_sports_autopilot/
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
