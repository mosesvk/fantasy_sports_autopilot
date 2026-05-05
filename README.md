# Fantasy Sports Autopilot

End-to-end **fantasy football** workflow: **Sleeper** data → **PostgreSQL** → greedy **lineup optimizer** → optional **AWS Lambda** on a schedule, plus a **FastAPI** read API and **React (Vite)** dashboard.

## Stack (from the project blueprint)

| Layer        | Technology                          |
| ------------ | ----------------------------------- |
| Data         | Python + Sleeper public API         |
| Storage      | PostgreSQL (local Docker or AWS RDS) |
| Logic        | Python optimizer + SQLAlchemy       |
| Schedule     | AWS EventBridge (Tue 9:00 UTC)      |
| Runtime      | AWS Lambda (Python 3.11)            |
| API          | FastAPI                             |
| Dashboard    | React + Vite + Tailwind             |

## Prerequisites

- **Python 3.11–3.13** (recommended for pinned deps; CI uses 3.11)
- **Docker** for local Postgres
- **Node 20+** for the frontend

## Quick start (local)

1. **Postgres**

   ```bash
   docker compose up -d
   ```

2. **Backend env**

   ```bash
   cp backend/.env.example backend/.env
   ```

3. **Migrations**

   ```bash
   cd backend
   python -m venv .venv && source .venv/bin/activate
   pip install -r requirements.txt -r requirements-dev.txt
   alembic upgrade head
   ```

4. **Seed players & run pipeline**

   ```bash
   python scripts/seed_db.py
   python scripts/run_local.py
   ```

   Or trigger via API after starting the server:

   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   curl -X POST http://localhost:8000/api/trigger
   ```

5. **API docs**

   Open `http://localhost:8000/docs`

6. **Frontend**

   ```bash
   cd frontend
   cp .env.example .env.local
   npm install
   npm run dev
   ```

   With defaults, Vite proxies `/api` to `http://localhost:8000`. Set `VITE_API_URL` if you run the API elsewhere.

## Layout

See `backend/app/` (FastAPI), `backend/lambda/` (scheduled worker), `frontend/`, `infra/`, and `.github/workflows/` for CI.

## Sleeper API note

Full weekly **stats** and **projections** with fantasy points use the `regular` season path, for example:

- `GET https://api.sleeper.app/v1/projections/nfl/regular/{season}/{week}`
- `GET https://api.sleeper.app/v1/stats/nfl/regular/{season}/{week}`

The blueprint’s shorter URLs remain documented for reference; the implementation follows Sleeper’s current response shapes.

## Lambda packaging

From `backend/`:

```bash
./build_lambda.sh
```

Produces `lambda_function.zip` including `app/` and `lambda/*.py`. Set Lambda handler to **`handler.lambda_handler`**.

## AWS (outline)

Use the AWS CLI samples from the blueprint PDF for RDS, Lambda (`python3.11`, timeout 300s), EventBridge cron `cron(0 9 ? * TUE *)`, IAM (`AWSLambdaBasicExecutionRole`, RDS connectivity / scoped policies), and environment variable **`DATABASE_URL`** on the function.

## CI

GitHub Actions runs backend **pytest** and frontend **`npm run build`** on push/PR.
