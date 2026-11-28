/**
 * Nutrition & fitness — the CONTENT half (split by test-world-lifecycle D8):
 * the steps that BUY from a particular Terminus counter — the smithy's
 * barbell order, the general store's orange and the bakery's two loaves —
 * unchanged. The kernel half (the mirror, the run, the gym a bar on the floor
 * makes, the heat, the climb, the fade, the deficiency and its cure) is
 * `nutrition-fitness.wire.test.ts`, standing in the scaffold with the bar,
 * the coat and the orange handed.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  expectOk,
  expectOkOr,
} from '../src/harness';

export const DIRTY_REASON =
  'orders one barbell out of the smithy’s stock, buys an orange off the ' +
  'general store’s par and two loaves off the bakery’s — none of it ' +
  'restocked by the drive — and stands on Terminus to do it';

declareFile({
  file: 'nutrition-fitness-content.dirty.wire.test.ts',
  packs: [
    'trade-farming',
    'trade-baking',
    'trade-smithing',
    'terminus',
    'hearthworks',
    'rejection',
    'generic-objects',
  ],
  dirtyReason: DIRTY_REASON,
});

const BANK = '/world/terminus/counting-houses/banking-hall';
const SMITHY = '/world/terminus/hearthworks/place/smithy';
const STORE = '/world/terminus/general-store/shop-floor';
const BAKERY = '/world/terminus/market/bakery';

let H: Session;
let hName: string;

async function bank(handle: string, amount: number): Promise<void> {
  // ⚠ `reserve override`, not `reserve issue` (retired by the money
  // write-off build — it answers `unknown-subcommand`; found at the
  // controller-liquidity finalize, where this drive first ran since). The
  // override is a RECORDED act that lands in the account, so the account
  // is opened first (the apiculture drive's precedent).
  // The member stays in the world until the override lands: it names
  // them off the live roster.
  const me = await Session.open(handle, { startLocation: BANK });
  const gov = await Session.open('founder', { startLocation: BANK });
  try {
    expectOkOr(await me.cmd('bank open'), 'already-open', 'account-exists');
    expectOk(await gov.cmd(`reserve override ${amount} to ${handle} "wire: nutrition-fitness funding"`));
  } finally {
    gov.close();
    me.close();
  }
}

beforeAll(async () => {
  hName = uniqueHandle('nf-h');
  await bank(hName, 500);
  H = await Session.open(hName, { startLocation: BANK });
}, 600_000);

afterAll(() => {
  H?.close();
});

suite('6 · the smithy makes a bar', () => {
  it('⭐ the smithy makes a bar, priced on its own slate', async () => {
    H.close();
    H = await Session.open(hName, { startLocation: SMITHY });
    expect(await H.prose('menu')).toMatch(/Barbell/i);
    // ⚠ The forge has to be at heat before the smith will take an order
    // for anvil-work (`insufficient-heat` otherwise — the drive's first
    // run found it cold). Light it and pump it, as the crafting drive
    // does; `already-burning` is fine.
    expectOkOr(await H.cmd('light forge'), 'already-burning');
    expectOkOr(await H.cmd('pump forge'), 'already-burning', 'not-lit');
    const ordered = await H.cmd('order barbell');
    expectOk(ordered);
    const carried = await H.query('me:i', { fields: ['displayName'] });
    expect(JSON.stringify(carried)).toMatch(/barbell/i);
  }, 240_000);
});

suite('12 · an orange is for sale', () => {
  it('⭐ an orange is for sale somewhere a person can go', async () => {
    H.close();
    H = await Session.open(hName, { startLocation: STORE });
    // `buy orange` — the FRUIT, not the packet of orange seed the same
    // counter sells (the first run bought the packet; the fruit's line
    // now sits above the seeds).
    expectOk(await H.cmd('buy orange'));
    expect(JSON.stringify(await H.query('me:i', { fields: ['displayName'] }))).toMatch(/orange(?! seed)/i);
  }, 300_000);
});

suite('13 · two loaves from one wheat', () => {
  it('⭐ the wholemeal and the white show different amounts, and no row authored them', async () => {
    H.close();
    H = await Session.open(hName, { startLocation: BAKERY });
    // ⚠ `buy loaf` at this bakery had NEVER worked: the bakery's business
    // listed only the room as an operating location and a sale settles
    // against the COUNTER's path — the first run answered
    // `insufficient-funds` with 500 in the bank. Fixed in the business row.
    expectOk(await H.cmd('buy wholemeal'));
    expectOk(await H.cmd('buy white'));
    // Look at the ones in HAND (`me:i:…`): four more of each stand on the
    // counter, and a bare `look wholemeal` asks WHICH — a prompt the
    // harness cannot answer.
    const wholemeal = await H.prose('look me:i:wholemeal');
    const white = await H.prose('look me:i:white');
    expect(wholemeal).toMatch(/fibre \d+mg/i);
    expect(white).toMatch(/fibre \d+mg/i);
    const fibre = (s: string): number => Number(/fibre (\d+)mg/i.exec(s)?.[1] ?? 0);
    expect(fibre(wholemeal)).toBeGreaterThan(fibre(white));
  }, 120_000);
});
