import { useSyncExternalStore } from 'react'
import { localDataStore } from '../domain/localDataStore'

/**
 * Increments on every write to the local store. Include it in the dependencies
 * of an effect that reads the store and the read repeats when the data changes.
 */
export function useLocalDataVersion(): number {
  return useSyncExternalStore(localDataStore.subscribe, localDataStore.getVersion)
}
