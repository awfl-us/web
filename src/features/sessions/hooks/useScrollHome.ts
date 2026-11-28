import { useLayoutEffect, useRef, useState } from 'react'
import { anchoredScrollTop, captureReadingAnchors, type ReadingAnchor } from '../utils/readingAnchor'

export type UseScrollHomeOptions = {
  containerRef: React.RefObject<HTMLElement | null>
  // Retained for existing consumers. Only the container is scrolled.
  anchorRef?: React.RefObject<HTMLElement | null>
  itemCount: number
  home: 'bottom' | 'top'
  enabled?: boolean
  key?: string | number | null | undefined
  threshold?: number
  // Deprecated: reading/follow intent is now independent of content growth.
  stickyAwayThreshold?: number
}

type Policy = {
  initialized: boolean
  mode: 'follow' | 'read'
  anchors: ReadingAnchor[]
  lastTop: number
  readerTop: number
}
const initialPolicy = (): Policy => ({initialized:false,mode:'follow',anchors:[],lastTop:0,readerTop:0})

// One owner for programmatic scrolling. Background changes apply the current
// policy; they never infer intent from a change in scrollHeight or message count.
export function useScrollHome({containerRef,itemCount,home,enabled=true,key,threshold=8}: UseScrollHomeOptions) {
  const [isAtHome,setIsAtHome] = useState(true)
  const applyRef = useRef<(() => void) | null>(null)
  const countRef = useRef(itemCount)
  countRef.current = itemCount

  useLayoutEffect(() => {
    if (!enabled) return
    const el = containerRef.current
    if (!el) return
    const p = initialPolicy()
    const previousOverflowAnchor = el.style.overflowAnchor
    // Explicit anchor restoration and native anchoring must not both compensate.
    el.style.overflowAnchor = 'none'
    const homeTop = () => home === 'bottom' ? Math.max(0,el.scrollHeight-el.clientHeight) : 0
    const atHome = () => Math.abs(el.scrollTop-homeTop()) <= threshold
    function remember() {
      p.readerTop = el!.scrollTop
      const next = captureReadingAnchors(el!)
      // A transient empty response should not erase the last known reading anchor.
      if (next.length) p.anchors = next
    }
    function apply() {
      if (!p.initialized && countRef.current > 0) p.initialized = true
      if (!p.initialized) return
      const target = p.mode === 'follow' ? homeTop() : anchoredScrollTop(el!,p.anchors,p.readerTop)
      const clamped = Math.max(0,Math.min(Math.max(0,el!.scrollHeight-el!.clientHeight),target))
      if (Math.abs(el!.scrollTop-clamped) > 0.5) el!.scrollTop = clamped
      p.lastTop = el!.scrollTop
      if (p.mode === 'read' && countRef.current > 0) remember()
      setIsAtHome(p.mode === 'follow')
    }
    function onScroll() {
      // Ignore the event produced by our own write (including a resize clamp
      // already reconciled in the layout/ResizeObserver callback).
      if (Math.abs(el!.scrollTop-p.lastTop) <= 0.5) return
      p.lastTop = el!.scrollTop
      p.mode = atHome() ? 'follow' : 'read'
      if (p.mode === 'read') remember()
      else p.anchors = []
      setIsAtHome(p.mode === 'follow')
    }
    function onExpand() {
      p.mode = 'read'
      p.lastTop = el!.scrollTop
      remember()
      setIsAtHome(false)
    }
    function onWheel(event: WheelEvent) {
      // A gesture away from home can precede its scroll event. Don't snap back
      // to home if a streaming update lands in that interval.
      if ((home === 'bottom' && event.deltaY < 0) || (home === 'top' && event.deltaY > 0)) onExpand()
    }
    const observer = new ResizeObserver(apply)
    observer.observe(el)
    if (el.firstElementChild) observer.observe(el.firstElementChild)
    el.addEventListener('scroll',onScroll,{passive:true})
    el.addEventListener('wheel',onWheel,{passive:true})
    el.addEventListener('awfl:user-content-expand',onExpand)
    applyRef.current = apply
    apply()
    return () => {
      applyRef.current = null
      observer.disconnect()
      el.removeEventListener('scroll',onScroll)
      el.removeEventListener('wheel',onWheel)
      el.removeEventListener('awfl:user-content-expand',onExpand)
      el.style.overflowAnchor = previousOverflowAnchor
    }
  },[containerRef,enabled,key,home,threshold])

  // Run after React updates the timeline even when itemCount is unchanged.
  // ResizeObserver also handles asynchronous height/layout changes.
  useLayoutEffect(() => { applyRef.current?.() })
  return {isAtHome}
}
