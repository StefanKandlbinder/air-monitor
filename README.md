# linzair

Next.js rewrite of `feinstaublinz` — an air quality explorer for Linz, Austria, powered by [OpenAQ](https://openaq.org).

## Features

- Interactive map of air quality stations around Linz
- Measurement history with charts and sparklines
- AQI calculation and color coding
- Multi-language support (German / English)

## API Routes

- `GET /api/stations` — list stations near Linz
- `GET /api/stations/:id` — single station details
- `GET /api/latest?locationId=` — latest measurements for a station
- `GET /api/measurements?locationId=&dateFrom=&dateTo=&rollup=hours|days` — historical measurements
- `POST /api/aqi` — calculate AQI for given inputs
- `GET /api/search?lat=&lon=` — find locations by coordinates
- `GET /api/places?q=` — place name search via Nominatim
- `GET /api/countries` — list available countries from OpenAQ

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Copy env file and add your OpenAQ API key:

```bash
cp .env.example .env.local
```

3. Start dev server:

```bash
pnpm dev
```

Open http://localhost:3000.
