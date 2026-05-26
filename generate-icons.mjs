#!/usr/bin/env node
// Converts each app's resources/icon.svg → resources/icon.png (1024×1024)
// Run: node generate-icons.mjs
// Then: npx @capacitor/assets generate (inside each app dir)

// Resolve @resvg/resvg-js from the customer app's node_modules
import { createRequire } from 'module'
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(join(__dirname, 'app', 'package.json'))
const { Resvg } = require('@resvg/resvg-js')

const apps = [
  { dir: 'app',          label: 'customer' },
  { dir: 'apps/driver',  label: 'driver'   },
]

for (const { dir, label } of apps) {
  const svgPath = join(__dirname, dir, 'resources', 'icon.svg')
  const pngPath = join(__dirname, dir, 'resources', 'icon.png')

  const svg = readFileSync(svgPath, 'utf8')
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1024 },
  })
  const png = resvg.render().asPng()
  writeFileSync(pngPath, png)
  console.log(`✓ ${label}: ${pngPath} (${png.length} bytes)`)
}

console.log('\nDone! Now run in each app directory:')
console.log('  npx @capacitor/assets generate')
