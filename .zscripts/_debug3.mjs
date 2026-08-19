import puppeteer from 'puppeteer-core'

const browser = await puppeteer.launch({
  headless: 'new',
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  defaultViewport: { width: 900, height: 520 },
})
const page = await browser.newPage()

await page.goto('http://localhost:3000/?debug=1', { waitUntil: 'networkidle0', timeout: 30000 })
await new Promise((r) => setTimeout(r, 2000))

const readDebug = async () => {
  return page.evaluate(() => {
    const nodes = document.querySelectorAll('[data-journey-stage] div')
    for (const n of nodes) {
      if (n.textContent && n.textContent.includes('fps')) return n.textContent
    }
    return null
  })
}

const scrollToScene = async (sceneIndex) => {
  await page.evaluate((idx) => {
    const hero = document.getElementById('hero')
    const rect = hero.getBoundingClientRect()
    const docTop = window.scrollY + rect.top
    const vh = window.innerHeight
    const target = docTop + idx * vh + vh / 2 - vh / 2
    window.scrollTo(0, target)
  }, sceneIndex)
}

// scene index 4 = circuit-board ("Quality Assurance")
await scrollToScene(4)
await new Promise((r) => setTimeout(r, 2500))
console.log('QA debug:', await readDebug())
await page.screenshot({ path: 'E:\\Website\\.zscripts\\_v_qa3.jpg', type: 'jpeg', quality: 60 })

// scene index 5 = spaceship ("Live Progress")
await scrollToScene(5)
await new Promise((r) => setTimeout(r, 2500))
console.log('Live debug:', await readDebug())
await page.screenshot({ path: 'E:\\Website\\.zscripts\\_v_live3.jpg', type: 'jpeg', quality: 60 })

await browser.close()
