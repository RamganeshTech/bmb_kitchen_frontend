import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { queryClient } from './lib/queryClient.ts'
import { QueryClientProvider } from '@tanstack/react-query'
import { store } from './features/store/store.ts'
import { Provider } from 'react-redux'


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store} >
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
  </Provider>
  </StrictMode >,
)
