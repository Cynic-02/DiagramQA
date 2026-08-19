import puppeteer from 'puppeteer-core'

const browser = await puppeteer.launch({
  headless: 'new',
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  defaultViewport: { width: 900, height: 520 },
})
const page = await browser.newPage()

await page.goto('http://localhost:3000/?debug=1', { waitUntil: 'networkidle0', timeout: 30000 })
await new Promise((r) => setTimeout(r, 2000))

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

await scrollToSection('Quality Assurance')
await new Promise((r) => setTimeout(r, 2500))
const debugText = await page.evaluate(() => {
  const nodes = document.querySelectorAll('[data-journey-stage] div')
  for (const n of nodes) {
    if (n.textContent && n.textContent.includes('fps')) return n.textContent
  }
  return null
})
console.log('DEBUG:', debugText)
await page.screenshot({ path: 'E:\\Website\\.zscripts\\_v_qa2.jpg', type: 'jpeg', quality: 60 })

await browser.close()
