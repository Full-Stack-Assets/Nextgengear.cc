import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './content/**/*.{md,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        // Crisp light-first tech-review palette (electric-blue accent).
        ink: '#0f172a',      // near-black slate — headlines/body
        paper: '#ffffff',    // page background
        surface: '#f4f6fa',  // subtle raised/alt background
        accent: '#2563eb',   // electric blue — 4.5:1+ on white (WCAG AA)
        'accent-deep': '#1d4ed8',
        muted: '#5b6472',    // secondary text — AA on white
        rule: '#e2e8f0',     // hairline borders
        // Intermediate zinc shade used by the VaporLoop demo (/vaporloop)
        'zinc-850': '#1f1f23',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.05), 0 4px 12px rgba(15, 23, 42, 0.05)',
        'card-hover': '0 2px 4px rgba(15, 23, 42, 0.06), 0 12px 28px rgba(15, 23, 42, 0.12)',
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
          },
        },
      },
    },
  },
  plugins: [],
};

export default config;
