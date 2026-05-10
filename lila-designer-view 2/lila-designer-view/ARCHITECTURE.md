
## Architecture Overview

This project is a frontend-only gameplay analytics tool designed for Level Designers to visually understand player behavior across LILA BLACK maps.

The application processes gameplay telemetry data stored in parquet files and converts it into:
- player movement paths
- combat markers
- loot events
- storm deaths
- heatmaps
- timeline playback visualizations

The entire application runs directly in the browser without requiring a backend server or database.

---

# System Flow

```text
                ┌─────────────────────┐
                │  Parquet Files      │
                │ (.nakama-0 files)   │
                └──────────┬──────────┘
                           │
                           ▼
                ┌─────────────────────┐
                │  hyparquet Parser   │
                │  (Browser Parsing)  │
                └──────────┬──────────┘
                           │
                           ▼
                ┌─────────────────────┐
                │ Event Normalization │
                │ Decode Events       │
                │ Detect Bots/Humans  │
                │ Match Reconstruction│
                └──────────┬──────────┘
                           │
                           ▼
                ┌─────────────────────┐
                │ Coordinate Mapping  │
                │ World → Minimap     │
                └──────────┬──────────┘
                           │
                           ▼
                ┌─────────────────────┐
                │ React State Layer   │
                │ Filters & Timeline  │
                └──────────┬──────────┘
                           │
                           ▼
                ┌─────────────────────┐
                │ Visualization Layer │
                │ Paths • Heatmaps    │
                │ Combat • Loot       │
                │ Playback Timeline   │
                └─────────────────────┘
```

---

# What We Built

The tool allows Level Designers to:
- replay player journeys on real minimaps
- identify high combat areas
- analyze movement flow
- compare human vs bot behavior
- detect dead zones and choke points
- study storm pressure areas

The focus was to make gameplay telemetry visually understandable without requiring technical analysis of raw parquet files.

---

# Tech Stack

| Technology | Purpose |
|---|---|
| React + TypeScript | Frontend application |
| Vite | Development and build tooling |
| hyparquet | Browser-based parquet parsing |
| Canvas API | High-performance rendering |
| Netlify / Vercel | Deployment |

---

# Why Frontend-Only Architecture?

The dataset size (~89k rows) is small enough to process directly in the browser.

Benefits:
- simpler deployment
- no backend infrastructure
- no database setup
- lower hosting complexity
- easy sharing using a single URL

Tradeoff:
- very large datasets may increase browser memory usage

---

# Data Flow

## Step 1 — Load Data
The browser loads parquet files from:
- uploaded folders/files
or
- bundled `public/data` directory

---

## Step 2 — Parse Data
`hyparquet` reads parquet data directly in the browser.

Each row contains:
- player ID
- match ID
- coordinates
- timestamp
- gameplay event

---

## Step 3 — Normalize Events
The system:
- decodes event bytes into readable strings
- filters valid event types
- reconstructs matches using `match_id`
- sorts events using timestamps

---

## Step 4 — Detect Humans vs Bots

Detection logic:
- UUID-style IDs → Human players
- Numeric IDs → Bots

Different visual styles are used for each.

---

# Coordinate Mapping

The game world uses 3D world coordinates, while minimaps use 2D image coordinates.

Only:
- `x`
- `z`

are used for minimap plotting.

`y` represents elevation and is ignored for 2D visualization.

---

## Coordinate Conversion Logic

Step 1:

u = (x - origin_x) / scale

v = (z - origin_z) / scale

Step 2:

pixel_x = u × 1024

pixel_y = (1 - v) × 1024

The Y-axis is flipped because minimap images use top-left origin coordinates.

---

# Assumptions Made

| Situation | Handling |
|---|---|
| Event stored as bytes | Decoded using UTF-8 |
| Unknown event types | Ignored |
| Human vs Bot detection | UUID = Human, Numeric ID = Bot |
| Timestamp variations | Converted into normalized milliseconds |
| Match reconstruction | Grouped using `match_id` |

---

# Tradeoffs

| Considered | Decision |
|---|---|
| Backend API vs frontend-only | Chose frontend-only for simplicity |
| SVG vs Canvas rendering | Used Canvas for better performance |
| ML-based insights vs rule-based insights | Used rule-based insights for explainability |
| Real-time pipeline vs static dataset | Focused on static visualization for assignment scope |

---

# Key Learnings

## 1. Player movement dominates gameplay
Most telemetry rows are movement events, making path visualization and heatmaps critical for analysis.

---

## 2. Bots and humans behave differently
Separating bot and human visualizations provides clearer understanding of PvE vs PvP engagement areas.

---

## 3. Match reconstruction is essential
A single match contains multiple player files. Reconstructing matches using `match_id` is necessary for accurate timeline playback and gameplay analysis.

---
