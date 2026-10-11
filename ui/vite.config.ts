import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', 'VELOCITEMPO_')
    return {
        plugins: [react()],
        server: {
            // Backend (../api, `cargo run`) listens on :3000; VELOCITEMPO_API points elsewhere, e.g. a test instance.
            proxy: {
                '/api': env.VELOCITEMPO_API ?? 'http://localhost:3000',
            },
        },
    }
})
