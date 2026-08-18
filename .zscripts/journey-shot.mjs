/**
 * Visual self-test for the scroll journey.
 * Scrolls to precise fractions of the page and screenshots each stop.
 *   node .zscripts/journey-shot.mjs [outDir]
 */
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const OUT = process.argv[2] || '.zscripts/shots'
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
fs.mkdirSync(OUT, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: [
    '--enable-unsafe-swiftshader',
    '--use-gl=angle',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--no-sandbox',
    '--window-size=1600,900',
  ],
  defaultViewport: { width: 1600, height: 900 },
})

const page = await browser.newPage()
const logs = []
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`))
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))
page.on('requestfailed', (r) =>
  logs.push(`[404?] ${r.url()} ${r.failure()?.errorText}`)
)

await page.goto('http://localhost:3000/?debug=1', {
  waitUntil: 'networkidle2',
  timeout: 120000,
})
await new Promise((r) => setTimeout(r, 6000))

const metrics = await page.evaluate(() => {
  const c = document.querySelector('canvas')
  return {
    docHeight: document.body.scrollHeight,
    vh: window.innerHeight,
    canvas: c ? { w: c.width, h: c.height } : null,
    webgl: (() => {
      try {
        return !!document.createElement('canvas').getContext('webgl2')
      } catch {
        return false
      }
    })(),
  }
})
console.log('metrics', JSON.stringify(metrics))

// stop positions expressed in "section units" so they land on centres
// and on the exact midpoints between centres
const vh = metrics.vh
const stops = []
for (const g of [0, 0.5, 1, 1.5, 2, 2.5, 3, 5.5, 11, 11.5, 12, 12.5, 13, 14]) {
  stops.push({ label: `g${g}`, y: g * vh })
}

for (const s of stops) {
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), s.y)
  await new Promise((r) => setTimeout(r, 2500))
  await page.screenshot({ path: `${OUT}/${s.label}.png` })
}

// reverse scroll check
await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), 1.5 * vh)
await new Promise((r) => setTimeout(r, 2500))
await page.screenshot({ path: `${OUT}/reverse-g1.5.png` })

fs.writeFileSync(`${OUT}/console.log`, logs.join('\n'))
console.log('--- console ---')
console.log(logs.slice(0, 60).join('\n'))
await browser.close()
