# Tahoe Chain Control

Tahoe Chain Control is a live safety dashboard for travelers moving between the Bay Area and Lake Tahoe. It aggregates Caltrans chain control updates from District 3 and District 10 and highlights whether conditions are good, cautionary, or unsafe.

## Running locally

```bash
pnpm install
pnpm dev
```

Then open `http://localhost:3000`.

## Data feeds

- District 3: `https://cwwp2.dot.ca.gov/data/d3/cc/ccStatusD03.json`
- District 10: `https://cwwp2.dot.ca.gov/data/d10/cc/ccStatusD10.json`

The API route `/api/chain-controls` merges both feeds and refreshes every 60 seconds.

## Map view

The map uses MapLibre via `@vis.gl/react-maplibre` and plots chain control points by severity.

- Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_MAPTILER_KEY` to enable the
  production MapTiler Streets v2 basemap.
- Without a key, the app falls back to the MapLibre demo style and shows a dev-only notice.
- Selecting a marker opens a detail sheet with status, updates, and actions to filter the corridor or jump to the table.

## Corridor severity + score

Corridor cards and decision banners use safety-first Caltrans status rules:

- **Green / Good to go:** all points are `R-0` or no active controls found.
- **Yellow / Use caution:** any point is `R-1` or `R-1M`.
- **Orange / Chains likely needed:** any point is `R-2`.
- **Red / Avoid / Delay:** any point is `R-3`, `RC`, `ESC`, `HT`, `TS`, `TTA`, or other hold/closure codes.
- **MIN/MAX:** informational only, does not elevate severity on its own.
- Unknown non `R-0`/`R-1`/`R-2` statuses are treated as **Red** for safety.

Scores start at 100, are capped by severity (Yellow 70, Orange 40, Red 10), then reduced by:

- `-5` per additional affected point (up to `-20`).
- `-5` if the latest update is older than 5 minutes.
