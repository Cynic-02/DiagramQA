import puppeteer from 'puppeteer-core'

const VW = 900, VH = 520

const browser = await puppeteer.launch({
  headless: 'new',
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  defaultViewport: { width: VW, height: VH },
  args: ['--no-sandbox', '--disable-gpu', '--user-data-dir=C:\\Temp\\puppeteer-verify-profile'],
})
const page = await browser.newPage()
page.on('pageerror', (e) => console.log('[pageerror]', e.message))
page.on('console', (m) => { if (m.type() === 'error') console.log('[console-error]', m.text()) })

await page.goto('http://127.0.0.1:3000/?debug=1', { waitUntil: 'domcontentloaded', timeout: 15000 })
await new Promise((r) => setTimeout(r, 3500))

const readDebug = async () => page.evaluate(() => {
  const wrap = document.querySelector('[data-journey-stage]')
  if (!wrap) return null
  const el = Array.from(wrap.children).find((c) => c.textContent && c.textContent.startsWith('fps'))
  if (!el) return null
  const t = el.textContent
  const g = t.match(/global ([\-\d.]+)/)
  const l = t.match(/local ([\-\d.]+)/)
  const s = t.match(/fps \d+([\s\S]*?)local/)
  return { text: t, global: g ? parseFloat(g[1]) : null, local: l ? parseFloat(l[1]) : null }
})

const d0 = await readDebug()
console.log('at scrollY=0:', JSON.stringify(d0))
