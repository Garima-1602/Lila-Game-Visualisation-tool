# LILA BLACK — level designer map explorer

Web app (Vite + React + TypeScript) for exploring **Parquet match telemetry** on official minimaps: **paths**, **distinct event markers**, **filters**, **timeline playback**, **heatmap overlays**, and **PNG export**. Extra tabs: **match roster** (ELK + React Flow) and **summary** aggregates.

See **[VISUALIZATION.md](./VISUALIZATION.md)** for product intent, data limits, and external analytics options.

---

## Assignment checklist (core requirements)

| Requirement | How it is met |
|---------------|----------------|
| Load / parse Parquet | Folder or multi-file picker → `hyparquet` + compressors in [`src/parquet/`](./src/parquet/). Demo data if no files loaded. |
| World → minimap | [`src/mapConfig.ts`](./src/mapConfig.ts) (`origin`, `scale` per `map_id`, 1024² art). |
| Human vs bot | Cyan **human** trails vs slate **bot** trails; kill/death/loot styling uses `isBot` / event kind. |
| Distinct markers | Kill / killed / bot kill / bot killed / **storm death** (dashed circle) / loot (star or dot). **Legend** shows colored shapes; **Layers** checkboxes switch stars vs dots and detailed combat vs simple dots. |
| Filter map / date / match | Sidebar: **Map**, **Day** checkboxes, **Match** select (or all matches overlay). |
| Timeline / playback | Scrubber + play/pause + speed on **Map** tab. |
| Heatmap overlays | **Layers → Heatmap**: traffic (all / human / bot), kills, deaths, storm deaths, loot; opacity on **Analysis** rail. |
| LD analytics | Collapsible **Analysis** rail: session stats, **phase** chips, choke & low-traffic overlays, **player focus**, auto **Insights** + recommendations. |
| Shareable hosted link | **Not automatic** — build static `dist/` and deploy (see **Hosting** below). |

---

## Hosting (shareable link)

1. `npm ci && npm run build` — output in `dist/`.
2. Deploy `dist/` as a **static site** (SPA): all routes are client-side; use host **history fallback** to `index.html` if you add routes later (single-page app today).

**Options:**

- **Netlify:** `npm run deploy:netlify` (requires [`netlify` CLI](https://docs.netlify.com/cli/get-started/) login). Or drag-and-drop `dist` in the Netlify UI.
- **Vercel:** `npx vercel --prod` from repo root, set **Output Directory** to `dist`, **Framework** to Vite (or Other).
- **GitHub Pages:** use `vite.config` `base: '/your-repo-name/'` and a GitHub Action that runs `npm run build` and publishes `dist` to `gh-pages`.

Put the **production URL** in your submission (and optionally a one-line note if demo Parquet is not bundled — designers load files locally or you host sample data separately for privacy).

---

## Local development

```bash
npm install
npm run dev
```

Place minimap images under `public/minimaps/` (see `public/minimaps/README.txt`). Map math must match [`../player_data/README.md`](../player_data/README.md).

```bash
npm run build   # production bundle
npm run preview # serve dist locally
```

---

## Tech stack

React 19, TypeScript, Vite 8, hyparquet, elkjs, React Flow — chosen for a polished SPA, in-browser Parquet, and a readable graph for roster structure.
