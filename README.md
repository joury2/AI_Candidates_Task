# AI Support Ticket Triage Task

## Objective
Build a small full-stack app that triages a support message using an LLM and stores the result in PostgreSQL.

**You will fork this repo and submit your fork URL.**

## Tech stack
- Frontend: React (Vite)
- Backend: Node.js, Express.js
- Database: PostgreSQL (local)
- AI: Any LLM provider (OpenAI, Anthropic, or local)

## Deliverables

### Backend
Implement:
- `POST /triage`
- `GET /triage/:id`
- `GET /triage?limit=10`

### Frontend
Implement:
- Text area input
- Submit to backend
- Show result
- Show last 10 items
- Loading and error states

### Documentation
- Update this README with decisions and tradeoffs
- Add a short section describing:
  - Prompt design
  - Known failure cases

### Demo
5 minutes:
- run locally
- paste input
- show output
- show recent items



## API contract

### POST /triage
Input:
```json
{ "text": "..." }
```

Output:
```json
{
  "title": "string",
  "category": "billing | technical | account | other",
  "priority": "low | medium | high",
  "summary": "string",
  "suggested_response": "string",
  "confidence": 0.0
}
```

Guardrails:
- Reject empty input
- Reject text longer than 4000 chars
- If confidence < 0.6, keep the output but make it clear it needs human review

## First-time setup

### 1) Install Node.js (18+)

Check:
```powershell
node -v
npm -v
```
If you do not have Node, Download `Node.js` from the [Official website](https://nodejs.org/en/download)

### 2) Install PostgreSQL (local)

Check:

```powershell
psql --version
```
If this works, skip to Create database.

#### **PostgreSQL setup on Windows**

Download installer from [Official website](https://www.postgresql.org/download/windows/)

During install:
- Keep PostgreSQL Server checked
- Keep Command Line Tools checked
- Remember the password for user `postgres`
- Keep default port `5432`

Verify in PowerShell:

```powershell
psql --version
```
---
If you Installed pgAdmin 4 (PostgreSQL Editor), and still show this error when run in the powershell:

```powershell
psql : The term 'psql' is not recognized as the name of a cmdlet, function, script file, or operable program. Check the spelling of the name, or if a path was included, verify that the path is 
correct and try again.
At line:1 char:1
+ psql --version
+ ~~~~
    + CategoryInfo          : ObjectNotFound: (psql:String) [], CommandNotFoundException
    + FullyQualifiedErrorId : CommandNotFoundException
```

make these checks to solve the issues:

##### 2.1) Verify PostgreSQL service is running

- Open **Services** in Windows
- Find PostgreSQL x64 18 (or 17)
- Status must be Running
- Start it if needed

##### 2.2) Ensure `psql` is in PATH

There are two options:

1. In the `file explorer`, go to this directory `C:\Program Files\PostgreSQL\18\bin` and check if `psql.exe` there.
2. using the Powershell in the VSCode to verify the file using this command:

```powershell
dir "C:\Program Files\PostgreSQL\18\bin\psql.exe"
```

if it prints like this:
```powershell

    
    Directory: C:\Program Files\PostgreSQL\18\bin


Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
-a----        12/12/2025  12:18 PM         647680 psql.exe
```
then the file is there, it is not, then re-install the program.

##### 2.3) Ensure `bin` folder in the enviroment variables
1. Open Start
2. Search `Environment Variables`
3. Open `Edit the system environment variables`
4. Click `Environment Variables`
5. Under System variables, select `Path`
6. Click `Edit`
7. Click `New`
8. Paste the path, example:
```makefile
C:\Program Files\PostgreSQL\18\bin
```
9. Click `OK` everywhere

##### 2.4) Check PATH values
Run:

```powershell
[Environment]::GetEnvironmentVariable("Path","User")
[Environment]::GetEnvironmentVariable("Path","Machine")
```
At least one of them must include:

```makefile
C:\Program Files\PostgreSQL\18\bin
```

##### 2.5) VS Code terminal fix (important)

If you use the VS Code integrated terminal, it may not pick up PATH changes.

Do this:

1. Press `Ctrl + Shift + P` or `F1`
2. Run `Terminal: Kill All Terminals`
3. Run `Developer: Reload Window`
4. Open a new terminal

Then test:

```powershell
psql --version
```

**if `psql` is still not recognized (force refresh)**

Run this inside the terminal:

```powershell
$env:Path = [Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [Environment]::GetEnvironmentVariable("Path","User")
where.exe psql
psql --version
```
This refreshes PATH for the current session.

---

#### **macOS (Homebrew)**

If you do not have Homebrew, install it first.

Install PostgreSQL:

```bash
brew install postgresql@18
```

Start PostgreSQL:

```bash
brew services start postgresql@18
```

Verify:

```bash
psql --version
```
---

### 3) Create Database
Run this in the powershell

```powershell
createdb ai_triage -U postgres
```
From repo root, Apply the schema:

```powershell
psql -U postgres -d ai_triage -f db/schema.sql
```

Verify database:

```powershell
psql -U postgres -d ai_triage -c "\dt"
```
You should see:
- `TriageRequests`


## Submission
- Fork this repository
- Push your implementation to your fork
- Share the fork URL
- Be ready to demo in 5 minutes

## Notes
- Keep the solution simple
- Do not add auth, deployment, Docker, or CI
- Put your prompt in backend code

## YOUR_SUMISSION - (joury alzayat)
########################################################################################

## Overview

This project is a small full‑stack app that triages customer support messages using OpenAI and stores the triage results in PostgreSQL.


It analyzes incoming support text and returns:
- Title
- Category
- Priority
- Summary
- Suggested response
- Confidence score

## Tech Stack
- **Frontend**: React + Vite (TypeScript)
- **Backend**: Node.js (ESM) + Express
- **Database**: PostgreSQL
- **LLM Provider**: OpenAI (`gpt-4o-mini` via Chat Completions API)

The core flow:

1. User submits a free‑text support message from the frontend.
2. Backend calls OpenAI with a carefully designed prompt to extract structured triage data.
3. The structured result is stored in PostgreSQL in a single JSONB column.
4. Recent triage requests can be listed and fetched by ID.

---

## Backend

### Key files

- `backend/src/server.js`
  - Loads environment variables with `dotenv`.
  - Sets up Express, JSON body parsing, CORS.
  - Mounts the triage routes at `/triage`.
- `backend/src/db.js`
  - Initializes a `pg.Pool` using `process.env.DATABASE_URL`.
  - Tests the connection on startup and logs helpful diagnostics if DB connection fails.
- `backend/src/routes/triage.js`
  - Implements:
    - `POST /triage`
    - `GET /triage`
    - `GET /triage/:id`
  - Handles all interaction with the LLM (OpenAI) and PostgreSQL.



The Architecture

Frontend (React)
   |
   |  POST /triage
   v
Backend (Express.js)
   |
   |  → OpenAI (LLM)
   |  → PostgreSQL
   v
Response + Stored Data


