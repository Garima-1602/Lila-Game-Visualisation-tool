# Insights from exploring LILA BLACK telemetry

Three observations from using the map explorer on the **player_data** dataset (see `player_data/README.md` for scale: ~89k rows, 796 matches, 3 maps, heavy **Position**/**BotPosition** volume). Each insight is written so a **level designer** can connect map evidence to a change on the ground.

---

## 1. Most of the signal is where people *walk*, not where icons pop

**What caught my eye**  
With default layers, the canvas fills with **trails** long before kills or loot read as dense. Turning on **traffic heat** vs **kills** heat often shows **different shapes**: broad corridors vs tight hotspots.

**Back it up**  
Dataset documentation calls out that **position samples dominate row counts** (~85%+). In the tool, marker counts in the readout stay modest next to path samples for a typical scrub window—so spatial “volume” is mostly **coverage and flow**, not discrete combat dots.

**Actionable?**  
**Yes.**

| Metrics / signals that would move | Actionable items |
|-----------------------------------|------------------|
| Time-in-sector / heat in **dead overlays** (cyan) | Add **rotate incentives** (loot, contracts, extract adjacency) through under-used wedges; shorten dead runs. |
| Traffic vs kill heat **misalignment** | If traffic is high but kills low, space may be **transit, not contest**—tune sightlines/cover only if you want fights there; if you want quieter rotates, leave it. |
| Path decimation in tool (performance) | In live telemetry pipelines, **downsample Position** for dashboards; keep full fidelity for combat rows. |

**Why a level designer should care**  
Layout is validated by **sustained presence**, not by occasional events. If players never paint a region across the scrubber, **no amount of pretty geo** fixes lack of purpose in the loop.

---

## 2. Bot pressure shows up as a *different* spatial and kill-feed pattern than PvP

**What caught my eye**  
Toggling **human vs bot paths** and **BotKill**/**Kill** heat side by side: bots often **smear** across areas where human trails are thinner, and the readout’s **“Bots in the kill feed”** style signal appears in slices where **BotKill** dominates **Kill**.

**Back it up**  
Schema splits events (`BotPosition`, `BotKill`, …) and IDs (**numeric bot**, **UUID human**). The explorer encodes that as **separate trails and markers** so you cannot mistake bot churn for human lobby skill.

**Actionable?**  
**Yes.**

| Metrics / signals that would move | Actionable items |
|-----------------------------------|------------------|
| **BotKill / Kill** ratio in a window | Adjust **bot density**, leash/aggro, or spawn tables so bots **train** humans into hotspots instead of diluting them. |
| Bot traffic heat on **off-angles** | Reposition bot **patrol anchors** toward intended contest corridors; reduce random flank bots if readability drops. |
| Human **Killed** near bot-heavy sectors | Check **cover cadence** where humans meet bots—frustration often reads as “I didn’t see the threat type.” |

**Why a level designer should care**  
Bots are a **leveling and pacing tool**. If their spatial signature **competes** with the authored PvP geometry, designers tune the wrong lever (human loot) when the feed is actually **bot-driven**.

---

## 3. Storm (`KilledByStorm`) reads as a *timeline* problem as much as a *map* problem

**What caught my eye**  
Scrubbing late in the match often **clusters storm deaths** in time; on the map, those markers sit on **ring-adjacent** edges rather than deep interior pockets—ring geometry and rotate windows dominate.

**Back it up**  
`KilledByStorm` is a first-class marker; combined with **per-match `tMs`**, the tool can highlight when **most** storm deaths fall in the **back half** of the scrub window (rule-based insight). Spatially, deaths attach to **last-known x,z**—useful for “where they died,” not for full ring polygon simulation.

**Actionable?**  
**Yes.**

| Metrics / signals that would move | Actionable items |
|-----------------------------------|------------------|
| Storm deaths **late vs early** fraction | Tune **phase duration**, **damage ramp**, and **safe structure** count before endgame. |
| Storm death **map edge density** | Widen **rotate lanes**, add **interior crossings**, or soften **elevation choke** near common last zones (still 2D x,z in tool). |
| Extract / objective pressure vs storm | If storm deaths spike while **loot** heat is still high in fringe sectors, players may be **economically trapped**—pull objectives inward or delay final ring squeeze. |

**Why a level designer should care**  
Ring logic is global, but **player pain** shows up as **local geometry + timing**. If storm deaths bunch on the scrubber without matching your intended “fair last fights,” the fix is usually **rotate readability and tempo**, not only damage numbers.
