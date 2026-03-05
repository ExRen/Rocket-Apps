import type { Config } from 'tailwindcss'

const config: Config = {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'asabri-blue': '#0D2B6B',
                'asabri-gold': '#C9A227',
                'asabri-light': '#E8EEF8',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            }
        },
    },
    plugins: [],
    corePlugins: {
        preflight: false,
    },
}

export default config
