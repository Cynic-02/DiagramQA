import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const OUT = 'E:\\Website\\.zscripts\\verify-shots'
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
fs.mkdirSync(OUT, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--window-size=1600,900'],
  defaultViewport: { width: 1600, height: 900 },
})

const page = await browser.newPage()
const logs = []
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))
page.on('requestfailed', (r) => logs.push(`[404?] ${r.url()} ${r.failure()?.errorText}`))

// ---- homepage, light ----
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2', timeout: 60000 })
await new Promise((r) => setTimeout(r, 2500))
await page.screenshot({ path: `${OUT}/home-light.png` })

// ---- homepage, dark ----
await page.evaluate(() => {
  document.documentElement.setAttribute('data-theme', 'dark')
  localStorage.setItem('theme', 'dark')
})
await new Promise((r) => setTimeout(r, 1200))
await page.screenshot({ path: `${OUT}/home-dark.png` })

// ---- login page, light ----
await page.evaluate(() => {
  document.documentElement.setAttribute('data-theme', 'light')
  localStorage.setItem('theme', 'light')
})
await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2', timeout: 60000 })
await new Promise((r) => setTimeout(r, 3500))
await page.screenshot({ path: `${OUT}/login-light.png` })

// ---- login page, dark ----
await page.evaluate(() => {
  document.documentElement.setAttribute('data-theme', 'dark')
  localStorage.setItem('theme', 'dark')
})
await new Promise((r) => setTimeout(r, 1200))
await page.screenshot({ path: `${OUT}/login-dark.png` })

fs.writeFileSync(`${OUT}/console.log`, logs.join('\n'))
console.log('DONE')
console.log(logs.slice(0, 40).join('\n'))
await browser.close()
