import React, { useCallback, useEffect, useMemo, useState } from 'react'
import type { YojMessage } from '../../../types/context'
import { Collapsible } from '../../../components/common/Collapsible'
import { CollapsedGroupCard } from '../../../components/context/CollapsedGroupCard'
import { ExecGutter } from '../../exec/public'
import { computeLaneTimeline, computeExecBranchAdjacency, formatUsd, getMessageKey, getExecId } from '../utils/yojUtils'
import { extractMarker, parseJsonLikeWithRemainder, splitAtFirstMarker } from '../utils/markers'
import styles from './YojMessageList.module.css'

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ')

function renderNestedBranch(args: {
  text: string
  sessionId?: string
  idToken?: string
  keyBase: string
  depth?: number
  expandedByKey: Record<string, boolean>
  onExpandedChange: (key: string, expanded: boolean) => void
}): React.ReactNode {
  const { text, sessionId, idToken, keyBase, depth = 0, expandedByKey, onExpandedChange } = args
  if (!text || text.trim().length === 0) return null

  const split = splitAtFirstMarker(text)
  if (!split) {
    return (
      <pre key={`${keyBase}:text:${depth}`} className={styles.preText}>
        {text}
      </pre>
    )
  }

  const beforeNode = split.before && split.before.trim().length > 0 ? (
    <pre key={`${keyBase}:before:${depth}`} className={styles.preText}>
      {split.before}
    </pre>
  ) : null

  const nestedKey = `${keyBase}:card:${depth}:${split.marker.label}:${split.marker.responseId || 'none'}`
  const nestedExpanded = expandedByKey[nestedKey] ?? (split.marker.kind === 'expanded')

  const nested = (
    <CollapsedGroupCard
      key={nestedKey}
      sessionId={sessionId}
      idToken={idToken}
      label={split.marker.label}
      description={split.marker.description}
      responseId={split.marker.responseId || undefined}
      defaultExpanded={nestedExpanded}
    >
      {renderNestedBranch({
        text: split.after,
        sessionId,
        idToken,
        keyBase: `${keyBase}:child`,
        depth: depth + 1,
        expandedByKey,
        onExpandedChange,
      })}
    </CollapsedGroupCard>
  )

  return (
    <div key={`${keyBase}:wrap:${depth}`} className={styles.branchWrap}>
      {beforeNode}
      <Collapsible expanded={nestedExpanded} onExpandedChange={(expanded) => onExpandedChange(nestedKey, expanded)}>
        {nested}
      </Collapsible>
    </div>
  )
}

export function YojMessageList(props: { messages: YojMessage[]; sessionId?: string; idToken?: string; assistantName?: string; hideExecGutter?: boolean }) {
  const { messages, sessionId, idToken, assistantName, hideExecGutter } = props
  const [expandedByKey, setExpandedByKey] = useState<Record<string, boolean>>({})

  const { laneByIndex, lanesByIndex } = useMemo(() => computeLaneTimeline(messages), [messages])
  const { prevSame, nextSame } = useMemo(() => computeExecBranchAdjacency(messages), [messages])

  const onExpandedChange = useCallback((key: string, expanded: boolean) => {
    setExpandedByKey((prev) => {
      if (prev[key] === expanded) return prev
      return { ...prev, [key]: expanded }
    })
  }, [])

  useEffect(() => {
    const liveKeys = new Set<string>()

    messages.forEach((m, idx) => {
      const key = getMessageKey(m, idx)
      liveKeys.add(`${key}:message`)
    })

    setExpandedByKey((prev) => {
      const nextEntries = Object.entries(prev).filter(([key]) => liveKeys.has(key) || key.includes(':card:'))
      if (nextEntries.length === Object.keys(prev).length) return prev
      return Object.fromEntries(nextEntries)
    })
  }, [messages])

  return (
    <div className={styles.yojList}>
      {messages.map((m, idx) => {
        const execId = getExecId(m as any)
        const rootMarker = extractMarker(m as any)
        const { parsed: parsedContent } = parseJsonLikeWithRemainder((m as any)?.content)
        const contentMarker = extractMarker(parsedContent)
        const marker = rootMarker || contentMarker
        const lane = laneByIndex[idx]
        const lanes = execId ? lanesByIndex[idx] : 0
        const prevConn = execId ? prevSame[idx] : false
        const nextConn = execId ? nextSame[idx] : false

        if (marker) {
          const key = getMessageKey(m, idx)
          const messageExpandedKey = `${key}:message`
          const messageExpanded = expandedByKey[messageExpandedKey] ?? (marker.kind === 'expanded')

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
            <div key={key} className={styles.row}>
              {!hideExecGutter ? <ExecGutter lane={lane} lanes={lanes} showDot prevSame={prevConn} nextSame={nextConn} /> : null}
              <div className={styles.contentFlex}>
                <CollapsedGroupCard
                  sessionId={sessionId}
                  idToken={idToken}
                  label={marker.label}
                  description={marker.description}
                  responseId={marker.responseId || undefined}
                  defaultExpanded={messageExpanded}
                >
                  {innerText || (toolCalls && toolCalls.length > 0) ? (
                    <Collapsible expanded={messageExpanded} onExpandedChange={(expanded) => onExpandedChange(messageExpandedKey, expanded)}>
                      <div className={styles.cardBodyStack}>
                        {innerText ? (
                          <div className={styles.nestedStack}>
                            {renderNestedBranch({
                              text: innerText,
                              sessionId,
                              idToken,
                              keyBase: `${key}:nested`,
                              expandedByKey,
                              onExpandedChange,
                            })}
                          </div>
                        ) : null}

                        {toolCalls && toolCalls.length > 0 ? (
                          <div className={styles.toolCallsBox}>
                            <div className={styles.toolCallsTitle}>Tool calls</div>
                            <ul className={styles.toolCallsList}>
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
                                  <li key={tc?.id ?? tIdx} className={styles.toolCallItem}>
                                    <div className={styles.toolCallName}>{fnName}</div>
                                    <pre className={styles.toolCallPre}>{prettyArgs}</pre>
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

        const role = (m as any)?.role ?? 'assistant'
        const rawContent: any = (m as any)?.content
        const content = typeof rawContent === 'string' && rawContent.length > 0 ? rawContent : ''
        const toolCalls = Array.isArray((m as any)?.tool_calls) ? (m as any).tool_calls : null
        const hasRenderable = (content && content.length > 0) || (toolCalls && toolCalls.length > 0)
        const fallback = !hasRenderable ? JSON.stringify(m, null, 2) : ''
        const key = getMessageKey(m, idx)
        const messageExpandedKey = `${key}:message`
        const messageExpanded = expandedByKey[messageExpandedKey] ?? false

        const tsString = (m as any)?.create_time
          ? new Date((typeof (m as any).create_time === 'number' ? ((m as any).create_time as number) * 1000 : Date.parse(String((m as any).create_time)))).toLocaleString()
          : null
        const rawCost: any = (m as any)?.cost
        const costNum = typeof rawCost === 'string' ? parseFloat(rawCost) : rawCost
        const costString = formatUsd(costNum)
        const metaParts: string[] = []
        if (tsString) metaParts.push(tsString)
        if (costString) metaParts.push(costString)
        const metaText = metaParts.join(' · ')

        const assistantLabel = assistantName?.trim().length ? assistantName : 'Assistant'
        const bubbleVariant = role === 'user' ? styles.bubbleUser : role === 'system' ? styles.bubbleSystem : styles.bubbleAssistant
        const labelVariant = role === 'user' ? styles.labelUser : role === 'system' ? styles.labelSystem : styles.labelAssistant

        return (
          <div key={key} className={styles.row}>
            {!hideExecGutter ? <ExecGutter lane={lane} lanes={lanes} showDot prevSame={prevConn} nextSame={nextConn} /> : null}
            <div className={cx(styles.bubble, bubbleVariant)}>
              <div className={cx(styles.label, labelVariant)}>{role === 'assistant' ? assistantLabel : String(role).toUpperCase()}</div>

              <Collapsible expanded={messageExpanded} onExpandedChange={(expanded) => onExpandedChange(messageExpandedKey, expanded)}>
                <div className={styles.contentStack}>
                  {content ? (
                    <div className={styles.nestedStack}>
                      {renderNestedBranch({
                        text: content,
                        sessionId,
                        idToken,
                        keyBase: `${key}:content`,
                        expandedByKey,
                        onExpandedChange,
                      })}
                    </div>
                  ) : null}

                  {toolCalls && toolCalls.length > 0 ? (
                    <div className={styles.toolCallsBox}>
                      <div className={styles.toolCallsTitle}>Tool calls</div>
                      <ul className={styles.toolCallsList}>
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
                            <li key={tc?.id ?? tIdx} className={styles.toolCallItem}>
                              <div className={styles.toolCallName}>{fnName}</div>
                              <pre className={styles.toolCallPre}>{prettyArgs}</pre>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  ) : null}

                  {!hasRenderable ? <pre className={styles.preText}>{fallback}</pre> : null}
                </div>
              </Collapsible>

              {metaText ? <div className={styles.meta}>{metaText}</div> : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}
