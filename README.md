# Garmin Flow

https://github.com/user-attachments/assets/b73d16a9-ed7c-425c-a55c-994bfcafaea6



Garmin Flow is a personal training dashboard built with Next.js 16 and React 19. I originally put it together for my own use during the Garmin vs. Strava lawsuit so I could stay in control of my data. It aggregates Garmin Connect activity, readiness, sleep, and training load data into a single view, adds map visualisations with Mapbox GL, and offers an optional coaching chat experience. I still rely on it day to day to stay on top of endurance and fitness goals 🙂

## Why GarminDB?

Garmin does not publish an official public API for Connect data. To keep the workflow reliable and under our control we ingest data with the community project [tcgoetz/GarminDB](https://github.com/tcgoetz/GarminDB). GarminDB logs in on your behalf, downloads activities plus wellness statistics, and writes them into a local `HealthData/` directory that this app reads from. All data stays on disk; nothing is proxied through third parties.

## Features

- Daily dashboard with key metrics, rolling readiness/load trends, and heart-rate zone summaries.
- Recent workout list with Mapbox-powered route previews for sessions that include GPS tracks.
- Visualisations for weekly mileage, sleep intensity, and training focus using Recharts.
- Optional AI-backed “coach” chat endpoint that summarises current training context (requires an OpenAI key; the app falls back gracefully without it).

## Prerequisites

- Node.js 20+ (tested with `v20.16.x`) and npm.
- A Garmin Connect account with data you can export via GarminDB.
- Python 3.11+ with `pip` to install GarminDB.
- A Mapbox account for `NEXT_PUBLIC_MAPBOX_TOKEN` if you want route maps.

## Exporting Data with GarminDB

1. Follow the GarminDB instructions: <https://github.com/tcgoetz/GarminDB>.
2. Install it (once) with `pip install garminconnect garmindb`.
3. Authenticate and download your data. A common workflow:
   ```bash
   garmindb_cli.py --download-only --activities --monitoring
   ```
   GarminDB saves everything inside a `HealthData/` directory (JSON summaries, `.fit` files, and SQLite exports).
4. Point the app at that directory by setting `GARMIN_DATA_ROOT` (see below). If you leave it unset the app looks for `HealthData/` in the project root.

> **Tip:** GarminDB caches session cookies under `~/.GarminDb/` so subsequent runs only pull incremental updates.

## Environment Variables

Create (or update) a `.env` file in the project root and supply the following values:

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | Prisma connection string. Default `file:./dev.db` works for local SQLite. |
| `GARMIN_DATA_ROOT` | ✅ | Absolute path to GarminDB’s `HealthData` directory. Example: `/opt/homebrew/lib/python3.11/site-packages/HealthData`. |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Optional | Enables route maps in the workouts view. |
| `OPENAI_API_KEY` | Optional | Allows the AI coach chat endpoint to call OpenAI’s `gpt-4o-mini`. Without it the chat page returns a static guidance message. |

After editing the `.env` file, regenerate the Prisma client if required:

```bash
npx prisma generate
```

## Install & Run

```bash
npm install          # install dependencies
npm run dev          # start local dev server on http://localhost:3000
npm run build        # create a production build
npm run start        # run the production build
npm run lint         # check code style with ESLint
```

## Project Layout Highlights

- `src/lib/garmin-data.ts` parses GarminDB exports and computes the aggregates used across the app.
- `src/components/dashboard/` contains dashboard widgets for metrics, workouts, and trends.
- `src/components/workouts/mapbox-route-map.tsx` renders GPS tracks from `.fit` files via Mapbox GL.
- `prisma/schema.prisma` defines the local SQLite schema for high-frequency monitoring data (heart rate, intensity, etc.).
- `src/app/api/chat/route.ts` handles the streaming chat endpoint, including graceful fallback when `OPENAI_API_KEY` is missing.

## Notes

- This repository focuses on data visualisation and coaching workflows; it ships no training models of its own.
- Keep your Garmin credentials and GarminDB session files private. The app never transmits your data off the machine.
- Contributions and issues are welcome; please share reproducible steps plus anonymised data snippets where possible.
