/**
 * Cold storage — ⭐⭐ **the drive.** Run against the running game.
 *
 * The exit criterion for the cold-storage build: the powered cold store is
 * reachable and legible in the live world, on both shapes the one
 * `ClimateControlMixin` composes — a Thing (the infirmary's blood fridge) and
 * a Location (the general store's walk-in cold room). The grid gates both: cut
 * the avenue and they read cut; splice and they read running.
 *
 * ## ⚠⚠ What the socket proves, and the wall it shares with the energy drive
 *
 * The socket proves the **WIRING**: the new classes boot into real content,
 * the appliances (a Thing and a Location) render a coherent state, the
 * container-of-containers compartment reads, the walk-in PLOTS and is
 * walk-into-able, and the cut mechanism responds (severing the avenue darkens
 * the line).
 *
 * ⚠ **The feeder does not ENERGIZE over this socket** — the exact wall the
 * energy drive documents: the grid's source-generation / full compile does
 * not settle inside a wire boot (the sandbox exposes no seam to force it), so
 * every premises on the Terminus main reads its feeder `dark`, and the
 * appliances read their *cut* state (`silent` / `compressor silent`). That the
 * same `GridPoweredMixin` DOES energize live is proven by the energy build's
 * browser walk (`ElectricLight` read `lit`); `ColdStore`/`ColdRoom` compose
 * that same meter.
 *
 * So the COOLING behaviour — running on the setpoint, the pull-down, the
 * cut→warm curve, the freeze to a block, blood ruined by freezing, the
 * spoilage integral — is proven by the unit suites (`ClimateControl.test.ts`,
 * `ColdStore.test.ts`, `Thermal.freeze.test.ts`, `Freshness.outage.test.ts`)
 * and confirmed in the browser walk; the socket proves it is all WIRED in.
 * The DIRTY reason: severing the avenue leaves a cut in the in-memory grid.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import { Session, declareFile, uniqueHandle, plain } from '../src/harness';

export const DIRTY_REASON =
  'severs the avenue feeder (an in-memory grid cut that persists for the ' +
  'process) and rewinds appliance/stock stamps via wizard eval';

declareFile({
  file: 'cold-storage.dirty.wire.test.ts',
  packs: [
    'platform',
    'world-seed',
    'terminus',
    'energy',
    'generic-objects',
    'base-library',
    'trade-medicine',
    'trade-shopkeeping',
    'trade-fuel',
    'trade-haulage',
    'distribution',
  ],
  dirtyReason: DIRTY_REASON,
});

const WARD = '/world/terminus/infirmary/ward';
const SHOP = '/world/terminus/general-store/shop-floor';
const COLD_ROOM = '/world/terminus/general-store/cold-room';
const AVENUE = '/world/terminus/counting-houses/avenue-block';

const open: Session[] = [];
const squash = (s: string): string => s.replace(/\s+/g, ' ').trim();

async function at(where: string, tag: string, wizard = true): Promise<Session> {
  const s = await Session.open(uniqueHandle(`cold-${tag}`), {
    startLocation: where,
    ...(wizard ? { wizard: true } : {}),
  });
  open.push(s);
  return s;
}
async function say(s: Session, cmd: string): Promise<string> {
  return squash(plain(await (await s.cmd(cmd)).said()));
}

/** A coherent powered/cut state line — never broken, never a bare miss. */
function assertCoherentStoreState(text: string): void {
  // One of the two live state lines the markupAugmenter renders.
  expect(text).toMatch(/running|cold|silent|compressor|warming/i);
  expect(text).not.toMatch(/broken|\[object|undefined|error/i);
}

afterAll(() => {
  for (const s of open) s?.close();
});

suite('⭐⭐ the blood fridge — a powered ColdStore in the ward', () => {
  let ward: Session;

  beforeAll(async () => {
    ward = await at(WARD, 'ward');
    await ward.drainProse();
  }, 180_000);

  it('⭐ drive 1 — the ward reads ELECTRIC, its feeder named on the grid', async () => {
    const grid = await say(ward, 'analyze grid');
    // eslint-disable-next-line no-console -- the drive's own record
    console.log('  [drive] ward analyze grid:', grid);
    expect(grid).toMatch(/electric/i);
    expect(grid).not.toMatch(/off-grid|oil-lit/i);
    // The premises is ON the grid — its feeder node is named. (Energization
    // does not settle over the socket; see the header.)
    expect(grid).toMatch(/feeder node/i);
  });

  it('⭐ drive 1 — the blood fridge is there and renders a coherent state', async () => {
    const fridge = await say(ward, 'look fridge');
    // eslint-disable-next-line no-console -- the drive's own record
    console.log('  [drive] look fridge:', fridge);
    expect(fridge).not.toMatch(/don't see|can't make out/i);
    expect(fridge).toMatch(/fridge|cabinet/i);
    // The markupAugmenter renders a coherent powered/cut state (running or
    // silent — the socket reads it cut; the cooling is unit-proven).
    assertCoherentStoreState(fridge);
  });

  it('⭐ drive 2 — it has a freezer compartment (container-of-containers)', async () => {
    const fridge = await say(ward, 'look fridge');
    // The nested freezer compartment is named in the fridge's prose.
    expect(fridge).toMatch(/freezer|compartment/i);
  });

  it('⭐ drive 4 — sever the avenue: the cut mechanism responds', async () => {
    const avenue = await at(AVENUE, 'avenue');
    await avenue.drainProse();
    const sev = await say(avenue, 'sever');
    // eslint-disable-next-line no-console -- the drive's own record
    console.log('  [drive] sever at avenue:', sev);
    // The grid responds to the cut — the line darkens.
    expect(sev).toMatch(/sever|dark|cut/i);

    await ward.drainProse();
    const cut = await say(ward, 'look fridge');
    // eslint-disable-next-line no-console -- the drive's own record
    console.log('  [drive] fridge after sever:', cut);
    // Cut → it reads silent / no power, and stays coherent.
    expect(cut).toMatch(/no power|silent|leaking/i);

    // ⭐ drive 5 — splice: the grid takes the repair (coherent either way).
    await avenue.drainProse();
    const spl = await say(avenue, 'splice');
    // eslint-disable-next-line no-console -- the drive's own record
    console.log('  [drive] splice at avenue:', spl);
    await ward.drainProse();
    const back = await say(ward, 'look fridge');
    assertCoherentStoreState(back);
  });
});

suite('⭐⭐ the walk-in cold room — the SAME mixin on a Location', () => {
  let shop: Session;

  beforeAll(async () => {
    shop = await at(SHOP, 'shop');
    await shop.drainProse();
  }, 180_000);

  it('⭐ drive 7 — a cold room opens north of the shop floor', async () => {
    const floor = await say(shop, 'look');
    // eslint-disable-next-line no-console -- the drive's own record
    console.log('  [drive] shop floor:', floor);
    // The north exit to the cold room is obvious.
    expect(floor).toMatch(/north/i);
  });

  it('⭐ drive 7 — walk in: the SAME mixin on a Location renders its state', async () => {
    const room = await at(COLD_ROOM, 'coldroom');
    await room.drainProse();
    // ⭐ The walk-in is metered against ITSELF (a Location is its own
    // premises) and reads electric.
    const grid = await say(room, 'analyze grid');
    // eslint-disable-next-line no-console -- the drive's own record
    console.log('  [drive] cold room analyze grid:', grid);
    expect(grid).toMatch(/electric/i);
    expect(grid).toMatch(/feeder node/i);

    const look = await say(room, 'look');
    // eslint-disable-next-line no-console -- the drive's own record
    console.log('  [drive] cold room:', look);
    expect(look).not.toMatch(/don't see|nowhere/i);
    expect(look).toMatch(/larder|walk-in|cold room/i);
    // ⭐ The ColdRoom markupAugmenter — the one ClimateControlMixin on a
    // Location renders a coherent compressor state (the same the fridge Thing
    // does; powered reads "compressor hums", cut reads "compressor silent").
    expect(look).toMatch(/compressor/i);
    assertCoherentStoreState(look);
  });
});
