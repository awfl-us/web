import React, { useCallback, useMemo, useState } from 'react'
import type { YojMessage } from '../../../types/context'
import { Collapsible } from '../../../components/common/Collapsible'
import { CollapsedGroupCard } from '../../../components/context/CollapsedGroupCard'
import { ExecGutter } from '../../exec/public'
import { computeLaneTimeline, computeExecBranchAdjacency, formatUsd, getExecId } from '../utils/yojUtils'
import { extractMarker, parseJsonLikeWithRemainder, splitAtFirstMarker } from '../utils/markers'
import styles from './YojMessageList.module.css'
import { MarkdownMessage } from './MarkdownMessage'
import { CopyTextButton } from './CopyTextButton'
import { getTimelineKeys } from '../utils/timelineIdentity'
import { indexActivity } from '../utils/activity'
import { ToolCallActivity, ToolResultActivity } from './ActivityDetails'

export type MessagePresentation = {
  messageStyle?: 'conversation' | 'legacy'
  showTimestamps?: boolean
  showCosts?: boolean
  activityMode?: 'compact' | 'detailed'
}

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ')

function renderNestedBranch(args: {
  text: string
  sessionId?: string
  idToken?: string
  keyBase: string
  depth?: number
  rich?: boolean
  expandedByKey: Record<string, boolean>
  onExpandedChange: (key: string, expanded: boolean) => void
}): React.ReactNode {
  const { text, sessionId, idToken, keyBase, depth = 0, rich = false, expandedByKey, onExpandedChange } = args
  if (!text || text.trim().length === 0) return null

  const split = splitAtFirstMarker(text)
  if (!split) {
    if (rich) return <MarkdownMessage text={text} />
    return (
      <pre key={`${keyBase}:text:${depth}`} className={styles.preText}>
        {text}
      </pre>
    )
  }

  const beforeNode = split.before && split.before.trim().length > 0 ? rich ? <MarkdownMessage text={split.before} /> : (
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

type MessageListProps = { messages: YojMessage[]; sessionId?: string; idToken?: string; assistantName?: string; hideExecGutter?: boolean; presentation?: MessagePresentation; interactionScope?: string }

export function YojMessageList(props: MessageListProps) {
  return <ScopedMessageList key={props.interactionScope ?? props.sessionId ?? "default"} {...props}/>
}

function ScopedMessageList(props: MessageListProps) {
  const { messages, sessionId, idToken, assistantName, hideExecGutter, presentation } = props
  const modern = presentation?.messageStyle === 'conversation'
  const showTimestamps = presentation?.showTimestamps !== false
  const showCosts = presentation?.showCosts !== false
  const compactActivity = modern && presentation?.activityMode !== 'detailed'
  const activity = useMemo(() => compactActivity ? indexActivity(messages) : null, [messages, compactActivity])
  const keys = useMemo(() => getTimelineKeys(messages), [messages])
  const [expandedByKey, setExpandedByKey] = useState<Record<string, boolean>>({})

  const { laneByIndex, lanesByIndex } = useMemo(() => computeLaneTimeline(messages), [messages])
  const { prevSame, nextSame } = useMemo(() => computeExecBranchAdjacency(messages), [messages])

  const onExpandedChange = useCallback((key: string, expanded: boolean) => {
    setExpandedByKey((prev) => {
      if (prev[key] === expanded) return prev
      // Keep explicit choices across temporary window omissions. Bounded per mounted session.
      const entries = Object.entries(prev).filter(([existing]) => existing !== key)
      return Object.fromEntries([...entries.slice(-2047), [key, expanded]])
    })
  }, [])

  return (
    <div className={cx(styles.yojList, modern && styles.conversation)} data-awfl-message-style={modern ? 'conversation' : 'legacy'}>
      {messages.map((m, idx) => {
        if (m.liveResponse === true && !modern) {
          const key = keys[idx]
          return <div key={key} data-awfl-message-key={key} className={styles.row} data-live-response={m.responseId}>
            <div className={cx(styles.bubble, styles.bubbleAssistant)}>
              <div className={cx(styles.label, styles.labelAssistant)}>{assistantName?.trim() || 'Assistant'}</div>
              <pre className={styles.preText}>{m.content}</pre>
            </div>
          </div>
        }
        const execId = getExecId(m as any)
        const rootMarker = m.liveResponse ? null : extractMarker(m)
        const { parsed: parsedContent, remainder } = m.liveResponse ? { parsed: null, remainder: null } : parseJsonLikeWithRemainder(m.content)
        // Embedded markers with surrounding prose are handled by the nested renderer, preserving the prose.
        const contentMarker = !remainder ? extractMarker(parsedContent) : null
        const marker = rootMarker || contentMarker
        const lane = laneByIndex[idx]
        const lanes = execId ? lanesByIndex[idx] : 0
        const prevConn = execId ? prevSame[idx] : false
        const nextConn = execId ? nextSame[idx] : false

        if (marker) {
          const key = keys[idx]
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
            <div key={key} data-awfl-message-key={key} className={styles.row}>
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
        const key = keys[idx]
        const messageExpandedKey = `${key}:message`
        const messageExpanded = expandedByKey[messageExpandedKey] ?? false

        const tsString = (m as any)?.create_time
          ? new Date((typeof (m as any).create_time === 'number' ? ((m as any).create_time as number) * 1000 : Date.parse(String((m as any).create_time)))).toLocaleString()
          : null
        const rawCost: any = (m as any)?.cost
        const costNum = typeof rawCost === 'string' ? parseFloat(rawCost) : rawCost
        const costString = formatUsd(costNum)
        const metaParts: string[] = []
        if (tsString && showTimestamps) metaParts.push(tsString)
        if (costString && showCosts) metaParts.push(costString)
        const metaText = metaParts.join(' · ')

        const assistantLabel = assistantName?.trim().length ? assistantName : 'Assistant'
        const technical = role === 'system' || (modern && role !== 'user' && role !== 'assistant')
        const bubbleVariant = role === 'user' ? styles.bubbleUser : technical ? styles.bubbleSystem : styles.bubbleAssistant
        const labelVariant = role === 'user' ? styles.labelUser : technical ? styles.labelSystem : styles.labelAssistant

        const calls = activity?.calls.get(idx)
        const result = activity?.results.get(idx)
        // Activity rows stay at their original timeline position, including results
        // from interleaved execution branches. The detailed view is unchanged.
        if (result || calls?.length) {
          return <div key={key} data-awfl-message-key={key} className={styles.row}>
            {!hideExecGutter ? <ExecGutter lane={lane} lanes={lanes} showDot prevSame={prevConn} nextSame={nextConn}/> : null}
            <div className={styles.contentFlex}>
              {content && !result && <div className={cx(styles.bubble, bubbleVariant)}>
                <div className={cx(styles.label, labelVariant)}>{role === 'assistant' ? assistantLabel : String(role).toUpperCase()}</div>
                {renderNestedBranch({text:content, sessionId, idToken, keyBase:key + ':content', rich:role === 'assistant', expandedByKey, onExpandedChange})}
              </div>}
              {calls?.length ? <ToolCallActivity calls={calls} message={m} open={messageExpanded} onOpenChange={expanded => onExpandedChange(messageExpandedKey, expanded)}/> : null}
              {result && <ToolResultActivity result={result} message={m} open={messageExpanded} onOpenChange={expanded => onExpandedChange(messageExpandedKey, expanded)}/>}
              {metaText && <div className={styles.meta}>{metaText}</div>}
            </div>
          </div>
        }

        // Ordinary assistant text (including live deltas) follows one rendering path.
        // Do not collapse long responses on persistence or remount the Markdown renderer.
        if (modern && role === 'assistant' && content && !toolCalls?.length &&
          (m.liveResponse || !splitAtFirstMarker(content))) {
          return (
            <div key={key} data-awfl-message-key={key} className={styles.row} data-live-response={m.liveResponse ? m.responseId : undefined}>
              {!hideExecGutter ? <ExecGutter lane={lane} lanes={lanes} showDot prevSame={prevConn} nextSame={nextConn} /> : null}
              <div className={cx(styles.bubble, styles.bubbleAssistant)}>
                <div className={cx(styles.label, styles.labelAssistant)}>{assistantLabel}</div>
                <MarkdownMessage text={content} />
                {!m.liveResponse && <div className={styles.messageFooter}>
                  <CopyTextButton label="Copy response" getText={() => content}/>
                  {metaText && <div className={styles.meta}>{metaText}</div>}
                </div>}
              </div>
            </div>
          )
        }

        return (
          <div key={key} data-awfl-message-key={key} className={styles.row}>
            {!hideExecGutter ? <ExecGutter lane={lane} lanes={lanes} showDot prevSame={prevConn} nextSame={nextConn} /> : null}
            <div className={cx(styles.bubble, bubbleVariant)}>
              <div className={cx(styles.label, labelVariant)}>{role === 'assistant' ? assistantLabel : modern && role === 'user' ? 'You' : String(role).toUpperCase()}</div>

              <Collapsible expanded={messageExpanded} onExpandedChange={(expanded) => onExpandedChange(messageExpandedKey, expanded)}>
                <div className={styles.contentStack}>
                  {content ? (
                    <div className={styles.nestedStack}>
                      {renderNestedBranch({
                        text: content,
                        sessionId,
                        idToken,
                        keyBase: `${key}:content`,
                        rich: modern && role === 'assistant',
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
