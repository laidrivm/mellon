import {copyFileSync, existsSync, mkdirSync, rmSync} from 'node:fs'
import tailwind from 'bun-plugin-tailwind'

const DIST_DIR = './dist'

// Clean dist directory
if (existsSync(DIST_DIR)) {
  rmSync(DIST_DIR, {recursive: true})
}
mkdirSync(DIST_DIR, {recursive: true})

console.log('🔨 Building Mellon...\n')

// Build client (frontend + HTML)
console.log('📦 Building client...')
const clientBuild = await Bun.build({
  entrypoints: ['./src/index.html'],
  outdir: `${DIST_DIR}/public`,
  target: 'browser',
  minify: true,
  splitting: true,
  plugins: [tailwind],
  naming: {
    entry: '[dir]/[name].[ext]',
    chunk: '[name]-[hash].[ext]',
    asset: '[name]-[hash].[ext]'
  }
})

if (!clientBuild.success) {
  console.error('❌ Client build failed:')
  for (const log of clientBuild.logs) {
    console.error(log)
  }
  process.exit(1)
}
console.log(`✅ Client: ${clientBuild.outputs.length} files\n`)

// Build server
console.log('📦 Building server...')
const serverBuild = await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: DIST_DIR,
  target: 'bun',
  minify: false, // Keep runtime env checks intact
  external: ['nano'], // nano is a Node.js-only CouchDB client
  naming: {
    entry: '[dir]/[name].[ext]'
  }
})

if (!serverBuild.success) {
  console.error('❌ Server build failed:')
  for (const log of serverBuild.logs) {
    console.error(log)
  }
  process.exit(1)
}
console.log(`✅ Server: ${serverBuild.outputs.length} files\n`)

// Copy service worker (plain JS, no bundling needed)
console.log('📦 Copying service worker...')
copyFileSync('./src/service-worker.js', `${DIST_DIR}/public/service-worker.js`)
console.log('✅ Service worker copied\n')

// Copy static assets
console.log('📦 Copying static assets...')
copyFileSync('./src/logo.svg', `${DIST_DIR}/public/logo.svg`)
console.log('✅ Static assets copied\n')

console.log('🎉 Build complete!')
console.log(`   Output: ${DIST_DIR}/`)
console.log('   - index.js (server)')
console.log('   - public/ (client + assets)')
