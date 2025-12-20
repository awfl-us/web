import { defineConfig } from 'tsup'
import cssModulesPlugin from 'esbuild-plugin-css-modules'

export default defineConfig({
  // Build all source files so deep imports continue to resolve for dependents.
  // Exclude tests, stories, and type decl files.
  entry: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.*',
    '!src/**/*.spec.*',
    '!src/**/*.stories.*',
    '!src/**/__tests__/**',
  ],
  outDir: 'dist',
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false, // stable per-file outputs
  treeshake: true,
  target: 'es2022',
  external: ['react', 'react-dom', 'firebase'],
  tsconfig: 'tsconfig.app.json',

  // Let the CSS Modules plugin handle injection; disable tsup's generic CSS inject.
  injectStyle: false,

  esbuildOptions(options) {
    options.jsx = 'automatic'
    options.outbase = 'src' // mirror src structure under dist
  },

  // Ensure CSS Modules compile to a default-export object and styles are injected.
  esbuildPlugins: [
    cssModulesPlugin({
      inject: true,
      namedExports: false, // default export object (supports `import styles from '...module.css'`)
      localsConvention: 'camelCaseOnly',
    }),
  ],
})
