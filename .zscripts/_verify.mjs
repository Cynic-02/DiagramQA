import puppeteer from 'puppeteer-core'

const browser = await puppeteer.launch({
  headless: 'new',
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  defaultViewport: { width: 900, height: 520 },
  args: [
    '--no-sandbox',
    '--disable-gpu',
    '--user-data-dir=C:\\Temp\\puppeteer-verify-profile',
  ],
})
console.log('browser launched')
const page = await browser.newPage()
page.on('pageerror', (err) => console.log('[pageerror]', err.message))
page.on('console', (msg) => {
  if (msg.type() === 'error') console.log('[console-error]', msg.text())
})

page.on('response', (res) => console.log('[response]', res.status(), res.url()))
page.on('requestfailed', (req) => console.log('[requestfailed]', req.url(), req.failure()?.errorText))

console.log('navigating...')
try {
  await page.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 })
  console.log('dom content loaded')
} catch (e) {
  console.log('[goto error]', e.message)
}
await new Promise((r) => setTimeout(r, 4000))
await page.screenshot({ path: 'E:\\Website\\.zscripts\\_v_hero.jpg', type: 'jpeg', quality: 60 })

const scrollToSection = async (label) => {
  return page.evaluate((lbl) => {
    const el = document.querySelector(`section[aria-label="${lbl}"]`)
    if (!el) return false
    const rect = el.getBoundingClientRect()
    const centerY = window.scrollY + rect.top + rect.height / 2 - window.innerHeight / 2
    window.scrollTo(0, centerY)
    return true
  }, label)
}

const okQA = await scrollToSection('Quality Assurance')
await new Promise((r) => setTimeout(r, 1800))
await page.screenshot({ path: 'E:\\Website\\.zscripts\\_v_qa.jpg', type: 'jpeg', quality: 60 })

const okLive = await scrollToSection('Live Progress')
await new Promise((r) => setTimeout(r, 1800))
await page.screenshot({ path: 'E:\\Website\\.zscripts\\_v_live.jpg', type: 'jpeg', quality: 60 })

console.log('found sections', { okQA, okLive })

await browser.close()
