import { defineConfig } from 'tsup'
// Use the css-modules plugin that supports runtime injection
// Note: this is 'esbuild-css-modules-plugin' (NOT 'esbuild-plugin-css-modules')
import cssModulesPlugin from 'esbuild-css-modules-plugin'

export default defineConfig({
  // Build all source files so deep imports continue to resolve for dependents.
  // Exclude tests, stories, type decl files, and any duplicate wrapper files that
  // would collide with a sibling .tsx of the same basename.
  entry: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.*',
    '!src/**/*.spec.*',
    '!src/**/*.stories.*',
    '!src/**/__tests__/**',
    // Avoid duplicate outputs from wrapper + implementation with same basename.
    '!src/features/sessions/components/SessionSidebar.ts',
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
      // Only treat *.module.css as CSS Modules; global CSS is left alone
      filter: /\.module\.css$/,
      inject: true,
      // default export object (supports `import styles from '...module.css'`)
      namedExports: false,
      localsConvention: 'camelCaseOnly',
    }),
  ],
})
