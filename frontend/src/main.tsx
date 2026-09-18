import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: { queries: { networkMode: 'offlineFirst' } },
})
const persister = createAsyncStoragePersister({ storage: window.localStorage })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
      <App />
    </PersistQueryClientProvider>
  </StrictMode>,
)
