import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import sharp from 'sharp'
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = '.zscripts/shots'
fs.mkdirSync(OUT, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--enable-unsafe-swiftshader', '--no-sandbox', '--window-size=1920,1000'],
  defaultViewport: { width: 1920, height: 1000 },
})
const page = await browser.newPage()
const errs = []
page.on('pageerror', (e) => errs.push('[pageerror] ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errs.push('[err] ' + m.text()) })

await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2', timeout: 120000 })
await new Promise((r) => setTimeout(r, 9000))
await page.mouse.move(40, 980)

const vh = 1000
const names = ['01-vision', '02-bloom', '03-answering', '04-verify', '05-qa', '06-live']
for (let i = 0; i < 6; i++) {
  await page.evaluate((v) => window.scrollTo({ top: v, behavior: 'instant' }), i * vh)
  await new Promise((r) => setTimeout(r, 2600))
  const p = `${OUT}/${names[i]}.png`
  await page.screenshot({ path: p })
  await sharp(p).resize(720).jpeg({ quality: 78 }).toFile(p.replace('.png', '.jpg'))
  fs.unlinkSync(p)
}

// the hand-off into Features — the "two websites" seam
const g = await page.evaluate(() => {
  const hero = document.getElementById('hero')
  return { contH: hero.parentElement.offsetHeight }
})
await page.evaluate((v) => window.scrollTo({ top: v, behavior: 'instant' }), g.contH - vh * 0.55)
await new Promise((r) => setTimeout(r, 2200))
await page.screenshot({ path: `${OUT}/seam.png` })
await sharp(`${OUT}/seam.png`).resize(720).jpeg({ quality: 78 }).toFile(`${OUT}/seam.jpg`)
fs.unlinkSync(`${OUT}/seam.png`)

console.log('containerH', g.contH, 'sections', 6)
console.log('ERRORS:', errs.slice(0, 10).join('\n') || 'none')
await browser.close()
