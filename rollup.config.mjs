import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import postcss from 'rollup-plugin-postcss'
import esbuild from 'rollup-plugin-esbuild'
import fg from 'fast-glob'

// Expand multi-entry inputs while preserving src structure in dist
const input = await fg([
  'src/**/*.{ts,tsx}',
  '!src/**/*.d.ts',
  '!src/**/*.test.*',
  '!src/**/*.spec.*',
  '!src/**/*.stories.*',
  '!src/**/__tests__/**',

  // Exclude SPA/Vite app-only entrypoints and app folders
  '!src/main.tsx',
  '!src/App.tsx',
  '!src/pages/**',
  '!src/components/**',
  '!src/hooks/**',

  // Avoid duplicate basename collision with implementation .tsx
  '!src/features/sessions/components/SessionSidebar.ts',
])

const externalPkgs = ['react', 'react-dom', 'firebase']
const external = (id) => externalPkgs.some((pkg) => id === pkg || id.startsWith(pkg + '/')) || id === 'react/jsx-runtime'

export default {
  input,
  output: {
    dir: 'dist',
    format: 'esm',
    sourcemap: true,
    preserveModules: true,
    preserveModulesRoot: 'src',
  },
  external,
  plugins: [
    resolve({ extensions: ['.mjs', '.js', '.json', '.ts', '.tsx'] }),
    commonjs(),
    postcss({
      modules: { localsConvention: 'camelCaseOnly' },
      extract: 'styles.css',
      minimize: true,
    }),
    esbuild({ jsx: 'automatic', tsconfig: 'tsconfig.app.json', target: 'es2022' }),
  ],
}
