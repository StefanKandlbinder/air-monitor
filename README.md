# linzair

Next.js rewrite of `feinstaublinz`.

## What was migrated

- Air data fetch and transformation logic
- Route parity for API-style fetching
- Hourly and daily check endpoints for tweet automation
- Static landing page that documents valid params and examples

## Routes

- `GET /api/air/:station/:component/:mean/:limit`
- `GET /api/jobs/hourly`
- `GET /api/jobs/daily`

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Copy env file and add Twitter credentials:

```bash
cp .env.example .env.local
```

3. Start dev server:

```bash
pnpm dev
```

Open http://localhost:3000.
