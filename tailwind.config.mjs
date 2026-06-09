/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // Site palette
        void: '#0d1117',
        surface: '#161b22',
        border: '#21262d',
        muted: '#484f58',
        dim: '#8b949e',
        bright: '#c9d1d9',
        star: '#e6edf3',
        // Accent — orange/solar
        solar: {
          50:  '#fff7ed',
          100: '#ffedd5',
          300: '#fbbf24',
          400: '#f97316',
          500: '#ea580c',
          600: '#d97706',
          700: '#dc2626',
        },
        // Gaming — teal
        game: {
          400: '#2dd4bf',
          600: '#0d9488',
        },
        // TAU — purple
        tau: {
          200: '#c4b5fd',
          400: '#a78bfa',
          900: '#160d2e',
          border: '#4c1d95',
        },
        // Crypto — teal
        crypto: {
          400: '#2dd4bf',
          900: '#041c20',
          border: '#0d9488',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      typography: (theme) => ({
        invert: {
          css: {
            '--tw-prose-body': theme('colors.bright'),
            '--tw-prose-headings': theme('colors.star'),
            '--tw-prose-lead': theme('colors.dim'),
            '--tw-prose-links': theme('colors.solar.300'),
            '--tw-prose-bold': theme('colors.star'),
            '--tw-prose-counters': theme('colors.dim'),
            '--tw-prose-bullets': theme('colors.muted'),
            '--tw-prose-hr': theme('colors.border'),
            '--tw-prose-quotes': theme('colors.bright'),
            '--tw-prose-quote-borders': theme('colors.solar.600'),
            '--tw-prose-captions': theme('colors.dim'),
            '--tw-prose-code': theme('colors.solar.300'),
            '--tw-prose-pre-code': theme('colors.bright'),
            '--tw-prose-pre-bg': theme('colors.surface'),
            '--tw-prose-th-borders': theme('colors.border'),
            '--tw-prose-td-borders': theme('colors.border'),
          },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
