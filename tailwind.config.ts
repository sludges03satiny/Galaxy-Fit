import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Background scale
        bg: {
          DEFAULT: '#0a0a08',
          2: '#111110',
          3: '#1a1a17',
          4: '#222220',
        },
        // Border/line scale
        line: {
          DEFAULT: '#2a2a25',
          2: '#3a3a33',
        },
        // Text scale
        text: {
          DEFAULT: '#e8e6dc',
          2: '#9e9b8e',
          3: '#5a5850',
        },
        // Accent palette
        lime: '#c8f050',
        yellow: '#f0c828',
        red: {
          alert: '#f05050',
        },
        blue: {
          info: '#50c8f0',
        },
        // Semantic aliases
        accent: '#c8f050',
        'accent-2': '#f0c828',
        'accent-3': '#f05050',
        'accent-4': '#50c8f0',
        'accent-dim': 'rgba(200,240,80,0.1)',
        // Status colors
        status: {
          green: '#50f090',
          yellow: '#f0c828',
          red: '#f05050',
          locked: '#3a3a33',
        }
      },
      fontFamily: {
        heading: ['Bebas Neue', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
        body: ['DM Sans', 'sans-serif'],
      },
      fontSize: {
        'display-xl': ['4rem', { lineHeight: '1', letterSpacing: '0.04em' }],
        'display-lg': ['3rem', { lineHeight: '1', letterSpacing: '0.04em' }],
        'display-md': ['2rem', { lineHeight: '1.1', letterSpacing: '0.04em' }],
        'display-sm': ['1.5rem', { lineHeight: '1.1', letterSpacing: '0.06em' }],
        'mono-xs': ['0.6rem', { lineHeight: '1.4', letterSpacing: '0.1em' }],
        'mono-sm': ['0.7rem', { lineHeight: '1.4', letterSpacing: '0.08em' }],
        'mono-base': ['0.8rem', { lineHeight: '1.5', letterSpacing: '0.06em' }],
      },
      borderRadius: {
        DEFAULT: '3px',
        sm: '2px',
        md: '4px',
        lg: '6px',
        xl: '8px',
      },
      boxShadow: {
        lime: '0 0 20px rgba(200,240,80,0.15)',
        'lime-lg': '0 0 40px rgba(200,240,80,0.2)',
        yellow: '0 0 20px rgba(240,200,40,0.15)',
        red: '0 0 20px rgba(240,80,80,0.2)',
        blue: '0 0 20px rgba(80,200,240,0.15)',
        panel: '0 4px 24px rgba(0,0,0,0.4)',
      },
      keyframes: {
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(200,240,80,0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(200,240,80,0.6)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        }
      },
      animation: {
        'pulse-slow': 'pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'fade-up': 'fadeUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      backgroundImage: {
        noise: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E\")",
        'lime-gradient': 'linear-gradient(135deg, rgba(200,240,80,0.15) 0%, transparent 60%)',
        'panel-gradient': 'linear-gradient(180deg, #1a1a17 0%, #111110 100%)',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      },
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'nav-height': '52px',
        'bottom-nav-height': '64px',
      }
    },
  },
  plugins: [],
}

export default config
