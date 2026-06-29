import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0f172a',
        canvas: '#f1f5f9',
      },
    },
  },
  plugins: [],
}

export default config
