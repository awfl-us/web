import { useEffect, useRef, useState } from 'react'

export type UseScrollHomeOptions = {
  containerRef: React.RefObject<HTMLElement | null>
  // When home is 'bottom', an anchor at the end of the list provides reliable scrolling across layouts.
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
  anchorRef,
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

  // Helper to compute distance-from-home and booleans
  function compute(el: HTMLElement) {
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
      const { atHome, awaySticky } = compute(el)
      setIsAtHome(atHome)
      if (awaySticky) awayRef.current = true
      if (atHome) awayRef.current = false // reset sticky when user returns home
    }

    function onUserContentExpand() {
      // A user-initiated expand/collapse likely changed content height without a scroll event.
      // Treat this as an explicit "away" interaction so we don't auto-scroll on the next item.
      awayRef.current = true
      setIsAtHome(false)
    }

    // Initialize
    {
      const { atHome, awaySticky } = compute(el)
      setIsAtHome(atHome)
      if (awaySticky) awayRef.current = true
      if (atHome) awayRef.current = false
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    el.addEventListener('awfl:user-content-expand', onUserContentExpand as EventListener)

    return () => {
      el.removeEventListener('scroll', onScroll)
      el.removeEventListener('awfl:user-content-expand', onUserContentExpand as EventListener)
    }
  }, [containerRef, enabled, home, threshold, stickyAwayThreshold])

  // Reset counters when key (e.g., session/view) changes
  useEffect(() => {
    prevCountRef.current = 0
    didInitialRef.current = false
    awayRef.current = false
  }, [key])

  // Scroll on initial load or when new items arrive and user is at home
  useEffect(() => {
    if (!enabled) return
    const el = containerRef.current
    if (!el) return

    const prev = prevCountRef.current
    const count = itemCount || 0
    const isInitial = prev === 0 && count > 0
    const hasNew = count > prev

    function scrollToHome(behavior: ScrollBehavior) {
      if (home === 'bottom') {
        if (anchorRef?.current?.scrollIntoView) {
          anchorRef.current.scrollIntoView({ behavior, block: 'end' })
        } else {
          el.scrollTo({ top: el.scrollHeight, behavior })
        }
      } else {
        el.scrollTo({ top: 0, behavior })
      }
    }

    // Recompute "at home" at the time we decide whether to auto-scroll.
    const { atHome, awaySticky } = compute(el)

    if (isInitial) {
      // Always snap to home on first render with content
      requestAnimationFrame(() => scrollToHome('auto'))
      didInitialRef.current = true
      awayRef.current = false
    } else if (hasNew && atHome && !awayRef.current && !awaySticky) {
      // Only auto-scroll when user is at home and has not explicitly scrolled away
      requestAnimationFrame(() => scrollToHome('smooth'))
    }

    prevCountRef.current = count
  }, [itemCount, enabled, home, anchorRef, threshold, stickyAwayThreshold])

  return { isAtHome }
}
