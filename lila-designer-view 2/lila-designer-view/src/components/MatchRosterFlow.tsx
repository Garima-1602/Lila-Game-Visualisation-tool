import { useCallback, useEffect, useMemo, useState } from 'react'
import ELK, { type ElkNode } from 'elkjs/lib/elk.bundled.js'
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  Position,
  Handle,
} from '@xyflow/react'
import type { GameEvent } from '../types'
import { isBotUserId } from '../parquet/parseRows'

const elk = new ELK()

function RosterNode({ data }: NodeProps) {
  const kind = data.kind as string | undefined
  return (
    <div className={`roster-node roster-node--${kind === 'bot' ? 'bot' : kind === 'match' ? 'match' : 'human'}`}>
      <Handle type="target" position={Position.Left} />
      <div className="roster-node-title">{String(data.label ?? '')}</div>
      {kind && kind !== 'match' ? <div className="roster-node-kind">{kind === 'bot' ? 'Bot' : 'Human'}</div> : null}
      <Handle type="source" position={Position.Right} />
    </div>
  )
}

const nodeTypes = { roster: RosterNode }

/** ELK child (x,y) is relative to this node's origin; siblings share the same parent origin. */
function collectPositions(node: ElkNode, originX: number, originY: number): { id: string; x: number; y: number; w: number; h: number; label: string; kind: string }[] {
  const x = originX + (node.x ?? 0)
  const y = originY + (node.y ?? 0)
  const w = node.width ?? 120
  const h = node.height ?? 40
  const label = node.labels?.[0]?.text ?? node.id
  const out: { id: string; x: number; y: number; w: number; h: number; label: string; kind: string }[] = []
  if (node.id !== 'root') {
    let kind = 'human'
    if (node.id === 'match') kind = 'match'
    else if (node.id.startsWith('u:') && isBotUserId(node.id.slice(2))) kind = 'bot'
    out.push({ id: node.id, x, y, w, h, label, kind })
  }
  for (const c of node.children ?? []) {
    out.push(...collectPositions(c, x, y))
  }
  return out
}

function shortMatchLabel(matchId: string): string {
  const base = matchId.replace(/\.nakama-\d+$/, '')
  if (base.length <= 28) return base
  return `${base.slice(0, 14)}…${base.slice(-10)}`
}

export interface MatchRosterFlowProps {
  matchId: string
  events: GameEvent[]
}

export function MatchRosterFlow({ matchId, events }: MatchRosterFlowProps) {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])

  const participantIds = useMemo(() => {
    const ids = new Set<string>()
    for (const e of events) {
      if (e.match_id === matchId) ids.add(e.user_id)
    }
    return [...ids].sort((a, b) => {
      const ba = isBotUserId(a) ? 1 : 0
      const bb = isBotUserId(b) ? 1 : 0
      if (ba !== bb) return ba - bb
      return a.localeCompare(b)
    })
  }, [events, matchId])

  const runLayout = useCallback(async () => {
    if (!matchId || !participantIds.length) {
      setNodes([])
      setEdges([])
      return
    }

    const graph: ElkNode = {
      id: 'root',
      layoutOptions: {
        'elk.algorithm': 'layered',
        'elk.direction': 'RIGHT',
        'elk.spacing.nodeNode': '32',
        'elk.layered.spacing.nodeNodeBetweenLayers': '48',
      },
      children: [
        {
          id: 'match',
          width: 240,
          height: 52,
          labels: [{ text: shortMatchLabel(matchId) }],
        },
        ...participantIds.map((uid) => {
          const bot = isBotUserId(uid)
          const label = bot ? `Bot ${uid}` : uid.length > 12 ? `${uid.slice(0, 8)}…` : uid
          return {
            id: `u:${uid}`,
            width: bot ? 110 : 200,
            height: 44,
            labels: [{ text: label }],
          }
        }),
      ],
      edges: participantIds.map((uid) => ({
        id: `e:${uid}`,
        sources: ['match'],
        targets: [`u:${uid}`],
      })),
    }

    try {
      const laid = await elk.layout(graph)
      const boxes = collectPositions(laid, 0, 0)
      const flowNodes: Node[] = boxes.map((b) => ({
        id: b.id,
        type: 'roster',
        position: { x: b.x, y: b.y },
        data: { label: b.label, kind: b.kind },
        style: { width: b.w, height: b.h },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      }))
      const flowEdges: Edge[] = participantIds.map((uid) => ({
        id: `e:${uid}`,
        source: 'match',
        target: `u:${uid}`,
        animated: false,
      }))
      setNodes(flowNodes)
      setEdges(flowEdges)
    } catch {
      setNodes([])
      setEdges([])
    }
  }, [matchId, participantIds])

  useEffect(() => {
    void runLayout()
  }, [runLayout])

  if (!matchId) {
    return (
      <div className="panel-alt empty-flow">
        <p>
          <strong>Match roster graph</strong> uses <code className="mono">elkjs</code> (layered layout) + React Flow. Select
          exactly one <strong>Match</strong> in the sidebar to lay out participants for that match.
        </p>
        <p className="hint">
          Kill edges (who shot whom) are not in the Parquet schema; see <code className="mono">VISUALIZATION.md</code>.
        </p>
      </div>
    )
  }

  if (!participantIds.length) {
    return (
      <div className="panel-alt empty-flow">
        <p>No participants found for this match in the current filters.</p>
      </div>
    )
  }

  return (
    <div className="flow-wrap">
      <p className="flow-caption mono">
        ELK layered layout · {participantIds.length} participants · match → player/bot
      </p>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={1.5}
      >
        <Background gap={16} color="#2a3344" />
        <Controls />
        <MiniMap pannable zoomable />
      </ReactFlow>
    </div>
  )
}
