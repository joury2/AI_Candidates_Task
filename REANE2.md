# AI Support Ticket Triage – Candidate Implementation

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
