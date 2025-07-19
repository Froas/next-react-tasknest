import { resolve } from 'node:path'
import { FileSystemIconLoader } from '@iconify/utils/lib/loader/node-loaders'
import { createLocalFontProcessor } from '@unocss/preset-web-fonts/local'
import { defineConfig } from '@unocss/vite'
import {
  presetAttributify,
  presetIcons,
  presetWebFonts,
  presetWind3,
} from 'unocss'
import { presetAnimations } from 'unocss-preset-animations'

const iconDirectory = resolve(__dirname, 'icons')

export default defineConfig({
  shortcuts: [
    { logo: 'i-logos-vue w-6em h-6em transform transition-800' },
  ],
  presets: [
    presetWind3(),
    presetAttributify(),
    presetAnimations(),
    presetIcons({
      extraProperties: {
        'display': 'inline-block',
        'vertical-align': 'middle',
      },
      collections: {
        custom: FileSystemIconLoader(iconDirectory),
      },
    }),
    presetWebFonts({
      provider: 'google',
      fonts: {
        'sans': 'Roboto',
        'mono': ['Fira Code', 'Fira Mono:400,700'],
        'lobster': 'Lobster',
        'geist': [
          {
            name: 'Geist',
            weights: ['400', '700'],
            italic: true,
          },
        ],
        'geist-mono': [
          {
            name: 'Geist Mono',
            weights: ['400', '700'],
            italic: true,
          },
        ],
      },
      processors: createLocalFontProcessor(),
    }),
  ],
  theme: {
    colors: {
      background: 'hsl(var(--background))',
      foreground: 'hsl(var(--foreground))',
      card: {
        DEFAULT: 'hsl(var(--card))',
        foreground: 'hsl(var(--card-foreground))',
      },
      popover: {
        DEFAULT: 'hsl(var(--popover))',
        foreground: 'hsl(var(--popover-foreground))',
      },
      primary: {
        DEFAULT: 'hsl(var(--primary))',
        foreground: 'hsl(var(--primary-foreground))',
      },
      secondary: {
        DEFAULT: 'hsl(var(--secondary))',
        foreground: 'hsl(var(--secondary-foreground))',
      },
      muted: {
        DEFAULT: 'hsl(var(--muted))',
        foreground: 'hsl(var(--muted-foreground))',
      },
      accent: {
        DEFAULT: 'hsl(var(--accent))',
        foreground: 'hsl(var(--accent-foreground))',
      },
      destructive: {
        DEFAULT: 'hsl(var(--destructive))',
        foreground: 'hsl(var(--destructive-foreground))',
      },
      border: 'hsl(var(--border))',
      input: 'hsl(var(--input))',
      ring: 'hsl(var(--ring))',
      chart: {
        1: 'hsl(var(--chart-1))',
        2: 'hsl(var(--chart-2))',
        3: 'hsl(var(--chart-3))',
        4: 'hsl(var(--chart-4))',
        5: 'hsl(var(--chart-5))',
      },
    },
    borderRadius: {
      lg: 'var(--radius)',
      md: 'calc(var(--radius) - 2px)',
      sm: 'calc(var(--radius) - 4px)',
    },
  },
  rules: [
    // Custom rules can be added here
  ],
  variants: [
    // Dark mode variant
    (matcher) => {
      if (!matcher.startsWith('dark:'))
        return matcher
      return {
        matcher: matcher.slice(5),
        selector: s => `.dark ${s}`,
      }
    },
  ],
})
