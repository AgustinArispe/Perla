// QA del artefacto documental con navegador headless; no abre la aplicación ni su base.
const { chromium } = require('playwright');
const { pathToFileURL } = require('node:url');
const { resolve } = require('node:path');
const fs = require('node:fs');

(async () => {
  const output = resolve(__dirname, '../../output/documentacion-2026-10-09');
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(pathToFileURL(resolve(__dirname, 'DOCUMENTACION-COMPLETA.html')).href);
    await page.screenshot({ path: resolve(output, 'portada.png') });
    const desktop = await page.evaluate(() => ({
      chapters: document.querySelectorAll('section.chapter').length,
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
      missingAnchors: [...document.querySelectorAll('a[href^="#"]')]
        .map(a => a.getAttribute('href').slice(1)).filter(id => !document.getElementById(id)),
    }));
    await page.locator('nav a[href="#03-reglas-de-negocio"]').click();
    await page.screenshot({ path: resolve(output, 'reglas.png') });
    await page.goto(pathToFileURL(resolve(__dirname, 'DOCUMENTACION-COMPLETA.html')).href);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => { window.scrollTo(0, 0); document.querySelector('nav').scrollTop = 0; });
    await page.screenshot({ path: resolve(output, 'mobile.png') });
    const mobile = await page.evaluate(() => ({ horizontalOverflow: document.documentElement.scrollWidth > innerWidth }));
    const result = { desktop, mobile, javascriptErrors: errors };
    fs.writeFileSync(resolve(output, 'verificacion-html.json'), JSON.stringify(result, null, 2) + '\n');
    if (desktop.chapters !== 14 || desktop.horizontalOverflow || mobile.horizontalOverflow || desktop.missingAnchors.length || errors.length)
      throw new Error(JSON.stringify(result));
    console.log(JSON.stringify(result));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
