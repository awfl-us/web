import React, { useMemo } from 'react'
import type { YojMessage } from '../../../types/context'
import { Collapsible } from '../../../components/common/Collapsible'
import { CollapsedGroupCard } from '../../../components/context/CollapsedGroupCard'
import { ExecGutter } from '../../exec/public'
import { computeLaneTimeline, computeExecBranchAdjacency, formatUsd, getMessageKey, getExecId } from '../utils/yojUtils'
import { extractMarker, parseJsonLikeWithRemainder, splitAtFirstMarker } from '../utils/markers'

function renderNestedBranch(args: {
  text: string
  sessionId?: string
  idToken?: string
  keyBase: string
  depth?: number
}): React.ReactNode {
  const { text, sessionId, idToken, keyBase, depth = 0 } = args
  if (!text || text.trim().length === 0) return null

  const split = splitAtFirstMarker(text)
  if (!split) {
    return (
      <pre
        key={`${keyBase}:text:${depth}`}
        style={{
          margin: 0,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          overflowWrap: 'anywhere',
          fontFamily: 'inherit',
          textAlign: 'left',
          maxWidth: '100%',
        }}
      >
        {text}
      </pre>
    )
  }

  const beforeNode = split.before && split.before.trim().length > 0 ? (
    <pre
      key={`${keyBase}:before:${depth}`}
      style={{
        margin: 0,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        overflowWrap: 'anywhere',
        fontFamily: 'inherit',
        textAlign: 'left',
        maxWidth: '100%',
        marginBottom: 10,
      }}
    >
      {split.before}
    </pre>
  ) : null

  const nested = (
    <CollapsedGroupCard
      key={`${keyBase}:card:${depth}`}
      sessionId={sessionId}
      idToken={idToken}
      label={split.marker.label}
      description={split.marker.description}
      responseId={split.marker.responseId || undefined}
      defaultExpanded={split.marker.kind === 'expanded'}
    >
      {renderNestedBranch({ text: split.after, sessionId, idToken, keyBase: `${keyBase}:child`, depth: depth + 1 })}
    </CollapsedGroupCard>
  )

  return (
    <div key={`${keyBase}:wrap:${depth}`} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {beforeNode}
      {nested}
    </div>
  )
}

export function YojMessageList(props: { messages: YojMessage[]; sessionId?: string; idToken?: string }) {
  const { messages, sessionId, idToken } = props

  // Dynamic lane allocation: only concurrent branches occupy multiple lanes;
  // when a branch ends, its lane is freed and reused by later branches.
  const { laneByIndex, lanesByIndex } = useMemo(() => computeLaneTimeline(messages), [messages])

  // Exec-branch adjacency: draw connectors when consecutive messages are in
  // the same exec branch (ancestor/descendant), not just the same execId.
  const { prevSame, nextSame } = useMemo(() => computeExecBranchAdjacency(messages), [messages])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'stretch', textAlign: 'left', minWidth: 0, maxWidth: '100%' }}>
      {messages.map((m, idx) => {
        const execId = getExecId(m as any)

        // Attempt to detect special markers at the root or embedded in content
        const rootMarker = extractMarker(m as any)
        const { parsed: parsedContent } = parseJsonLikeWithRemainder((m as any)?.content)
        const contentMarker = extractMarker(parsedContent)
        const marker = rootMarker || contentMarker

        // Lane and adjacency for gutter visualization
        const lane = laneByIndex[idx]
        const lanes = execId ? lanesByIndex[idx] : 0 // no exec → force lone dot
        const prevConn = execId ? prevSame[idx] : false
        const nextConn = execId ? nextSame[idx] : false

        if (marker) {
          const key = getMessageKey(m, idx)

          // Only render the explicit "content" value of the marker carrier.
          // Do not include outer message text before/after the marker.
          let innerText = ''
          if (rootMarker) {
            const raw = (m as any)?.content
            innerText = typeof raw === 'string' ? raw : ''
          } else if (contentMarker) {
            const raw = (parsedContent as any)?.content
            innerText = typeof raw === 'string' ? raw : ''
          }

          const toolCalls = Array.isArray((m as any)?.tool_calls) ? (m as any).tool_calls : null

          return (
            <div key={key} style={{ display: 'flex', alignItems: 'stretch', gap: 8, width: '100%' }}>
              <ExecGutter lane={lane} lanes={lanes} showDot prevSame={prevConn} nextSame={nextConn} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <CollapsedGroupCard
                  sessionId={sessionId}
                  idToken={idToken}
                  label={marker.label}
                  description={marker.description}
                  responseId={marker.responseId || undefined}
                  defaultExpanded={marker.kind === 'expanded'}
                >
                  {innerText || (toolCalls && toolCalls.length > 0) ? (
                    <Collapsible>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {innerText ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {renderNestedBranch({ text: innerText, sessionId, idToken, keyBase: `${key}:nested` })}
                          </div>
                        ) : null}

                        {toolCalls && toolCalls.length > 0 ? (
                          <div
                            style={{
                              background: '#ffffff',
                              border: '1px solid #e5e7eb',
                              borderRadius: 6,
                              padding: 8,
                              maxWidth: '100%',
                            }}
                          >
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Tool calls</div>
                            <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {toolCalls.map((tc: any, tIdx: number) => {
                                const fnName = tc?.function?.name ?? '(unknown)'
                                const argsRaw = tc?.function?.arguments
                                let parsed: any = argsRaw
                                try {
                                  parsed = typeof argsRaw === 'string' ? JSON.parse(argsRaw) : argsRaw
                                } catch {
                                  parsed = argsRaw
                                }
                                const prettyArgs = typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2)
                                return (
                                  <li key={tc?.id ?? tIdx} style={{ listStyle: 'disc', overflow: 'hidden' }}>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{fnName}</div>
                                    <pre
                                      style={{
                                        margin: 0,
                                        marginTop: 4,
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                        overflowWrap: 'anywhere',
                                        fontFamily: 'inherit',
                                        background: '#f9fafb',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: 6,
                                        padding: 8,
                                      }}
                                    >
                                      {prettyArgs}
                                    </pre>
                                  </li>
                                )
                              })}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    </Collapsible>
                  ) : null}
                </CollapsedGroupCard>
              </div>
            </div>
          )
        }

        const role = m?.role ?? 'assistant'
        const rawContent: any = (m as any)?.content
        const content = typeof rawContent === 'string' && rawContent.length > 0 ? rawContent : ''
        const toolCalls = Array.isArray((m as any)?.tool_calls) ? (m as any).tool_calls : null

        const bg = role === 'user' ? '#f0f9ff' : role === 'system' ? '#f9fafb' : '#f5f5f5'
        const border = role === 'user' ? '#bae6fd' : role === 'system' ? '#e5e7eb' : '#e5e7eb'
        const labelColor = role === 'user' ? '#0369a1' : role === 'system' ? '#6b7280' : '#374151'

        const hasRenderable = (content && content.length > 0) || (toolCalls && toolCalls.length > 0)
        const fallback = !hasRenderable ? JSON.stringify(m, null, 2) : ''

        const key = getMessageKey(m, idx)

        // Footer meta: timestamp and/or cost
        const tsString = m?.create_time
          ? new Date((typeof m.create_time === 'number' ? (m.create_time as number) * 1000 : Date.parse(String(m.create_time)))).toLocaleString()
          : null
        const rawCost: any = (m as any)?.cost
        const costNum = typeof rawCost === 'string' ? parseFloat(rawCost) : rawCost
        const costString = formatUsd(costNum)
        const metaParts: string[] = []
        if (tsString) metaParts.push(tsString)
        if (costString) metaParts.push(costString)
        const metaText = metaParts.join(' · ')

        return (
          <div key={key} style={{ display: 'flex', alignItems: 'stretch', gap: 8, width: '100%' }}>
            <ExecGutter lane={lane} lanes={lanes} showDot prevSame={prevConn} nextSame={nextConn} />
            <div
              style={{
                background: bg,
                border: `1px solid ${border}`,
                borderRadius: 8,
                padding: 10,
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box',
                textAlign: 'left',
                overflowX: 'hidden',
                minWidth: 0,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: labelColor, marginBottom: 6 }}>{role.toUpperCase()}</div>

              <Collapsible>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0, maxWidth: '100%' }}>
                  {content ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {renderNestedBranch({ text: content, sessionId, idToken, keyBase: `${key}:content` })}
                    </div>
                  ) : null}

                  {toolCalls && toolCalls.length > 0 ? (
                    <div
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: 6,
                        padding: 8,
                        maxWidth: '100%',
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Tool calls</div>
                      <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {toolCalls.map((tc: any, tIdx: number) => {
                          const fnName = tc?.function?.name ?? '(unknown)'
                          const argsRaw = tc?.function?.arguments
                          let parsed: any = argsRaw
                          try {
                            parsed = typeof argsRaw === 'string' ? JSON.parse(argsRaw) : argsRaw
                          } catch {
                            parsed = argsRaw
                          }
                          const prettyArgs = typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2)
                          return (
                            <li key={tc?.id ?? tIdx} style={{ listStyle: 'disc', overflow: 'hidden' }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{fnName}</div>
                              <pre
                                style={{
                                  margin: 0,
                                  marginTop: 4,
                                  whiteSpace: 'pre-wrap',
                                  wordBreak: 'break-word',
                                  overflowWrap: 'anywhere',
                                  fontFamily: 'inherit',
                                  background: '#f9fafb',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: 6,
                                  padding: 8,
                                }}
                              >
                                {prettyArgs}
                              </pre>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  ) : null}

                  {!hasRenderable ? (
                    <pre
                      style={{
                        margin: 0,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        overflowWrap: 'anywhere',
                        fontFamily: 'inherit',
                        textAlign: 'left',
                        maxWidth: '100%',
                      }}
                    >
                      {fallback}
                    </pre>
                  ) : null}
                </div>
              </Collapsible>

              {metaText ? (
                <div style={{ marginTop: 6, fontSize: 11, color: '#9ca3af' }}>{metaText}</div>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}
