# Fantasy Sports Autopilot — Full Deployment Walkthrough

A complete guide to going from zero to a fully automated, cloud-deployed fantasy football pipeline. This covers Phase 1 (local development) and Phase 2 (AWS deploy) with every command, every concept, and every gotcha we hit along the way.

**Repository paths:** Run `docker compose` from the repository root. Run Python, Alembic, `scripts/*.py`, and `./build_lambda.sh` from the `backend/` directory.

---

## What We Built

A fully automated fantasy football pipeline that:

1. Fetches player data and weekly projections from the **Sleeper API**
2. Stores everything in **PostgreSQL**
3. Runs a **greedy lineup optimizer** to pick the best 9 starters
4. Runs automatically every Tuesday via **AWS EventBridge → Lambda**
5. Persists results in **AWS RDS**

**Stack:** Python 3.11 · PostgreSQL · Docker · SQLAlchemy · Alembic · FastAPI · AWS Lambda · AWS RDS · AWS EventBridge · AWS IAM

---

## Phase 1 — Local Setup

### Why Local First?

Always validate your pipeline locally before touching the cloud. AWS charges money, has more moving parts, and is harder to debug. Get it working on your machine first — then deploy with confidence.

### Step 1 — Spin Up PostgreSQL with Docker

```bash
docker compose up -d
```

**What this does:** Pulls the `postgres:15` image and starts a containerized PostgreSQL server running silently in the background.

**The `-d` flag** means "detached mode" — Docker runs in the background and hands your terminal back to you immediately. Without `-d`, your terminal gets hijacked by live logs.

**Key concepts:**
- **Docker image** — a blueprint (postgres:15 = Postgres version 15)
- **Docker container** — a running instance of that image
- **Volume** — persistent storage that survives container restarts (your data doesn't disappear when you stop Docker)
- **Port mapping** (`5432:5432`) — maps your Mac's port 5432 to the container's port 5432 so your app can reach it

**Gotcha we hit:** Two Postgres containers running at the same time (Airflow also had one on port 5432). The fix was changing our fantasy Postgres to port 5433 in `docker-compose.yml`:

```yaml
ports:
  - "5433:5432"   # Mac port 5433 → container port 5432
```

And updating `.env` to match:
```
DATABASE_URL=postgresql://fantasyuser:localpassword@localhost:5433/fantasy_db
```

**Check your running containers:**
```bash
docker ps
```

### Step 2 — Set Up the Python Virtual Environment

```bash
# Create venv with Python 3.11 explicitly
/opt/homebrew/opt/python@3.11/bin/python3.11 -m venv .venv

# Activate it
source .venv/bin/activate

# Confirm version
python --version  # Should say Python 3.11.x

# Install all dependencies
pip install -r requirements.txt -r requirements-dev.txt
```

**Why 3.11 explicitly?** The project's dependencies (`psycopg2-binary`, `pydantic-core`) don't have pre-built wheels for Python 3.14 yet. Using the wrong Python version causes pip to try compiling from source — and that fails hard. Always match the Python version your project expects.

**Key concepts:**
- **Virtual environment** — an isolated Python sandbox. Packages installed here don't affect your system Python or other projects.
- **`source .venv/bin/activate`** — activates the venv. Your prompt shows `(.venv)` when it's active.
- **`requirements.txt`** — pinned production dependencies
- **`requirements-dev.txt`** — additional packages for testing/development

**If you don't have Python 3.11:**
```bash
brew install python@3.11
```

### Step 3 — Run Database Migrations

```bash
alembic upgrade head
```

**What this does:** Alembic reads your migration files and creates the database tables (`players`, `player_stats`, `lineups`, `lineup_players`).

**Key concepts:**
- **Alembic** — a database migration tool for SQLAlchemy. Think of it as version control for your database schema.
- **`upgrade head`** — run all pending migrations up to the latest version
- **Migration file** — a Python script that describes a schema change (create table, add column, etc.)

**Gotcha we hit:** Alembic couldn't connect because the `.env` file had the wrong `DATABASE_URL`. Always verify your connection string matches what's in `docker-compose.yml`:

```
DATABASE_URL=postgresql://fantasyuser:localpassword@localhost:5433/fantasy_db
#                         ^user        ^password     ^host      ^port ^database
```

### Step 4 — Seed the Database

```bash
python scripts/seed_db.py
```

Loads 3,177 fantasy-relevant NFL players from the Sleeper API into your local database.

**Output:**
```
Upserted 3177 fantasy-relevant players.
```

### Step 5 — Run the Full Pipeline Locally

```bash
python scripts/run_local.py
```

**Success looks like:** A JSON blob with 9 starters and a total projected points number:

```json
{
  "status": "success",
  "week": 18,
  "season": 2025,
  "lineup": {
    "starters": [
      {"slot": "QB", "name": "Jaxson Dart", "projected_points": 24.25},
      {"slot": "RB1", "name": "Jahmyr Gibbs", "projected_points": 22.07},
      ...
    ],
    "total_projected_points": 167.76
  }
}
```

If you see this — **Phase 1 is done.** Your local pipeline is fully working.

---

## Phase 2 — AWS Deploy

### The Architecture

```
EventBridge (cron: every Tuesday 9am UTC)
    ↓
Lambda Function (fantasy-autopilot)
    ↓  fetches from
Sleeper API
    ↓  stores in
RDS PostgreSQL (fantasy-autopilot-db)
```

### Prerequisites

```bash
# Verify AWS CLI is installed and configured
aws sts get-caller-identity
```

Should return your `UserId`, `Account`, and `Arn`. If it errors, run `aws configure` first.

---

### Step 1 — Create the IAM Role for Lambda

**Why:** Lambda needs permission to run. AWS won't let a function execute without an IAM role that explicitly allows it.

```bash
aws iam create-role \
  --role-name fantasy-autopilot-lambda-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "lambda.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'
```

Then attach the basic execution policy (allows Lambda to write logs to CloudWatch):

```bash
aws iam attach-role-policy \
  --role-name fantasy-autopilot-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
```

No output = success.

**Key concepts:**
- **IAM Role** — an identity with specific permissions. Lambda assumes this role when it runs.
- **Trust policy** — the `assume-role-policy-document` says "Lambda is allowed to use this role"
- **`AWSLambdaBasicExecutionRole`** — a managed AWS policy that gives Lambda permission to write logs

---

### Step 2 — Spin Up RDS PostgreSQL

```bash
aws rds create-db-instance \
  --db-instance-identifier fantasy-autopilot-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15 \
  --master-username fantasyuser \
  --master-user-password localpassword \
  --db-name fantasy_db \
  --allocated-storage 20 \
  --no-multi-az \
  --publicly-accessible
```

This returns immediately but RDS takes **5-10 minutes** to provision. Check status:

```bash
aws rds describe-db-instances \
  --db-instance-identifier fantasy-autopilot-db \
  --query 'DBInstances[0].DBInstanceStatus'
```

Wait until you see `"available"`, then grab the endpoint:

```bash
aws rds describe-db-instances \
  --db-instance-identifier fantasy-autopilot-db \
  --query 'DBInstances[0].Endpoint.Address'
```

Save that hostname — you'll use it everywhere.

**Key concepts:**
- **RDS** — AWS's managed relational database service. AWS handles backups, patching, and availability.
- **`db.t3.micro`** — the smallest (and cheapest) instance type. Fine for dev/personal projects.
- **`--publicly-accessible`** — allows connections from outside the VPC (needed for running migrations from your local machine)
- **`--no-multi-az`** — single availability zone (cheaper, fine for non-critical workloads)

---

### Step 3 — Package and Deploy the Lambda Function

```bash
# Activate your venv first
source .venv/bin/activate

# Build the zip package
./build_lambda.sh
```

**What `build_lambda.sh` does:** Installs all dependencies into a `lambda_package/` folder, copies your Lambda code, and zips everything into `lambda_function.zip`.

**Deploy to AWS:**

```bash
aws lambda create-function \
  --function-name fantasy-autopilot \
  --runtime python3.11 \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/fantasy-autopilot-lambda-role \
  --handler handler.lambda_handler \
  --zip-file fileb://lambda_function.zip \
  --timeout 300 \
  --memory-size 256
```

**Key concepts:**
- **Lambda** — serverless compute. Your code runs on demand without managing servers.
- **Handler** — `handler.lambda_handler` means "in `handler.py`, call the `lambda_handler` function"
- **`--timeout 300`** — Lambda will run for up to 5 minutes before killing the function
- **`fileb://`** — tells the CLI to treat the value as a binary file path

**Critical gotcha — Mac vs Linux binaries:**

`psycopg2-binary` compiled on Mac won't run on Lambda (Linux). Fix:

```bash
# Download the Linux version
pip install \
  --platform manylinux2014_x86_64 \
  --target ./lambda_package_linux \
  --implementation cp \
  --python-version 3.11 \
  --only-binary=:all: \
  psycopg2-binary

# Replace the Mac version in your package
rm -rf lambda_package/psycopg2*
cp -r lambda_package_linux/psycopg2* lambda_package/

# Rezip
cd lambda_package && zip -r ../lambda_function.zip . && cd ..

# Redeploy
aws lambda update-function-code \
  --function-name fantasy-autopilot \
  --zip-file fileb://lambda_function.zip
```

---

### Step 4 — Set Environment Variables on Lambda

```bash
aws lambda update-function-configuration \
  --function-name fantasy-autopilot \
  --environment "Variables={
    DATABASE_URL=postgresql://fantasyuser:localpassword@YOUR_RDS_ENDPOINT:5432/fantasy_db,
    SLEEPER_BASE_URL=https://api.sleeper.app/v1,
    NFL_SEASON=2025
  }"
```

**Why:** Lambda has no `.env` file. Environment variables are how you pass config/secrets to a Lambda function. Never hardcode credentials in your code.

---

### Step 5 — Run Migrations Against RDS

```bash
DATABASE_URL=postgresql://fantasyuser:localpassword@YOUR_RDS_ENDPOINT:5432/fantasy_db alembic upgrade head
```

**Important:** The `DATABASE_URL=...` prefix must be on the **same line** as `alembic`. This temporarily overrides the value in your `.env` file for just that command.

Success output:
```
INFO  Running upgrade -> 001_initial, Initial schema: players, player_stats, lineups, lineup_players.
```

**Gotcha we hit:** RDS security group was blocking connections. Fix — open port 5432:

```bash
# Get your RDS security group ID
aws rds describe-db-instances \
  --db-instance-identifier fantasy-autopilot-db \
  --query 'DBInstances[0].VpcSecurityGroups[0].VpcSecurityGroupId'

# Open port 5432 to the world (fine for dev, lock it down for prod)
aws ec2 authorize-security-group-ingress \
  --group-id YOUR_SG_ID \
  --protocol tcp \
  --port 5432 \
  --cidr 0.0.0.0/0
```

---

### Step 6 — Test Lambda Invoke Manually

```bash
aws lambda invoke \
  --function-name fantasy-autopilot \
  --payload '{}' \
  --cli-binary-format raw-in-base64-out \
  response.json && cat response.json
```

**Success** = `statusCode: 200` with a full lineup JSON.  
**Failure** = `FunctionError: Unhandled` — always `cat response.json` to see the actual error message.

---

### Step 7 — Wire Up EventBridge Schedule

Create the cron rule (every Tuesday at 9:00 UTC):

```bash
aws events put-rule \
  --name fantasy-autopilot-weekly \
  --schedule-expression "cron(0 9 ? * TUE *)" \
  --state ENABLED
```

Give EventBridge permission to invoke your Lambda:

```bash
aws lambda add-permission \
  --function-name fantasy-autopilot \
  --statement-id eventbridge-weekly \
  --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn arn:aws:events:us-east-1:YOUR_ACCOUNT_ID:rule/fantasy-autopilot-weekly
```

Connect the rule to Lambda:

```bash
aws events put-targets \
  --rule fantasy-autopilot-weekly \
  --targets "Id=fantasy-autopilot,Arn=arn:aws:lambda:us-east-1:YOUR_ACCOUNT_ID:function:fantasy-autopilot"
```

`FailedEntryCount: 0` = success.

**Key concepts:**
- **EventBridge** — AWS's event bus and scheduler. Think of it as a cloud-based cron job.
- **`cron(0 9 ? * TUE *)`** — AWS cron syntax: minute=0, hour=9, any day-of-month, any month, Tuesday, any year
- **`put-targets`** — connects the trigger (EventBridge rule) to the action (Lambda function)

---

## Key Concepts Summary

| Concept | What It Is | Why It Matters |
|---|---|---|
| Virtual environment | Isolated Python sandbox | Prevents dependency conflicts between projects |
| Alembic migration | Version-controlled schema change | Reproducible database setup across environments |
| Docker detached mode (`-d`) | Background container | Frees your terminal while services run |
| IAM Role | AWS identity with permissions | Everything in AWS needs explicit permission |
| Lambda | Serverless function | Runs your code without managing servers |
| RDS | Managed PostgreSQL | AWS handles backups, patching, availability |
| Security Group | AWS firewall | Controls what traffic can reach your resources |
| EventBridge cron | Cloud scheduler | Triggers Lambda automatically on a schedule |
| Environment variables | Runtime config/secrets | Keep credentials out of your code |

---

## Common Errors and Fixes

| Error | Cause | Fix |
|---|---|---|
| `command not found: alembic` | venv not activated | `source .venv/bin/activate` |
| `role "fantasyuser" does not exist` | Wrong DATABASE_URL | Match URL to docker-compose.yml credentials |
| `No module named 'psycopg2._psycopg'` | Mac binary in Lambda | Reinstall psycopg2 with `--platform manylinux2014_x86_64` |
| `Connection timed out` to RDS | Security group blocking port 5432 | `aws ec2 authorize-security-group-ingress` |
| `relation "players" does not exist` | Migrations not run against RDS | Run alembic with RDS DATABASE_URL prefixed |
| `Python 3.14 build failures` | Wrong Python version for venv | `python3.11 -m venv .venv` explicitly |
| `Port conflict on 5432` | Two Postgres containers | Change one to 5433 in docker-compose.yml |
