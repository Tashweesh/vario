// Browser smoke test: opens every route as a visitor and as staff, on desktop and phone widths,
// and fails on console errors, failed API calls, or pages that render nothing.
// Usage: BASE=http://localhost:5173 node tests/ui-smoke.mjs [--shots dir]
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:5173';
const shotsDir = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : null;
if (shotsDir) fs.mkdirSync(shotsDir, { recursive: true });

const SITE = ['/', '/buy', '/rent', '/buy?type=apartment&pay=installments', '/property/VS-1001', '/property/VR-5001', '/property/VS-1004', '/projects', '/projects/unique-tower', '/areas', '/areas/ankawa', '/developers', '/sell', '/contact', '/saved', '/compare', '/map', '/tools', '/tools/budget', '/tools/payment', '/tools/rent', '/tools/match', '/tools/tour', '/tools/tower', '/tools/atlas', '/guides', '/invest', '/nope-404'];
const CMS = ['/cms', '/cms/listings', '/cms/listings/VS-1001', '/cms/listings/VS-1001?tab=photos', '/cms/listings/VS-1001?tab=plan', '/cms/listings/VS-1001?tab=status', '/cms/listings/new', '/cms/projects', '/cms/projects/unique-tower', '/cms/developers', '/cms/areas', '/cms/home', '/cms/users'];
const CRM = ['/crm', '/crm/contacts', '/crm/contacts/00000000-0000-4000-9000-000000000001', '/crm/viewings', '/crm/reports'];

// Uses Playwright's bundled browser, or CHROMIUM_PATH (e.g. a preinstalled Chromium).
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
let failures = 0;

async function run(label, viewport, routes, login) {
  const ctx = await browser.newContext({ viewport, locale: 'ar' });
  const page = await ctx.newPage();
  const errors = [];
  // external assets (photos, fonts) may be blocked in sandboxes — only local failures count
  page.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL_CONNECTION_FAILED|ERR_NAME_NOT_RESOLVED|ERR_PROXY|ERR_CONNECTION/.test(m.text())) errors.push(m.text()); });
  page.on('requestfailed', (r) => { if (/localhost|127\.0\.0\.1/.test(r.url()) && r.failure()?.errorText !== 'net::ERR_ABORTED') errors.push(`request failed ${r.url()}`); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('response', (r) => { if (r.url().includes(':54321/') && r.status() >= 400 && !r.url().includes('/auth/v1/user')) errors.push(`HTTP ${r.status()} ${r.request().method()} ${r.url().replace(/^.*54321/, '')}`); });
  if (login) {
    await page.goto(BASE + '/login');
    await page.fill('input[type=email]', login);
    await page.fill('input[type=password]', 'vairo-dev-2026');
    await page.click('button[type=submit]');
    await page.waitForURL(/\/(cms|crm)/, { timeout: 10000 });
  }
  for (const r of routes) {
    errors.length = 0;
    await page.goto(BASE + r, { waitUntil: 'networkidle' });
    await page.waitForTimeout(250);
    const text = (await page.locator('#root').innerText()).trim();
    const spinning = await page.locator('.spin').count();
    const problems = [...errors];
    if (text.length < 40) problems.push('page looks empty');
    if (spinning && !r.includes('tab=status')) problems.push('still loading');
    const hscroll = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (hscroll > 2 && !r.startsWith('/cms') && !r.startsWith('/crm')) problems.push(`horizontal overflow ${hscroll}px`);
    if (problems.length) { failures++; console.log(`✗ [${label}] ${r}\n   ${problems.join('\n   ')}`); } else console.log(`✓ [${label}] ${r}`);
    if (shotsDir) await page.screenshot({ path: `${shotsDir}/${label}${r.replace(/[/?=&]/g, '_') || '_home'}.png`, fullPage: true });
  }
  await ctx.close();
}

await run('desktop', { width: 1440, height: 900 }, SITE);
await run('phone', { width: 390, height: 844 }, SITE);
await run('admin', { width: 1440, height: 900 }, [...CMS, ...CRM], 'admin@vairo.iq');
await run('agent', { width: 1280, height: 900 }, ['/cms', '/cms/listings', '/cms/listings/VS-1002', '/cms/listings/new', '/crm', '/crm/viewings'], 'sara@vairo.iq');
await browser.close();
console.log(failures ? `\n${failures} route(s) with problems` : '\nall routes OK');
process.exit(failures ? 1 : 0);
