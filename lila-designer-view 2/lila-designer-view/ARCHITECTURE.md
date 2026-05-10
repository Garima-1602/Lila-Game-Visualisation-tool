# Architecture (one page)

## What we built and why

**LILA BLACK — designer map explorer** is a single-page **Vite + React + TypeScript** app that runs entirely in the browser: pick Parquet telemetry, see **paths, combat/loot markers, heatmaps, and timeline playback** on the official **1024²** minimaps, plus a **readouts rail** (stats, overlays, quick reads).

| Piece | Why it was chosen |
|--------|-------------------|
| **Vite** | Fast dev/build, simple static `dist/` for hosting (Netlify/Vercel/Pages). |
| **React + TS** | UI state (filters, scrubber, layers) maps cleanly to components; types align with the Parquet schema. |
| **hyparquet + hyparquet-compressors** | Read `.nakama-0` Parquet in-browser without a backend or Python runtime. |
| **Canvas** for the map | Thousands of points per match; 2D draw is predictable vs DOM/SVG at this density. |
| **React Flow + elkjs** (lazy tab) | Optional **roster** graph: match → players as a readable layout without custom graph math in the hot path. |

Demo Parquet is **not** bundled: `generateDemoEvents()` seeds a tiny match so the UI works before files load.

---

## Data flow: files → screen

1. **Input** — User selects a folder (webkit path → `February_*` day tag) or multiple files. Only `*.nakama-0` / `*.parquet` are read.
2. **Parse** — Each file buffer goes through `parquetReadObjects` → rows as plain objects. `rawRowsToGameEvents` keeps known `event` kinds, coerces `x,y,z`, decodes `event` (string or bytes → UTF-8), and drops bad rows.
3. **Normalize time** — `ts` is absolute-ish per file; we subtract **per-`match_id` minimum** so `tMs` is **0-based within the match** and comparable across all journey files for that match (`normalizeMatchTimes`).
4. **Annotate** — `isBot` from `user_id` (UUID vs numeric, with a small fallback heuristic).
5. **Filter (React state)** — `map_id`, optional days, optional single `match_id`, phase slice, scrubber `playbackT` → one list `mapEvents` (events with `tMs ≤ playbackT` in the chosen window).
6. **Render** — Same list feeds **canvas** (`drawMinimapOverlay`: paths, markers, heatmap grid, optional dead/choke masks) and the **readouts rail** (counts, zones, insight cards).

**One line:** Parquet rows → typed `GameEvent[]` → filtered by map/match/time → canvas + panel from the **same** event slice.

---

## World (x, z) → minimap pixels (the tricky part)

The dataset README defines the contract: **minimap art is 1024×1024**; world is **horizontal x and z**; **y is elevation**, not used for 2D placement.

1. Per map, constants **`originX`, `originZ`, `scale`** map the playable world into normalized **u, v ∈ [0,1]** (roughly “where on the art this world point sits”):

   `u = (x - originX) / scale`, `v = (z - originZ) / scale`

2. Convert to **image pixels** (origin top-left, Y down):

   `pixel_x = u * 1024`, `pixel_y = (1 - v) * 1024`

   The **`(1 - v)`** flip is the usual game-vs-image Y convention mismatch.

3. **Clipping** — Points outside `[0, 1024]²` are skipped for heatmap accumulation and similar logic so bad rows or future map drift do not paint garbage.

4. **Config source** — `mapConfig.ts` duplicates the README table (AmbroseValley, GrandRift, Lockdown) and exposes `worldToMinimap1024()` so **draw code and analytics grids share one transform**.

If the art or world bounds drift from README numbers, trails will **slide or shear** relative to terrain—that is the main correctness risk, not the math itself.

---

## Assumptions where data was ambiguous

| Situation | Handling |
|-----------|----------|
| **`event` as bytes** in Parquet | Decode with UTF-8; unknown event strings are **dropped** (only the 8 README kinds are kept). |
| **`ts` type varies** (Date vs number vs bigint) | `rowTimestampMs()` normalizes to **ms number** before per-match offset. |
| **Human vs bot** | Primary rule: **numeric `user_id` → bot**, **UUID → human**; if neither, **non-UUID → treated as bot-ish** so odd IDs still render rather than breaking. |
| **Match time zero** | `tMs = ts - min(ts)` **per match_id** across all loaded rows for that match so timelines align when merging many journey files. |
| **“All matches” on one map** | Overlay mode: multiple `match_id`s draw together; scrubber range spans **union** of visible matches—good for density, noisy for narrative. |
| **Heatmap / overlays** | Coarse grid + blur + decimated paths for performance; heuristics for “dead” and “choke” sectors are **relative to the current slice**, not ground-truth design labels. |

---

## Tradeoffs (what we considered → what we did)

| Topic | Considered | Decided |
|--------|------------|---------|
| **Backend vs client-only** | Pre-aggregate in DuckDB/Spark; small API | **All client** — zero ops, privacy-friendly file pick, limited by RAM/CPU on huge folders. |
| **Rendering** | Mapbox/WebGL | **2D canvas** on static minimap — matches assignment “on official minimap art,” simpler coordinate story. |
| **Time model** | Wall-clock vs phase-of-match | **Per-match `tMs`** from data `ts`; phase chips are **thirds of the scrub window** (design pacing aid, not ring phase API). |
| **Roster graph** | Skip vs ELK | **Lazy-loaded** graph so the default map tab stays light. |
| **Insights** | ML clustering | **Rule-based** cards from snapshot + spatial grid — explainable, works on thin data, wrong less cryptically than a black box. |

---

## Three things we learned about the game *through building/using the tool*

1. **The story is mostly movement** — README notes **~85%+** rows are `Position` / `BotPosition`; the map is path-heavy. The tool had to **decimate** paths and use a **coarse heatmap** so real folders stay interactive.

2. **Humans and bots are first-class different channels** — Separate event types (`Position` vs `BotPosition`, `Kill` vs `BotKill`, …) and IDs force **two visual languages** (cyan vs slate, distinct markers). Any “one mixed heatmap” view hides whether pressure is PvP or PvE unless you split layers.

3. **Match reconstruction is a join problem** — One match = **many files** (one per actor). Sorting and normalizing by **`match_id` + `tMs`** is non-negotiable for a coherent scrubber; a single file in isolation is only one actor’s slice of the truth.
