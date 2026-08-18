/* Storefront tests. The block explorer and price feed are stubbed, so these
   run offline and never touch a real API or a real address.
   Usage: node test-store.mjs        (CHROME_PATH overrides the browser)     */
import { chromium } from 'playwright';

const ADDRESS = '3ER42NnuB41VoPduKCPKUE1Dh1j17gzKqx';
const RATE = 60000;                       // stubbed USD/BTC
const store = new URL('./index.html', import.meta.url).href;

let fail = 0;
const check = (label, got, want) => {
  const ok = String(got) === String(want);
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  got=${got}${ok ? '' : ` want=${want}`}`);
};

const browser = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});

/* A stub chain. `txs` is what the explorer will report for the address. */
async function open({ txs = [], priceOk = true, explorerOk = true } = {}) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/net::ERR_/.test(m.text())) errors.push(m.text()); });

  await page.route('**/api/v1/prices', r =>
    priceOk ? r.fulfill({ json: { USD: RATE } }) : r.fulfill({ status: 500 }));
  await page.route('**/api/address/**', r =>
    explorerOk ? r.fulfill({ json: txs.current }) : r.fulfill({ status: 503 }));
  await page.route('https://fonts.googleapis.com/**', r => r.abort());

  await page.goto(store);
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

await browser.close();
console.log(fail ? `\n${fail} FAILING` : '\nAll storefront checks passed.');
process.exit(fail ? 1 : 0);
