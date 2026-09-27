import { useEffect, useState } from 'react'
import type { AnalyticsConsent } from '../domain/models'
import { localDataStore } from '../domain/localDataStore'
import { useLocalDataVersion } from './useLocalDataVersion'

/** undefined while the preference is being read, so the banner does not flash. */
export function useAnalyticsConsent(): AnalyticsConsent | null | undefined {
  const version = useLocalDataVersion()
  const [consent, setConsent] = useState<AnalyticsConsent | null | undefined>(undefined)
  useEffect(() => {
    let active = true
    localDataStore.getPreferences().then((preferences) => {
      if (active) setConsent(preferences.analyticsConsent)
    })
    return () => {
      active = false
    }
  }, [version])
  return consent
}
