import puppeteer from 'puppeteer-core'

const VW = 900, VH = 520

const browser = await puppeteer.launch({
  headless: 'new',
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  defaultViewport: { width: VW, height: VH },
  args: ['--no-sandbox', '--disable-gpu', '--user-data-dir=C:\\Temp\\puppeteer-verify2-profile'],
})
const page = await browser.newPage()
page.on('pageerror', (e) => console.log('[pageerror]', e.message))

await page.goto('http://127.0.0.1:3000/?debug=1', { waitUntil: 'domcontentloaded', timeout: 15000 })
await new Promise((r) => setTimeout(r, 3500))

const readDebug = async () => page.evaluate(() => {
  const wrap = document.querySelector('[data-journey-stage]')
  if (!wrap) return null
  const el = Array.from(wrap.children).find((c) => c.textContent && c.textContent.startsWith('fps'))
  if (!el) return null
  const t = el.textContent
  const g = t.match(/global ([\-\d.]+)/)
  return { text: t, global: g ? parseFloat(g[1]) : null }
})

const goToVisual = async (target, label) => {
  await page.evaluate((y) => window.scrollTo(0, y), target * VH)
  await new Promise((r) => setTimeout(r, 2200))
  const d = await readDebug()
  console.log(label, 'target', target, '-> actual', JSON.stringify(d))
}

console.log('hero:', JSON.stringify(await readDebug()))
await page.screenshot({ path: 'E:\\Website\\.zscripts\\_v2_hero.jpg', type: 'jpeg', quality: 65 })

await goToVisual(4, 'QA (circuit-board settled)')
await page.screenshot({ path: 'E:\\Website\\.zscripts\\_v2_qa.jpg', type: 'jpeg', quality: 65 })

await goToVisual(5, 'Live (spaceship settled)')
await page.screenshot({ path: 'E:\\Website\\.zscripts\\_v2_live.jpg', type: 'jpeg', quality: 65 })

await browser.close()
console.log('done')
