import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    format: ['esm'],
    platform: 'browser',
    target: 'es2020',
    dts: true,
    sourcemap: true,
    clean: true,
    minify: false,
  },
  {
    entry: { araute: 'src/index.ts' },
    format: ['iife'],
    globalName: 'Araute',
    platform: 'browser',
    target: 'es2020',
    sourcemap: true,
    minify: true,
    outExtension: () => ({ js: '.global.js' }),
    footer: {
      js: 'if(typeof window!=="undefined"&&window.Araute&&typeof window.Araute.Araute==="function"){window.Araute=Object.assign(window.Araute.Araute,window.Araute);}',
    },
  },
])
