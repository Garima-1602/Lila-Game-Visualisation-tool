# INSIGHTS.md

# Insights from LILA BLACK Gameplay Telemetry

This document summarizes key gameplay and map-design insights discovered while exploring the LILA BLACK telemetry dataset using the Player Journey Visualization Tool.

The analysis focuses on:
- player movement
- combat density
- bot activity
- storm pressure
- heatmap patterns
- gameplay flow

---

# Insight 1 — Player Movement Defines the Map More Than Combat

## What caught my eye

The movement heatmaps were significantly denser than combat or loot heatmaps across all maps.

Large portions of the map showed heavy player traffic without major combat activity, indicating that many regions function primarily as traversal corridors rather than engagement zones.

---

## Supporting Evidence

- The dataset contains mostly `Position` and `BotPosition` events
- Movement trails visually dominate the minimap
- Traffic heatmaps cover wider areas compared to tightly clustered kill heatmaps
- Some areas consistently showed movement flow but very low combat density

---

## Actionable Insights

| Observation | Possible Action |
|---|---|
| High traffic but low combat | Add loot, objectives, or stronger cover to encourage engagements |
| Low traffic areas | Rework traversal paths or place incentives to increase map usage |
| Long empty movement routes | Improve pacing using smaller POIs or environmental interactions |

---

## Why Level Designers Should Care

Player movement patterns reveal how players naturally navigate the map.

If players repeatedly avoid certain regions, those spaces may lack meaningful gameplay value or strategic importance.

Movement analysis helps designers:
- improve pacing
- balance map flow
- reduce dead zones
- guide player encounters more intentionally

---

# Insight 2 — Bots and Human Players Create Different Gameplay Pressure

## What caught my eye

Bot activity patterns were visibly different from human player combat behavior.

Bots appeared more spread across the map, while human combat hotspots were concentrated around specific routes and choke points.

---

## Supporting Evidence

- Separate event types exist for bots:
  - `BotPosition`
  - `BotKill`
  - `BotKilled`
- Bot heatmaps showed wider spatial coverage
- Human kill events formed tighter clusters
- Some matches showed heavy bot combat but limited PvP interaction

---

## Actionable Insights

| Observation | Possible Action |
|---|---|
| Bots dominating low-traffic areas | Reposition bot patrols toward active routes |
| Excessive bot pressure | Reduce bot density in early game areas |
| Low PvP engagement despite high activity | Improve incentives around contested zones |

---

## Why Level Designers Should Care

Bots are important for pacing and world population, but poor bot placement can reduce meaningful PvP encounters.

Separating human and bot activity helps designers:
- tune combat pacing
- improve encounter quality
- balance PvE and PvP gameplay pressure

---

# Insight 3 — Storm Deaths Suggest Rotation and Timing Problems

## What caught my eye

Storm deaths were heavily concentrated during later stages of matches and frequently occurred near edge regions of the maps.

This suggests that some players struggle to rotate safely during late-game phases.

---

## Supporting Evidence

- `KilledByStorm` events appeared mostly in the second half of timeline playback
- Storm deaths clustered near outer map edges
- Some high-loot regions also showed increased storm death density
- Timeline playback showed players delaying rotations too long

---

## Actionable Insights

| Observation | Possible Action |
|---|---|
| High storm deaths near map edges | Add safer rotation routes |
| Players trapped in outer loot zones | Rebalance loot placement |
| Late-game storm pressure too aggressive | Adjust storm timing or damage scaling |

---

## Why Level Designers Should Care

Storm systems directly influence pacing, movement, and player decision-making.

If too many players die to the storm instead of combat:
- match pacing may feel frustrating
- rotations may lack clarity
- late-game fights may become less satisfying

Analyzing storm deaths helps improve:
- map readability
- rotation design
- gameplay fairness
- endgame quality

---

# Overall Learnings

Using gameplay telemetry visualization made it easier to understand:
- how players move through maps
- where combat naturally occurs
- how bots affect gameplay pacing
- which areas are ignored
- where players struggle during rotations

The combination of:
- minimap visualization
- heatmaps
- timeline playback
- event overlays

helped transform raw telemetry into actionable level design insights.

---
