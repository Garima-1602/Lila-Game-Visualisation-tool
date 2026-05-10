# LILA BLACK — Player Journey Visualization Tool

## Overview

This project is an interactive gameplay analytics tool built for Level Designers to understand how players move, fight, loot, and die across LILA BLACK maps.

The tool converts raw gameplay telemetry data into visual insights directly on top of the in-game minimaps. Instead of analyzing raw parquet files manually, Level Designers can visually explore player behavior and identify combat hotspots, dead zones, popular routes, and storm pressure areas.

The application is fully browser-based and does not require any backend server.

---

# Live Demo

Add deployed URL here after deployment.

Example:
https://your-app.netlify.app

---

# Problem Statement

The raw dataset contains thousands of gameplay events spread across multiple parquet files. While the data is valuable, it is difficult for Level Designers to interpret directly.

This tool helps answer questions like:

- Where do most fights happen?
- Which areas of the map are ignored?
- Where are players dying to the storm?
- Which routes are most commonly used?
- How do players move throughout a match?
- Are bots and human players behaving differently?

---

# Key Features

## Player Journey Visualization
- Displays player movement trails on top of the minimap
- Reconstructs complete matches using `match_id`
- Shows how players navigate the map over time

## Human vs Bot Detection
- Human players and bots are visually distinguished
- Humans are identified using UUID-style user IDs
- Bots are identified using numeric IDs

## Event Visualization

The tool displays different gameplay events using unique markers:

| Event Type | Description |
|---|---|
| Kill | Player killed another player |
| Killed | Player died to another player |
| BotKill | Player killed a bot |
| BotKilled | Player died to a bot |
| Loot | Item pickup |
| KilledByStorm | Storm death |

---

## Timeline Playback
- Allows replaying a match over time
- Helps visualize how combat and movement evolve during a game

---

## Heatmap Analysis

Multiple heatmap modes are supported:
- High traffic zones
- Kill hotspots
- Death hotspots
- Loot-heavy areas
- Storm death regions

This helps identify:
- choke points
- risky traversal routes
- underutilized areas
- map balance opportunities

---

# Tech Stack

| Technology | Purpose |
|---|---|
| React + TypeScript | Frontend UI |
| Vite | Build tool and development server |
| hyparquet | Browser-based parquet parsing |
| Canvas API | High-performance rendering |
| Netlify / Vercel | Deployment |

---

# Architecture Overview

The application follows a frontend-only architecture.

Parquet Files
      ↓
hyparquet parsing
      ↓
Event normalization
      ↓
Coordinate mapping
      ↓
React state management
      ↓
Canvas rendering
      ↓
Interactive analytics UI

# Data Processing Flow

Parquet files are loaded directly in the browser
Event byte values are decoded into readable strings
Files with the same match_id are grouped together
Events are sorted using timestamps (ts)
World coordinates (x, z) are converted into minimap pixel positions
Processed events are rendered as:
  movement paths
  event markers
  heatmaps
  match playback visualizations

#Coordinate Mapping

The game uses world coordinates, while minimaps use 2D image coordinates.
To correctly place players on the minimap:
u = (x - origin_x) / scale
v = (z - origin_z) / scale
pixel_x = u × 1024
pixel_y = (1 - v) × 1024
The Y-axis is flipped because image coordinates start from the top-left corner.
Only x and z coordinates are used for minimap plotting.
y represents elevation and is ignored in 2D rendering.

#Product Engineering Considerations

While building the tool, the focus was not only on visualization but also on usability for Level Designers.
Design priorities included:

quick filtering
visual clarity
fast iteration
minimal setup
actionable gameplay insights
The goal was to make gameplay telemetry understandable without requiring technical or data engineering expertise.

# Future Improvements

Potential future enhancements:

zone progression visualization
squad/group movement analysis
weapon-specific combat analytics
extraction success tracking
advanced clustering algorithms
server-side scalable analytics pipeline
