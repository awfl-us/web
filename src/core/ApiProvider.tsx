import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { getDefaultApiBase, setDefaultApiBase } from './apiConfig'

export type ApiConfig = {
  baseUrl: string
  setBaseUrl: (url: string) => void
}

const ApiConfigContext = createContext<ApiConfig | null>(null)

export type ApiProviderProps = {
  baseUrl?: string
  children: React.ReactNode
}

export function ApiProvider(props: ApiProviderProps) {
  const { baseUrl: propBase, children } = props
  const mounted = useRef(false)
  const [baseUrl, setBaseUrlState] = useState<string>(() => getDefaultApiBase())

  const setBaseUrl = useCallback((url: string) => {
    if (typeof url !== 'string') return
    const next = url.trim()
    if (!next) return
    setDefaultApiBase(next)
    setBaseUrlState(getDefaultApiBase())
  }, [])

  // Sync prop to runtime config on mount/when changed
  useEffect(() => {
    const next = (propBase ?? '').toString().trim()
    if (next && next !== getDefaultApiBase()) {
      setDefaultApiBase(next)
      setBaseUrlState(getDefaultApiBase())
    } else if (!mounted.current) {
      // Ensure state reflects any HTML global that may have been applied in apiConfig.ts
      setBaseUrlState(getDefaultApiBase())
    }
    mounted.current = true
  }, [propBase])

  const value = useMemo<ApiConfig>(() => ({ baseUrl, setBaseUrl }), [baseUrl, setBaseUrl])

  return <ApiConfigContext.Provider value={value}>{children}</ApiConfigContext.Provider>
}

export function useApiConfig(): ApiConfig {
  const ctx = useContext(ApiConfigContext)
  if (ctx) return ctx
  // Fallback when used without a provider: read from runtime config and expose a setter
  return {
    baseUrl: getDefaultApiBase(),
    setBaseUrl: (url: string) => setDefaultApiBase(url),
  }
}
