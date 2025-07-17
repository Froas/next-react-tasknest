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

const iconDirectory = resolve(__dirname, 'icons')

export default defineConfig({
  shortcuts: [
    { logo: 'i-logos-vue w-6em h-6em transform transition-800' },
  ],
  presets: [
    presetWind3(),
    presetAttributify(),
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
})
