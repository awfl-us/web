import { useTopicContextYoj } from '../../../hooks/useTopicContextYoj'
import { useLiveResponses } from './useLiveResponses'
import { useSessionTimeline } from './useSessionTimeline'

type Options={sessionId?:string|null;projectId?:string|null;userId?:string|null;idToken?:string|null;enabled:boolean;mode:'context'|'transcript'}

const EMPTY: never[] = []

// Compatibility boundary: exactly one history transport is active. Existing
// prompt context remains explicitly accessible while the transcript is piloted.
export function useConversation({mode,enabled,...scope}:Options) {
  const context=useTopicContextYoj({...scope,enabled:enabled&&mode==='context'})
  const transcript=useSessionTimeline({...scope,enabled:enabled&&mode==='transcript'})
  const history=mode==='transcript'?transcript:context
  const messages=useLiveResponses({...scope,enabled,messages:enabled?history.messages:EMPTY,reload:history.reload})
  return {messages,running:history.running,error:history.error,reload:history.reload,transcript}
}
