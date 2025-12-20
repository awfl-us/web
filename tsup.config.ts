import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/**/*.ts',
    'src/**/*.tsx',
    '!src/**/__tests__/**',
    '!src/**/*.test.*',
    '!src/**/*.spec.*',
    '!src/**/mocks/**',
    '!src/**/stories/**',
    // Avoid duplicate basename collisions where a wrapper .ts re-exports a .tsx component
    '!src/features/sessions/components/SessionSidebar.ts',
  ],
  outDir: 'dist',
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false, // keep per-file outputs stable; no shared chunks
  treeshake: true,
  target: 'es2022',
  external: ['react', 'react-dom', 'firebase'],
  tsconfig: 'tsconfig.app.json',
  // Ensure any imported CSS (including CSS Modules) is injected as a <style> tag at runtime
  injectStyle: true,
  esbuildOptions(options) {
    options.jsx = 'automatic'
    options.outbase = 'src' // ensure dist mirrors src (drop the src/ prefix)
  },
})
