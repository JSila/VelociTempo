import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import '@tabler/core/dist/css/tabler.min.css'
import './index.css'
import { store } from './app/store'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <Provider store={store}>
            <App />
        </Provider>
    </StrictMode>,
)
