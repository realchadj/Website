/* Storefront tests. The block explorer and price feed are stubbed, so these
   run offline and never touch a real API or a real address.
   Usage: node test-store.mjs        (CHROME_PATH overrides the browser)     */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ADDRESS = '3ER42NnuB41VoPduKCPKUE1Dh1j17gzKqx';
const RATE = 60000;                       // stubbed USD/BTC
const store = new URL('./index.html', import.meta.url).href;

/* A card-enabled variant of the built page, as STRIPE_LINK would produce. */
const LINK = 'https://buy.stripe.com/test_00example';
const cardFile = new URL('./.store-card.html', import.meta.url);
const built = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
if (!built.includes("stripeLink: ''")) throw new Error('index.html was built with a Stripe link');
writeFileSync(cardFile, built.replace("stripeLink: ''", `stripeLink: '${LINK}'`)
                             .replace(/pay by Bitcoin/g, 'pay by card or Bitcoin'));
const cardStore = cardFile.href;

let fail = 0;
const check = (label, got, want) => {
  const ok = String(got) === String(want);
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  got=${got}${ok ? '' : ` want=${want}`}`);
};

const browser = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});

/* A stub chain. `txs` is what the explorer will report for the address. */
async function open({ txs = [], priceOk = true, explorerOk = true, url = store } = {}) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/net::ERR_/.test(m.text())) errors.push(m.text()); });

  await page.route('**/api/v1/prices', r =>
    priceOk ? r.fulfill({ json: { USD: RATE } }) : r.fulfill({ status: 500 }));
  await page.route('**/api/address/**', r =>
    explorerOk ? r.fulfill({ json: txs.current }) : r.fulfill({ status: 503 }));
  await page.route('https://fonts.googleapis.com/**', r => r.abort());

  await page.goto(url);
  await page.waitForTimeout(350);
  return { page, errors };
}

/* ---------------------------------------------------------------- render */
{
  const txs = { current: [] };
  const { page, errors } = await open({ txs });
  check('rate shown', (await page.locator('#rate').innerText()).includes('60,000'), 'true');
  check('price shown', await page.locator('#usd').innerText(), '$79');
  check('pay button enabled', await page.locator('#start').isDisabled(), 'false');
  check('demo link present', await page.locator('a[href="demo/"]').count(), 1);
  check('delivery hidden pre-payment', await page.locator('#stage-done').isVisible(), 'false');
  check('catalog rendered', (await page.locator('#catalog .prod').count()) >= 1, 'true');
  check('quote tool marked in stock',                       // badge renders uppercase
        await page.locator('[data-product="quote-desk"] .badge').innerText(), 'IN STOCK');

  /* --------------------------------------------------- amount + wallet uri */
  await page.click('#start');
  await page.waitForTimeout(400);
  const amt = await page.locator('#amt-btc').inputValue();
  const satoshis = Math.round(parseFloat(amt) * 1e8);
  const expected = Math.round(79 / RATE * 1e8);
  check('amount within a tag of spot', Math.abs(satoshis - expected) < 1000, 'true');
  check('amount is tagged (non-round)', satoshis % 1000 >= 100, 'true');
  check('address rendered', await page.locator('#addr').inputValue(), ADDRESS);
  const uri = await page.locator('#wallet').getAttribute('href');
  check('wallet uri', uri.startsWith(`bitcoin:${ADDRESS}?amount=`), 'true');
  check('uri carries the exact amount', uri.includes(`amount=${amt}`), 'true');

  /* ------------------------------------------------ wrong amount is ignored */
  txs.current = [{ txid: 'a'.repeat(64), status: { confirmed: true },
                   vout: [{ scriptpubkey_address: ADDRESS, value: satoshis - 1 }] }];
  await page.click('#recheck');
  await page.waitForTimeout(300);
  check('underpayment does not unlock', await page.locator('#stage-done').isVisible(), 'false');

  /* ------------------------------------------- wrong address is ignored */
  txs.current = [{ txid: 'b'.repeat(64), status: { confirmed: true },
                   vout: [{ scriptpubkey_address: 'bc1qotherzzz', value: satoshis }] }];
  await page.click('#recheck');
  await page.waitForTimeout(300);
  check('payment elsewhere does not unlock', await page.locator('#stage-done').isVisible(), 'false');

  /* ------------------------------------------------------- correct payment */
  const dl = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
  txs.current = [{ txid: 'c'.repeat(64), status: { confirmed: true },
                   vout: [{ scriptpubkey_address: ADDRESS, value: satoshis }] }];
  await page.click('#recheck');
  await page.waitForTimeout(500);
  check('correct payment unlocks', await page.locator('#stage-done').isVisible(), 'true');
  check('receipt shows txid', (await page.locator('#txid').innerText()).startsWith('cccc'), 'true');
  const auto = await dl;
  check('package auto-delivered', auto && auto.suggestedFilename(), 'quote-desk.zip');

  check('no JS errors', errors.length, 0);
  await page.close();
}

/* ------------------------------- a prior payment must not settle a new order */
{
  const stale = { txid: 'd'.repeat(64), status: { confirmed: true }, vout: [] };
  const txs = { current: [stale] };
  const { page } = await open({ txs });
  await page.click('#start');
  await page.waitForTimeout(400);
  const satoshis = Math.round(parseFloat(await page.locator('#amt-btc').inputValue()) * 1e8);
  // The pre-existing tx turns out to pay exactly our tagged amount.
  stale.vout = [{ scriptpubkey_address: ADDRESS, value: satoshis }];
  await page.click('#recheck');
  await page.waitForTimeout(400);
  check('pre-existing tx cannot settle a new order',
        await page.locator('#stage-done').isVisible(), 'false');
  await page.close();
}

/* ------------------------------------------ explorer down -> manual fallback */
{
  const { page } = await open({ txs: { current: [] }, explorerOk: false });
  await page.click('#start');
  await page.waitForTimeout(600);
  check('explorer outage shows manual path', await page.locator('#stage-manual').isVisible(), 'true');
  check('no half-open order shown', await page.locator('#stage-pay').isVisible(), 'false');
  await page.close();
}

/* ------------------------------------------------- price feed down is handled */
{
  const { page } = await open({ txs: { current: [] }, priceOk: false });
  check('price outage still renders', (await page.locator('#rate').innerText()).length > 0, 'true');
  await page.click('#start');
  await page.waitForTimeout(400);
  check('price outage shows manual path', await page.locator('#stage-manual').isVisible(), 'true');
  await page.close();
}

/* ------------------------------------------------------------------ mobile */
{
  const { page } = await open({ txs: { current: [] } });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  const over = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check('no horizontal overflow on mobile', over <= 0, 'true');
  await page.close();
}

/* ------------------------------------------- stock status drives the page */
/* A fixture store: one downloadable product, one physical product in stock,
   one out of stock. Built to a temp dir so the real index.html is untouched. */
{
  const dir = mkdtempSync(join(tmpdir(), 'store-fixture-'));
  writeFileSync(join(dir, 'catalog.json'), JSON.stringify({
    contact: 'orders@example.com',
    products: [
      { id: 'quote-desk', name: 'Instant Quote — lab quoting tool',
        priceUsd: 79, status: 'in_stock', fulfillment: 'download' },
      { id: 'widget', name: 'Tested widget',
        priceUsd: 25, status: 'in_stock', fulfillment: 'contact' },
      { id: 'gone', name: 'Sold-out thing',
        priceUsd: 10, status: 'out_of_stock', fulfillment: 'contact' }
    ]
  }));
  execFileSync('node', [new URL('./build-store.mjs', import.meta.url).pathname], {
    env: { ...process.env,
           CATALOG_PATH: join(dir, 'catalog.json'),
           OUT_PATH: join(dir, 'index.html') },
    stdio: 'pipe'
  });

  const txs = { current: [] };
  const { page } = await open({ txs, url: 'file://' + join(dir, 'index.html') });

  check('three products listed', await page.locator('#catalog .prod').count(), 3);
  check('out-of-stock badge shown',
        await page.locator('[data-product="gone"] .badge').innerText(), 'OUT OF STOCK');
  check('out-of-stock has no buy button',
        await page.locator('[data-product="gone"] [data-buy]').count(), 0);
  check('out-of-stock button disabled',
        await page.locator('[data-product="gone"] button').isDisabled(), 'true');
  check('in-stock product buyable',
        await page.locator('[data-buy="widget"]').isDisabled(), 'false');

  /* Buy the physical product: price switches, payment settles, and delivery
     shows contact instructions instead of a download.                       */
  await page.click('[data-buy="widget"]');
  await page.waitForTimeout(400);
  check('price switches to selected product', await page.locator('#usd').innerText(), '$25');
  const satoshis = Math.round(parseFloat(await page.locator('#amt-btc').inputValue()) * 1e8);
  check('amount priced from selected product',
        Math.abs(satoshis - Math.round(25 / RATE * 1e8)) < 1000, 'true');

  txs.current = [{ txid: 'e'.repeat(64), status: { confirmed: true },
                   vout: [{ scriptpubkey_address: ADDRESS, value: satoshis }] }];
  await page.click('#recheck');
  await page.waitForTimeout(500);
  check('payment unlocks order', await page.locator('#stage-done').isVisible(), 'true');
  check('no download offered for physical product',
        await page.locator('#dl-zip').isVisible(), 'false');
  check('contact instructions shown', await page.locator('#contact-note').isVisible(), 'true');
  check('contact email included',
        (await page.locator('#contact-note').innerText()).includes('orders@example.com'), 'true');
  await page.close();
}

/* --------------------------------- everything out of stock closes the store */
{
  const dir = mkdtempSync(join(tmpdir(), 'store-fixture-'));
  writeFileSync(join(dir, 'catalog.json'), JSON.stringify({
    products: [{ id: 'quote-desk', name: 'Instant Quote — lab quoting tool',
                 priceUsd: 79, status: 'out_of_stock', fulfillment: 'download' }]
  }));
  execFileSync('node', [new URL('./build-store.mjs', import.meta.url).pathname], {
    env: { ...process.env,
           CATALOG_PATH: join(dir, 'catalog.json'),
           OUT_PATH: join(dir, 'index.html') },
    stdio: 'pipe'
  });
  const { page } = await open({ txs: { current: [] },
                                url: 'file://' + join(dir, 'index.html') });
  check('sold-out store disables checkout', await page.locator('#start').isDisabled(), 'true');
  check('sold-out store says so', await page.locator('#start').innerText(), 'Out of stock');
  await page.close();
}

/* -------------------------------------------------------------------- card */
{
  const { page } = await open({ txs: { current: [] } });
  check('no link: card button hidden', await page.locator('#card').isVisible(), 'false');
  await page.close();
}
{
  const { page } = await open({ txs: { current: [] }, url: store + '?paid=cs_test_abc123' });
  check('no link: card return ignored', await page.locator('#stage-done').isVisible(), 'false');
  await page.close();
}
{
  const { page, errors } = await open({ txs: { current: [] }, url: cardStore });
  check('card button shown', await page.locator('#card').isVisible(), 'true');
  check('card button links to Stripe', await page.locator('#card').getAttribute('href'), LINK);
  check('bitcoin still offered', await page.locator('#start').isVisible(), 'true');
  check('footer names Stripe', (await page.locator('#foot-pay').innerText()).includes('Stripe'), 'true');
  check('card page: no JS errors', errors.length, 0);
  await page.close();
}
{
  const { page } = await open({ txs: { current: [] }, url: cardStore + '?paid=not-a-session' });
  check('malformed card return does not unlock', await page.locator('#stage-done').isVisible(), 'false');
  await page.close();
}
{
  const page = await browser.newPage();
  await page.route('**/api/**', r => r.fulfill({ status: 503 }));
  await page.route('https://fonts.googleapis.com/**', r => r.abort());
  const dl = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
  await page.goto(cardStore + '?paid=cs_test_a1B2c3D4e5');
  await page.waitForTimeout(400);
  check('card return unlocks', await page.locator('#stage-done').isVisible(), 'true');
  check('card return hides checkout', await page.locator('#stage-idle').isVisible(), 'false');
  check('card receipt shown', (await page.locator('#receipt').innerText()).includes('cs_test_a1B2'), 'true');
  const auto = await dl;
  check('card: package auto-delivered', auto && auto.suggestedFilename(), 'quote-desk.zip');
  await page.close();
}

rmSync(cardFile, { force: true });
await browser.close();
console.log(fail ? `\n${fail} FAILING` : '\nAll storefront checks passed.');
process.exit(fail ? 1 : 0);
