import { useCallback, useState } from 'react'
import { defaultAppearance, normalizeAppearance, type Appearance } from './appearance'

function read(account: string | null): Appearance {
  if (!account) return { ...defaultAppearance }
  try {
    return normalizeAppearance(JSON.parse(localStorage.getItem('awfl:appearance:v1:' + account) || 'null'))
  } catch { return { ...defaultAppearance } }
}
// Key the snapshot by account; never expose a previous account's preferences.
export function useAppearance(account: string | null) {
  const [snapshot, setSnapshot] = useState(() => ({ account, value: read(account) }))
  const value = snapshot.account === account ? snapshot.value : read(account)
  const setAppearance = useCallback((next: Appearance) => {
    const normalized = normalizeAppearance(next)
    setSnapshot({ account, value: normalized })
    if (account) {
      try { localStorage.setItem('awfl:appearance:v1:' + account, JSON.stringify(normalized)) } catch { /* storage optional */ }
    }
  }, [account])
  return { appearance: value, setAppearance }
}
