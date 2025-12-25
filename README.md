# Tahoe Chain Control

Tahoe Chain Control is a live travel dashboard for the Bay Area ↔ Lake Tahoe corridors. It aggregates Caltrans chain control updates and answers the core question: "Can we go now?" for cars and trucks.

## Running locally

```bash
npm install
npm run dev
```

Or with pnpm:

```bash
pnpm install
pnpm dev
```

Then open `http://localhost:3000`.

## Data feeds

- District 3: `https://cwwp2.dot.ca.gov/data/d3/cc/ccStatusD03.json`
- District 10: `https://cwwp2.dot.ca.gov/data/d10/cc/ccStatusD10.json`

The API route `/api/chain-controls` merges both feeds and refreshes about once a minute.

## Vehicle modes

- **Car/SUV (default):** corridor verdicts only consider passenger-impacting statuses such as `R-1`, `R-2`, `R-3`, `RC`, `HT`, `ESC`, and `TTA`.
- **Truck/Commercial:** corridor verdicts consider passenger-impacting statuses plus truck-only operational statuses like `TS`, `MAX`, and `MIN`.
- Truck-only statuses appear as a separate advisory in Car mode so the summary and map stay consistent.

## Summary view

- A hero card answers "Can we go now?" for the selected corridor.
- Corridor cards show the verdict, a one-sentence meaning, and the top reasons relevant to the selected vehicle mode.
- Truck advisories are tucked into a collapsed section in Car mode.

## Map view

The map uses MapLibre via `@vis.gl/react-maplibre` and plots chain control points by severity.

- Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_MAPTILER_KEY` to enable the
  production MapTiler Streets v2 basemap.
- Without a key, the app falls back to the MapLibre demo style and shows a dev-only notice.
- A top banner shows the same corridor verdict as the Summary.
- Corridor polylines are colored by severity so the road itself reflects the verdict.
- Markers follow the same vehicle-mode rules as the Summary.
- Selecting a marker opens a detail sheet with status, updates, and actions to filter the corridor or jump to the Summary.
- If Caltrans publishes severe alerts without coordinates, an "Unmapped alerts" panel appears above the map.

## Severity language

- **Green:** You can drive normally.
- **Yellow:** Be careful. Bring chains.
- **Orange:** Chains required on many cars.
- **Red:** Do not go. Road closed or held.

Status codes are still available in tooltips and detail panels for advanced users.
