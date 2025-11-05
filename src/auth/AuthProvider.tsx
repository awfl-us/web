import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { onIdTokenChanged, signInWithPopup, signOut as firebaseSignOut, type User } from 'firebase/auth'
import { auth, provider } from '../lib/firebase'

export type AuthContextType = {
  user: User | null
  idToken: string | null
  loading: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Refresh the token slightly before it expires. Fallback to a sane interval when exp cannot be parsed.
const REFRESH_SKEW_MS = 60_000 // 1 minute early
const FALLBACK_REFRESH_MS = 10 * 60_000 // 10 minutes

function parseJwtExpMs(token: string | null): number | null {
  if (!token) return null
  try {
    const [, payloadBase64] = token.split('.')
    if (!payloadBase64) return null
    const payloadJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'))
    const payload = JSON.parse(payloadJson)
    const expSec = typeof payload?.exp === 'number' ? payload.exp : null
    return expSec ? expSec * 1000 : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [idToken, setIdToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshTimeoutRef = useRef<number | null>(null)
  const lastForcedRefreshAtRef = useRef<number>(0)

  const clearRefreshTimer = () => {
    if (refreshTimeoutRef.current != null) {
      clearTimeout(refreshTimeoutRef.current)
      refreshTimeoutRef.current = null
    }
  }

  const scheduleRefresh = (u: User | null, token: string | null) => {
    clearRefreshTimer()
    if (!u || !token) return

    const expMs = parseJwtExpMs(token)
    const now = Date.now()
    const delay = expMs ? Math.max(30_000, expMs - now - REFRESH_SKEW_MS) : FALLBACK_REFRESH_MS

    refreshTimeoutRef.current = window.setTimeout(async () => {
      try {
        // Force refresh to rotate the ID token
        await u.getIdToken(true)
      } catch {
        // Swallow; onIdTokenChanged will not fire if this fails, but we'll try again on next focus/interval
      }
    }, delay)
  }

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        try {
          const t = await u.getIdToken()
          setIdToken(t)
          scheduleRefresh(u, t)
        } catch {
          setIdToken(null)
          clearRefreshTimer()
        }
      } else {
        setIdToken(null)
        clearRefreshTimer()
      }
      setLoading(false)
    })
    return () => {
      clearRefreshTimer()
      unsubscribe()
    }
  }, [])

  // Refresh when the app regains focus/visibility (helps after sleep or long inactivity)
  useEffect(() => {
    const maybeForceRefresh = () => {
      const u = auth.currentUser
      if (!u) return
      const now = Date.now()
      if (now - lastForcedRefreshAtRef.current < 60_000) return // throttle to 1/min
      lastForcedRefreshAtRef.current = now
      u.getIdToken(true).catch(() => {})
    }

    const onFocus = () => maybeForceRefresh()
    const onVisibility = () => {
      if (document.visibilityState === 'visible') maybeForceRefresh()
    }

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  const signIn = async () => {
    await signInWithPopup(auth, provider)
  }

  const signOut = async () => {
    await firebaseSignOut(auth)
  }

  const value = useMemo(
    () => ({ user, idToken, loading, signIn, signOut }),
    [user, idToken, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
