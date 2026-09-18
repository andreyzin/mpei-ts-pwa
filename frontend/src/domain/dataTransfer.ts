import { localDataStore } from './localDataStore'

export async function exportLocalData() {
  const snapshot = await localDataStore.exportSnapshot()
  await navigator.clipboard?.writeText(JSON.stringify(snapshot, null, 2))
}
