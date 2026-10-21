// Browser end-to-end flows across the three apps:
//  1. visitor books a viewing on a property → lead appears in the CRM pipeline
//  2. editor creates a listing, uploads a photo, publishes → visible on the public site
//  3. admin hides the agent → property page shows the VAIRO team card
//  4. agent moves a contact in the pipeline via drag & drop, adds a note, schedules a viewing
// Usage: CHROMIUM_PATH=… BASE=http://localhost:5173 node tests/ui-flows.mjs
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import path from 'node:path';


const BASE = process.env.BASE || 'http://localhost:5173';
const IMG = process.env.TEST_IMAGE || path.resolve('tests/fixtures/photo.png');
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const step = (t) => console.log('•', t);
const errors = [];

async function ctx(login) {
  const c = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await c.newPage();
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('dialog', (d) => d.accept());
  if (login) {
    await p.goto(BASE + '/login');
    await p.fill('input[type=email]', login);
    await p.fill('input[type=password]', 'vairo-dev-2026');
    await p.click('button[type=submit]');
    await p.waitForURL(/\/(cms|crm)/);
  }
  return p;
}

const phone = `0750 ${String(Date.now()).slice(-3)} ${String(Date.now()).slice(-7, -3)}`;

// 1 ─ visitor lead
step('visitor books a viewing');
const v = await ctx();
await v.goto(BASE + '/property/VS-1008');
await v.getByRole('button', { name: 'احجز معاينة' }).first().click();
await v.getByPlaceholder('اسمك').fill('زائر المتصفح');
await v.getByPlaceholder('07xx xxx xxxx').fill(phone);
await v.locator('select').first().selectOption({ index: 1 });
await v.getByRole('button', { name: 'أرسل طلب المعاينة' }).click();
await v.getByText('وصل طلبك').waitFor();

step('lead shows up in the CRM');
const admin = await ctx('admin@vairo.iq');
await admin.goto(BASE + '/crm');
await admin.getByText('زائر المتصفح').first().waitFor();
await admin.getByText('زائر المتصفح').first().click();
await admin.getByText('طلب معاينة — VS-1008').waitFor();

// 2 ─ editor creates & publishes a listing
step('editor creates a listing');
const ed = await ctx('hevi@vairo.iq');
await ed.goto(BASE + '/cms/listings/new');
const field = (label) => ed.locator('label', { hasText: label }).locator('input, select').first();
await field('نوع العقار').selectOption('villa');
await field('المنطقة').selectOption('kasnazan');
await field('السعر (دولار)').fill('333000');
await field('المساحة م²').fill('350');
await field('غرف النوم').fill('4');
await ed.getByRole('button', { name: 'إنشاء العقار' }).first().click();
await ed.waitForURL(/\/cms\/listings\/VS-\d+\?tab=photos/);
const newId = ed.url().match(/VS-\d+/)[0];
step(`created ${newId}; uploading a photo`);
await ed.locator('input[type=file]').first().setInputFiles(IMG);
await ed.getByText('تم الرفع').waitFor();
await ed.goto(BASE + `/cms/listings/${newId}?tab=status`);
await ed.getByRole('button', { name: /^منشور/ }).click();
await ed.getByRole('button', { name: 'نشر التغييرات' }).click();
await ed.getByText('تم الحفظ · منشور').waitFor();

step('listing is public');
await v.goto(BASE + `/property/${newId}`);
await v.getByRole('heading', { name: /فيلا 4 غرف/ }).waitFor();
const src = await v.locator('img').first().getAttribute('src');
assert.match(src, /storage\/v1\/object\/public\/media\/listings\//);
assert.equal((await v.request.get(src)).status(), 200);

// 3 ─ admin hides agent
step('admin hides the responsible agent site-wide');
await admin.goto(BASE + '/cms/home');
await admin.getByRole('switch', { name: 'إظهار الوسيط المسؤول' }).click();
await admin.getByRole('button', { name: 'نشر التغييرات' }).click();
await admin.getByText('نُشرت التغييرات').waitFor();
await v.goto(BASE + '/property/VS-1001');
await v.getByText('فريق ڤايرو').first().waitFor();
assert.equal(await v.getByText('سارا أحمد').count(), 0);
await admin.getByRole('switch', { name: 'إظهار الوسيط المسؤول' }).click();
await admin.getByRole('button', { name: 'نشر التغييرات' }).click();
await admin.getByText('نُشرت التغييرات').waitFor();

// 4 ─ agent works the pipeline
step('agent drags a lead to «تم التواصل», adds a note and a viewing');
const ag = await ctx('sara@vairo.iq');
await ag.goto(BASE + '/crm');
const card = ag.locator('button[draggable=true]', { hasText: 'زائر المتصفح' }).first();

await card.dragTo(ag.getByText('تم التواصل', { exact: false }).first());
await ag.waitForTimeout(800);
await ag.goto(BASE + '/crm/contacts');
await ag.getByText('زائر المتصفح').first().click();
await ag.getByText('تم التواصل').first().waitFor();
await ag.getByPlaceholder('اكتب ملاحظة…').fill('اتصلت بيه وأكدنا الاهتمام');
await ag.getByRole('button', { name: 'إضافة', exact: true }).click();
await ag.getByText('اتصلت بيه وأكدنا الاهتمام').first().waitFor();
await ag.getByRole('button', { name: '+ معاينة' }).nth(1).click();
await ag.locator('input[type=time]').fill('15:30');
await ag.getByRole('button', { name: 'حفظ' }).click();
await ag.getByText('أُضيفت المعاينة').waitFor();
const stage = await ag.locator('span', { hasText: /^معاينة$/ }).count();
assert.ok(stage >= 1, 'stage moved to viewing after scheduling');

await browser.close();
if (errors.length) { console.log('page errors:', errors); process.exit(1); }
console.log('\nall flows passed');

