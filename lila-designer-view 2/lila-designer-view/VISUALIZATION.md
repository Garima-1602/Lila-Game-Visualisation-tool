# Visualization strategy for LILA BLACK match data

This document records **who the tool is for** and **which technical lanes** this repository implements versus what you would add externally (ELK/EFK, BI, etc.).

## Audiences (confirmed for this project)

| Audience | Primary need | How they are served here |
|----------|----------------|---------------------------|
| **Level designers & LD-adjacent roles** | Correct **world (x, z) → minimap** mapping, paths, heatmaps, playback on the official 1024² art | **[Map]** tab in the web app (`MapStage`, README-aligned math) |
| **Data / analytics / ops** | Filterable tables, KPIs, search across matches, shareable dashboards | **[Summary]** tab (lightweight aggregates in-browser). For full org dashboards, see **External analytics** below — not bundled (needs hosting + index). |
| **Stakeholders & reviews** | Static or narrated **presentable** artifacts (slides, email, tickets) | **Export PNG** on the map toolbar; optional screen recording outside the app. For formal decks, use **Notebook / Quarto** (see external options). |

**Primary audience for the interactive experience:** level designers (spatial truth first).  
**Secondary:** quick quantitative sanity checks without standing up Elasticsearch.

## Lanes implemented in this repo

1. **Custom web map (primary)** — Parquet in browser, minimap overlay, zoom/pan, heatmaps, timeline.  
2. **Presentable export** — Download the current map view (minimap + overlay) as PNG.  
3. **Graph layout (elkjs)** — **[Match roster]** tab: tree of match → participants with **Eclipse ELK** (`elkjs`) layered layout, rendered with **React Flow** (`@xyflow/react`). The app imports `elkjs/lib/elk.bundled.js` so Vite does not need the optional `web-worker` peer used by the default `elkjs` entry.  
4. **In-app summary** — Event counts and human/bot mix for the current filter selection.

5. **Position trails (polylines)** — On the Map tab, **cyan** strokes are **human** traces and **slate** strokes are **bots**. Each line is one participant (`match_id` + `user_id`): consecutive **`Position`** / **`BotPosition`** samples with `tMs` up to the timeline scrubber, sorted by time and connected with `lineTo` in `renderMinimap.ts`. Dense traces are decimated for draw cost. Toggle under **Layers** (human / bot paths). Overlays are **clipped to the 1024×1024 minimap square** so world coordinates that fall outside the README UV mapping do not paint into the letterboxed margins (if trails look wrongly cropped, correct `origin` / `scale` for that `map_id`).

6. **Optional heatmap** — **Layers → Heatmap** draws a **96×96 blurred grid** (traffic / kills / deaths), not individual loot dots. Leave **Off** for paths and markers only.

7. **Combat markers** — On the minimap, **Kill** / **Killed** / **BotKill** / **BotKilled** / **`KilledByStorm`** each have distinct shapes (or dots if “Combat as detailed icons” is off under **Layers**). The **Legend** panel is a read-only colored key. Storm ring *estimate* was removed; storm **deaths** remain telemetry markers.

## Lanes documented but not shipped (operational cost)

These match the original alternatives plan; they are **recommended when** you need org-wide RBAC, scheduled reports, or SQL.

### ELK / EFK (Elasticsearch + Kibana + Logstash or Fluent Bit)

- **What it is:** index each event (or rolled-up documents), explore in **Kibana Discover/Lens**.  
- **Good for:** search by `match_id`, time histograms, anomaly review, producer-facing dashboards.  
- **Not included here:** requires cluster hosting, index mappings, and a small **ETL** job (e.g. Python: Parquet → NDJSON bulk API).  
- **Minimap:** Kibana will not apply your README minimap formula out of the box; precompute `pixel_x` / `pixel_y` or ship tiles if you need map-like panels.

### BI tools (Superset, Metabase, Lightdash)

- **Good for:** KPIs, cohort tables, histograms of event rates by `map_id` / day.  
- **Gap:** same as ELK for literal minimap overlay unless you extend the BI tool.

### Grafana

- **Good for:** time-series + optional Geomap if you add **lat/lng proxies** or a custom panel.  
- **Gap:** native Geomap is not tuned to your game world CRS.

### Notebooks (Observable, Jupyter, Quarto)

- **Good for:** executive-ready **static** figures and narrative; export PNG/PDF from a controlled analysis.

### deck.gl / MapLibre / Kepler

- **Good for:** GPU-heavy paths and hexbins once you commit to a projection story (local CRS or fake geo).

## Combat / kill graphs and schema limits

The Parquet schema in `player_data/README.md` exposes `user_id`, `match_id`, position, time, and **event type** — not a dedicated **victim** or **killer target** foreign key.  

So **true kill-graph edges** (A → B) are **not** inferred reliably in this app. The **Match roster** graph is intentionally a **match → participant** tree. If the pipeline later adds `target_user_id` (or equivalent), you could extend ELK layout to a DAG and draw directed kill edges in React Flow.

## References

- Dataset contract: [../player_data/README.md](../player_data/README.md)  
- App entry: [src/App.tsx](src/App.tsx)
