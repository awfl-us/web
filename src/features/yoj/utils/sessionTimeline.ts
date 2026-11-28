import type { YojMessage } from '../../../types/context'

export type TimelineRow = {id:string;createTime:number;kind:'user'|'assistant'|'tool'|'system'|'unknown';message:Record<string,unknown>}
export type TimelinePage = {version:1;rows:TimelineRow[];oldestCursor:string|null;newestCursor:string|null;hasMore:boolean}
export const PAGE_SIZE = 30
export const MAX_LOADED_ROWS = 300

export function parseTimelinePage(value: unknown): TimelinePage {
  const p = value as TimelinePage
  if (p?.version !== 1 || !Array.isArray(p.rows) || p.rows.length > 50 || typeof p.hasMore !== 'boolean' ||
      ![p.oldestCursor,p.newestCursor].every(c=>c===null || typeof c==='string' && c.length>0) ||
      (p.rows.length>0 && (!p.oldestCursor || !p.newestCursor)) ||
      (p.rows.length===0 && (p.oldestCursor!==null || p.newestCursor!==null || p.hasMore)) ||
      p.rows.some(r=>!r || typeof r.id!=='string' || !r.id || !Number.isFinite(r.createTime) || !['user','assistant','tool','system','unknown'].includes(r.kind) || !r.message || typeof r.message!=='object' || Array.isArray(r.message)) ||
      new Set(p.rows.map(r=>r.id)).size!==p.rows.length || p.rows.some((r,i)=>i>0 && r.createTime<p.rows[i-1].createTime)) throw new Error('Invalid session timeline response')
  return p
}

// Cursor pages are already in authoritative storage order. Do not re-sort by
// JS string comparison (which may disagree with the storage collation).
export function mergeTimelineRows(current:TimelineRow[], incoming:TimelineRow[], direction:'older'|'newer'='newer'):TimelineRow[] {
  if(!incoming.length) return current
  const updates = new Map(incoming.map(row=>[row.id,row]))
  const present = new Set(current.map(row=>row.id))
  const retained = current.map(row=>updates.get(row.id)??row)
  const added = incoming.filter(row=>!present.has(row.id))
  return direction==='older'?[...added,...retained]:[...retained,...added]
}
export function toTimelineMessages(rows:TimelineRow[]):YojMessage[] {
  return rows.map(row=>{
    const m=row.message
    return {...m,timelineId:row.id,role:row.kind,create_time:row.createTime,
      content:typeof m.content==='string'?m.content:m.content==null?null:JSON.stringify(m.content),
      cost:typeof m.cost==='number' && Number.isFinite(m.cost)?m.cost:typeof m.cost==='string' && m.cost.trim() && Number.isFinite(Number(m.cost))?Number(m.cost):null}
  })
}
