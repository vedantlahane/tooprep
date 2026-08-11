# TooPrep — JEE Confidence & Performance Tracker V1

A systematic preparation tool for JEE aspirants that identifies the gap between what students **think** they know (confidence) and what they **actually** know (evaluation performance).

## Architecture

```
├── client/            # React + Vite frontend (Tailwind CSS v4)
│   └── src/
│       ├── components/    # Reusable UI components
│       ├── contexts/      # Auth context (Supabase)
│       ├── lib/           # API client, Supabase config
│       └── pages/         # Route page components
│
├── server/            # Express API backend
│   ├── lib/               # Supabase admin client
│   ├── middleware/         # JWT auth middleware
│   └── routes/            # API route modules
│
└── supabase/          # Database migrations & seed data
    └── migrations/
        ├── 001_schema.sql
        ├── 002_rls.sql
        └── 003_seed.sql
```

## Setup

### 1. Supabase Project
1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the migration files in order:
   - `supabase/migrations/001_schema.sql`
   - `supabase/migrations/002_rls.sql`
   - `supabase/migrations/003_seed.sql`
3. Go to **Settings → API** and copy your credentials

### 2. Environment Variables
Copy `.env.example` to `.env` in the project root and fill in:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CLIENT_URL=http://localhost:5173
PORT=3001
```

Create `client/.env`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Install & Run

```bash
# Server
cd server
npm install
npm run dev

# Client (separate terminal)
cd client
npm install
npm run dev
```

The client runs at `http://localhost:5173` with API proxy to the server at `http://localhost:3001`.

## Key Features

- **Knowledge Map Dashboard** — Sortable table of all topics with confidence, accuracy, gap, and status
- **Practice Mode** — Untimed practice with instant answer reveals and solutions (KaTeX math)
- **Timed Evaluation** — Exam-like conditions with countdown timer, question navigator, mark-for-review
- **Confidence Gap Analysis** — Post-evaluation confidence re-rating with gap calculation
- **Topic Insights** — Detailed per-topic view with confidence/evaluation history
- **Insights Page** — Subject breakdowns, overconfident topic priorities, untested topics

## Confidence Gap Formula

```
Gap = Evaluation Accuracy (%) − Confidence Rating × 10 (%)
```

| Status | Condition |
|--------|-----------|
| ALIGNED | \|gap\| < 20 and accuracy ≥ 50% |
| OVERCONFIDENT | gap ≤ −20 |
| UNDERCONFIDENT | gap ≥ +20 |
| WEAK_ALIGNED | \|gap\| < 20 and accuracy < 50% |
| PRELIMINARY | 5–9 evaluation attempts |
| INSUFFICIENT_DATA | < 5 evaluation attempts |

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS v4, KaTeX, React Router
- **Backend**: Node.js, Express
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Auth**: Supabase Auth (email/password)
