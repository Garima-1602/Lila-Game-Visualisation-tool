import type { HeatmapMode } from '../types'

const HEAT_LABEL: Record<Exclude<HeatmapMode, 'off'>, string> = {
  traffic: 'Heat · all',
  traffic_human: 'Heat · humans',
  traffic_bot: 'Heat · bots',
  kills: 'Heat · kills',
  deaths: 'Heat · deaths',
  storm_deaths: 'Heat · storm',
  loot: 'Heat · loot',
}

export interface FloatingMapLegendProps {
  heatmap: HeatmapMode
}

export function FloatingMapLegend({ heatmap }: FloatingMapLegendProps) {
  return (
    <div className="floating-map-legend" aria-label="Map overlay legend">
      <div className="floating-map-legend-title">Key</div>
      <ul className="floating-map-legend-list">
        <li>
          <span className="floating-legend-swatch floating-legend-swatch--human-path" />
          Human paths
        </li>
        <li>
          <span className="floating-legend-swatch floating-legend-swatch--bot-path" />
          Bot paths
        </li>
        <li>
          <span className="floating-legend-swatch floating-legend-swatch--kill" />
          Kills
        </li>
        <li>
          <span className="floating-legend-swatch floating-legend-swatch--death" />
          Deaths / storm
        </li>
        <li>
          <span className="floating-legend-swatch floating-legend-swatch--loot" />
          Loot
        </li>
        {heatmap !== 'off' ? (
          <li>
            <span className="floating-legend-swatch floating-legend-swatch--heat" />
            {HEAT_LABEL[heatmap]}
          </li>
        ) : null}
        <li>
          <span className="floating-legend-swatch floating-legend-swatch--dead" />
          Low traffic overlay
        </li>
        <li>
          <span className="floating-legend-swatch floating-legend-swatch--choke" />
          Choke overlay
        </li>
      </ul>
    </div>
  )
}
