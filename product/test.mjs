import { chromium } from 'playwright';

const errors = [];
const offline = [];
// Uses Playwright's bundled Chromium. Set CHROME_PATH to override.
const browser = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
// Network failures for the Google Fonts stylesheet are not app faults — the
// font stacks declare real fallbacks. Everything else is a genuine error.
const isNetwork = t => /Failed to load resource|net::ERR_/.test(t);
page.on('console', m => {
  if (m.type() !== 'error') return;
  (isNetwork(m.text()) ? offline : errors).push(m.text());
});

import.meta; // page under test resolves relative to this file
await page.goto(new URL('./index.html', import.meta.url).href);
await page.waitForTimeout(400);

const check = (label, got, want) => {
  const ok = String(got) === String(want);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  got=${got}${ok ? '' : ` want=${want}`}`);
  if (!ok) process.exitCode = 1;
};

// Renders
check('tabs rendered', await page.locator('.tab').count(), 5);
check('tests rendered (soil)', await page.locator('.test').count(), 6);
check('turnaround options', await page.locator('#turnaround .radio').count(), 3);
check('empty total', await page.locator('#total').innerText(), '$0.00');
check('submit disabled', await page.locator('#submit').isDisabled(), 'true');

// S1 $18 + S2 $28 = $46/sample, 1 sample -> min order $35 not applied (46 > 35)
await page.click('label[for="t-S1"]');
await page.click('label[for="t-S2"]');
check('two tests -> $46.00', await page.locator('#total').innerText(), '$46.00');
check('submit enabled', await page.locator('#submit').isDisabled(), 'false');

// 10 samples -> 46*10 = 460, 10% off = 414
await page.fill('#samples', '10');
await page.waitForTimeout(120);
check('10 samples, 10% off', await page.locator('#total').innerText(), '$414.00');

// Rush x2 -> 920, minus 10% = 828
await page.check('input[value="rush"]');
await page.waitForTimeout(120);
check('rush x2 then 10% off', await page.locator('#total').innerText(), '$828.00');

// Add courier pickup ($45 flat) -> 873
await page.check('input[data-addon="pickup"]');
await page.waitForTimeout(120);
check('plus $45 flat pickup', await page.locator('#total').innerText(), '$873.00');

// Minimum order: clear, pick S5 ($9) x1 -> min $35
await page.click('#clear');
await page.fill('#samples', '1');
await page.uncheck('input[data-addon="pickup"]');
await page.check('input[value="standard"]');
await page.click('label[for="t-S5"]');
await page.waitForTimeout(120);
check('minimum order floor', await page.locator('#total').innerText(), '$35.00');

// Validation
await page.click('#submit');
await page.waitForTimeout(150);
check('validation blocks empty form',
  (await page.locator('#form-error').innerText()).includes('required'), 'true');

// Full submit
await page.fill('#f-name', 'Dana Ruiz');
await page.fill('#f-company', 'Ruiz Family Farms');
await page.fill('#f-email', 'dana@example.com');
await page.fill('#f-matrix', 'topsoil, 0-6 in');
await page.click('#submit');
await page.waitForTimeout(300);
check('confirmation shown', await page.locator('#confirm').isVisible(), 'true');
const ref = await page.locator('#confirm-ref').innerText();
check('reference format', /^Q-\d{6}-\d{4}$/.test(ref), 'true');
const summary = await page.locator('#confirm-text').inputValue();
check('summary has customer', summary.includes('Dana Ruiz'), 'true');
check('summary has total', summary.includes('$35.00'), 'true');
const mail = await page.locator('#confirm-mail').getAttribute('href');
check('mailto built', mail.startsWith('mailto:midwestbiolabs@proton.me?subject='), 'true');

// Persistence across reload
await page.reload();
await page.waitForTimeout(400);
check('draft restored: test', await page.locator('#total').innerText(), '$35.00');
check('draft restored: name', await page.locator('#f-name').inputValue(), 'Dana Ruiz');

// Cross-category selection + badge
await page.click('.tab[data-cat="water"]');
await page.waitForTimeout(100);
await page.click('label[for="t-W3"]');   // $120
await page.waitForTimeout(120);
check('cross-category total', await page.locator('#total').innerText(), '$129.00');
check('soil badge persists', await page.locator('.tab[data-cat="soil"] .tab-badge').innerText(), '1');

// Screenshot for review
await page.screenshot({ path: new URL('./.preview.png', import.meta.url).pathname });

// Mobile layout sanity
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(150);
const overflow = await page.evaluate(() =>
  document.documentElement.scrollWidth - document.documentElement.clientWidth);
check('no horizontal overflow on mobile', overflow <= 0, 'true');

console.log(errors.length ? '\nJS ERRORS:\n' + errors.join('\n') : '\nNo JS errors.');
if (offline.length) console.log(`(${offline.length} network fetches blocked — expected when offline.)`);
if (errors.length) process.exitCode = 1;
await browser.close();
