import { useEffect, useLayoutEffect, useRef, useState } from 'react'

export type UseScrollHomeOptions = {
  containerRef: React.RefObject<HTMLElement | null>
  // Retained for callers using the old API; scrolling only containerRef avoids moving ancestors.
  anchorRef?: React.RefObject<HTMLElement | null>
  itemCount: number
  home: 'bottom' | 'top'
  enabled?: boolean
  // When this key changes (e.g., sessionId or view mode), the hook resets initial scrolling state.
  key?: string | number | null | undefined
  threshold?: number // px tolerance from home
  // Optional: once the user scrolls away beyond this distance, we will not auto-scroll again
  // until they explicitly return to home (within `threshold`). Helps prevent jumps when
  // content above/below changes height without scroll events.
  stickyAwayThreshold?: number // px distance from home to consider the user "away"
}

export function useScrollHome({
  containerRef,
  itemCount,
  home,
  enabled = true,
  key,
  threshold = 8,
  stickyAwayThreshold = 48,
}: UseScrollHomeOptions) {
  const [isAtHome, setIsAtHome] = useState(true)
  const prevCountRef = useRef(0)
  const didInitialRef = useRef(false)
  const awayRef = useRef(false) // sticky flag: user scrolled away far enough
  const lastObservedAtHomeRef = useRef(true) // based on user scroll/explicit measurements prior to new items

  // Helper to compute distance-from-home and booleans
  function compute(el: HTMLElement | null) {
    if (!el) {
      return { dist: 0, atHome: true, awaySticky: false }
    }
    const { scrollTop, scrollHeight, clientHeight } = el
    if (home === 'bottom') {
      const distFromBottom = scrollHeight - (scrollTop + clientHeight)
      return {
        dist: distFromBottom,
        atHome: distFromBottom <= threshold,
        awaySticky: distFromBottom > stickyAwayThreshold,
      }
    } else {
      const distFromTop = scrollTop
      return {
        dist: distFromTop,
        atHome: distFromTop <= threshold,
        awaySticky: distFromTop > stickyAwayThreshold,
      }
    }
  }

  // Recompute isAtHome based on scroll position and listen for explicit user-expansion events
  useEffect(() => {
    if (!enabled) return
    const el = containerRef.current
    if (!el) return

    function onScroll() {
      const node = containerRef.current
      const { atHome, awaySticky } = compute(node)
      setIsAtHome(atHome)
      lastObservedAtHomeRef.current = atHome
      if (awaySticky) awayRef.current = true
      if (atHome) awayRef.current = false // reset sticky when user returns home
    }

    function onUserContentExpand() {
      // A user-initiated expand/collapse likely changed content height without a scroll event.
      // Treat this as an explicit "away" interaction so we don't auto-scroll on the next item.
      awayRef.current = true
      setIsAtHome(false)
      lastObservedAtHomeRef.current = false
    }

    // Initialize
    {
      const { atHome, awaySticky } = compute(el)
      setIsAtHome(atHome)
      lastObservedAtHomeRef.current = atHome
      if (awaySticky) awayRef.current = true
      if (atHome) awayRef.current = false
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    el.addEventListener('awfl:user-content-expand', onUserContentExpand as EventListener)

    return () => {
      if (!el) return
      el.removeEventListener('scroll', onScroll)
      el.removeEventListener('awfl:user-content-expand', onUserContentExpand as EventListener)
    }
  }, [containerRef, enabled, home, threshold, stickyAwayThreshold])

  // Reset counters when key (e.g., session/view) changes
  useLayoutEffect(() => {
    prevCountRef.current = 0
    didInitialRef.current = false
    awayRef.current = false
    lastObservedAtHomeRef.current = true
  }, [key])

  // Preserve position and/or scroll to home on initial load or when new items arrive
  useLayoutEffect(() => {
    if (!enabled) return

    const node = containerRef.current
    if (!node) return
    const nodeEl: HTMLElement = node

    const prev = prevCountRef.current
    const count = itemCount || 0
    // A transient empty update must not look like a new session and snap the reader to bottom.
    const isInitial = !didInitialRef.current && count > 0
    const hasCountChange = count !== prev

    function scrollToHome(behavior: ScrollBehavior) {
      nodeEl.scrollTo({ top: home === 'bottom' ? nodeEl.scrollHeight : 0, behavior })
    }

    // Measurement at decision time (may reflect content shifts)
    const { atHome: nowAtHome, awaySticky } = compute(nodeEl)
    const wasAtHome = lastObservedAtHomeRef.current
    const userScrolledAway = awayRef.current

    if (isInitial) {
      // Always snap to home on first render with content
      scrollToHome('auto')
      didInitialRef.current = true
      awayRef.current = false
    } else if (!wasAtHome || userScrolledAway) {
      // Leave the viewport untouched when reading history. The browser's native
      // scroll anchoring already handles insertions above the visible messages;
      // adding the full height delta here incorrectly follows appended messages.
    } else if (hasCountChange) {
      // User was at home; keep them pinned there on updates
      if (!userScrolledAway && (wasAtHome || (nowAtHome && !awaySticky))) {
        scrollToHome('auto')
      }
    }

    // Update refs for next pass
    prevCountRef.current = count
  }, [itemCount, enabled, home, threshold, stickyAwayThreshold, containerRef])

  return { isAtHome }
}
