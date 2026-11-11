/**
 * Controller liquidity — the before-record (plan W0, D17).
 *
 * ⭐⭐ **Nothing moves until the world's answers are written down.** This
 * build moves logic out of ~80 controllers: onto the objects (rung 1 of the
 * remedy ladder), into the view's grammar, onto the model that guards a
 * write. The acceptance is that a person doing the same thing before and
 * after sees the same state change, the same refusal reason and the same
 * duration. So every act below RECORDS what the world did — per act
 * `{status, notes[{kind, reason, validator}], duration, state}`, no prose —
 * into a committed baseline, and every later run compares against it and
 * fails on any difference. The method is `controllers-are-io`'s (that file's
 * § the record), extended to this build's worklist.
 *
 *   CLIQ_RECORD=1 → write `controller-liquidity.baseline.json` (the acts this
 *                   run recorded replace theirs; the rest are kept).
 *   otherwise     → compare each act to the baseline.
 *
 * ⭐ One act per controller whose logic moves (plan Appendix A rung-1 rows,
 * Appendix B, the pack worst-first list). Each act is a ROW: where it is
 * done, what is handed to the actor, the line typed. The record is taken
 * HONESTLY — an act that refuses for want of staging records the refusal,
 * and that is still a before-record: the refusal's reason may not drift.
 *
 * `state` is read through `eval` (a staging wizard seated on the extents):
 * where each handed thing is now (kinds and placements, never ids), the
 * kinds the actor holds, the kinds that appeared in the place, and how the
 * engagement ended when there was one. Only run-stable facts.
 *
 * ⚠ A recorded act that is itself a confirmed defect (plan Appendix C)
 * records the DEFECTIVE answer; the wave that fixes it re-records that row
 * and says so in its commit — the record proves nothing ELSE moved.
 */

import { spawnSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  hand,
  nourish,
  advanceWorldClock,
  worldClockNow,
  pinWeather,
  unpinWeather,
  isOwnedTestWorld,
} from '../src/harness';
import { bootOwnedWorld, WIRE_PORT } from '../src/runner/boot';
import type { CommandResult } from '../src/harness';

export const DIRTY_REASON =
  'hands every act its materials and leaves what they became where the act ' +
  'left it (the market square, the venues, the workshops), spends venue ' +
  'stock and coin, and writes files under the stager\'s own home tree';

declareFile({
  file: 'controller-liquidity.dirty.wire.test.ts',
  packs: PACKS(),
  dirtyReason: DIRTY_REASON,
});

/** The packs whose content the acts below stand in (hoisted so the table can be read first). */
function PACKS(): string[] {
  return [
    'platform',
    'generic-objects',
    'terminus',
    'saxonberg-lounge',
    'rejection',
    'hearthworks',
    'hearts-delight',
    'eternal-university',
    'residence',
    'transport',
    'water',
    'trade-carpentry',
    'trade-ceramics',
    'trade-cordage',
    'trade-dairying',
    'trade-drilling',
    'trade-farming',
    'trade-fishing',
    'trade-forestry',
    'trade-fuel',
    'trade-glass',
    'trade-hospitality',
    'trade-medicine',
    'trade-mining',
    'trade-ranching',
    'trade-smelting',
    'trade-smithing',
    'trade-textiles',
    'trade-dyeing',
    'trade-tanning',
    'trade-printing',
    'trade-cooking',
  ];
}

/* ───────────────────────── the record ───────────────────────── */

const RECORD = process.env.CLIQ_RECORD === '1';
const BASELINE_PATH = new URL('./controller-liquidity.baseline.json', import.meta.url);

interface ActRecord {
  status: string;
  notes: { kind: string; reason?: string; validator?: string }[];
  /** The engagement-started duration (ms), when the act was durative. */
  duration: number | null;
  state: Record<string, unknown>;
}
interface Baseline {
  note: string;
  acts: Record<string, ActRecord>;
}

const baseline: Baseline = existsSync(BASELINE_PATH)
  ? (JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as Baseline)
  : { note: '', acts: {} };
const recorded: Record<string, ActRecord> = {};

/** The structural half of an act's answer: status, kinds + reasons, duration. */
function shape(r: CommandResult): Omit<ActRecord, 'state'> {
  const started = r.notes.find((n) => n.kind === 'engagement-started') as
    | { duration?: number }
    | undefined;
  return {
    status: r.status,
    notes: r.notes.map((n) => {
      const { reason, validator } = n as { reason?: unknown; validator?: unknown };
      return {
        kind: n.kind,
        ...(typeof reason === 'string' ? { reason } : {}),
        ...(typeof validator === 'string' ? { validator } : {}),
      };
    }),
    duration: started?.duration ?? null,
  };
}

/** Record (CLIQ_RECORD=1) or compare one act against the baseline. */
function check(key: string, r: CommandResult, state: Record<string, unknown>): void {
  const rec: ActRecord = { ...shape(r), state };
  if (RECORD) {
    recorded[key] = rec;
    return;
  }
  const want = baseline.acts[key];
  expect(want, `no baseline for '${key}' — record with CLIQ_RECORD=1`).toBeDefined();
  expect(rec, `'${key}' (${r.text}) differs from the before-record`).toEqual(want);
}

afterAll(() => {
  if (!RECORD || Object.keys(recorded).length === 0) return;
  const acts: Record<string, ActRecord> = { ...baseline.acts, ...recorded };
  const sorted = Object.fromEntries(
    Object.keys(acts)
      .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
      .map((k) => [k, acts[k]!]),
  );
  const out: Baseline = {
    note:
      'controller-liquidity: the before-record of every act whose logic moves (plan W0, D17). ' +
      'Written by CLIQ_RECORD=1 against HEAD before W1; compared on every other run. ' +
      'Do not hand-edit — a wave that fixes a recorded defect re-records its row and says so.',
    acts: sorted,
  };
  writeFileSync(BASELINE_PATH, `${JSON.stringify(out, null, 2)}\n`);
});

/* ───────────────────────── staging ───────────────────────── */

const TERMINUS = '/world/terminus';
const LOUNGE = '/world/lounge';
const SQUARE = '/world/terminus/market/square';

const open: Session[] = [];

async function parkAll(): Promise<void> {
  for (const s of open.splice(0)) s.close();
}

/** A staging character: seated on the extents, so its `eval` reaches. */
async function stager(handle: string, where: string, extra: Partial<Parameters<typeof Session.open>[1]> = {}): Promise<Session> {
  const s = await Session.open(handle, {
    startLocation: where,
    wizard: true,
    committees: [TERMINUS, LOUNGE],
    ...extra,
  });
  open.push(s);
  await s.drainProse();
  await nourish(s);
  return s;
}

/** The extent an act's place stands in — the `eval` parcel. */
const extentOf = (where: string): string => (where.startsWith(LOUNGE) ? LOUNGE : TERMINUS);

/**
 * Run a staging/reading `eval` in `extent` and hand back its JSON value.
 * ⚠ One EXPRESSION — the command line splits on `;` and pipes on `||`.
 */
async function ev<T = unknown>(s: Session, expr: string, extent = TERMINUS): Promise<T> {
  const r = await s.cmd(`eval --parcel ${extent} JSON.stringify(${expr})`);
  let said = (await r.said()).trim();
  const VALUE = /^\S+: ("(?:[^"\\]|\\.)*")\s*$/m;
  for (let i = 0; i < 8 && !VALUE.test(said) && !/\berror:|sandbox boundary denied/i.test(said); i++) {
    said += `\n${await s.listen(1_000)}`;
  }
  expect(said, `eval threw: ${expr}`).not.toMatch(/\berror:|sandbox boundary denied/i);
  const m = VALUE.exec(said);
  expect(m, `eval answered no value: ${said.slice(-400)}`).toBeTruthy();
  return JSON.parse(JSON.parse(m![1]!) as string) as T;
}

const byId = (id: string): string => `StuffApi.findById('${id}')`;

/** Where each handed thing is, in run-stable words (names for handed holders, template paths otherwise). */
const whereAll = (ids: Record<string, string>): string => {
  const names = Object.fromEntries(Object.entries(ids).map(([k, v]) => [v, k]));
  return `Object.fromEntries(${JSON.stringify(Object.entries(ids))}.map(([k, id]) => [k, ((t) => (t && !t.isDestroyed() ? { in: t.getContainer() ? (t.getContainer() === self ? 'me' : (${JSON.stringify(names)}[t.getContainer().stuffId] ?? t.getContainer().getTemplatePath())) : null, placement: t.getPlacement && t.getPlacement() ? t.getPlacement().name : null } : { gone: true }))(StuffApi.findById(id))]))`;
};

/** The kinds the actor holds, sorted. */
const heldKinds = `self.getContents().map(c => c.getTemplatePath()).sort()`;

/** The ids of what is in the actor's place now. */
const hereIds = `(self.getContainer() ? self.getContainer().getContents().map(c => c.stuffId) : [])`;

/**
 * The KINDS (a set, sorted) of the things in the place that were not there
 * before and are the actor's — made by them (`getMaker()`) or titled to them
 * (`stampedOwner()`). ⚠ Not every new thing: a public place's own traffic
 * (a hand walking in, a stall restocked, a fixture minted on first look)
 * lands in the same list and differs run to run; and a set, because how
 * many offcuts a felled tree throws is the tree's, not the act's.
 * (No `||` — the command line pipes on it.)
 */
const newMineKinds = (before: string[]): string =>
  `[...new Set((self.getContainer() ? self.getContainer().getContents() : []).filter(c => !${JSON.stringify(before)}.includes(c.stuffId) && c !== self && ((c.getMaker && c.getMaker() === self.getIdentityPath()) ? true : !!(c.stampedOwner && c.stampedOwner() && c.stampedOwner().templatePath === self.getIdentityPath()))).map(c => c.getTemplatePath()))].sort()`;

/** Run a command, answering every prompt with `answer` ('yes' by default). */
async function act(s: Session, text: string, answer: (p: unknown) => unknown = () => 'yes'): Promise<CommandResult> {
  const pending = s.cmd(text);
  let done = false;
  const settled = pending.then(
    (r) => {
      done = true;
      return r;
    },
    (e: unknown) => {
      done = true;
      throw e;
    },
  );
  while (!done) {
    const p = await s.awaitPrompt(250).catch(() => null);
    if (p === null) continue;
    const id = (p as { promptId?: string }).promptId;
    const asks = (p.outcome?.notes ?? []).some((n) => /^prompt-/.test(n.kind) && !/dismissed|validation-failed/.test(n.kind));
    if (id && asks) s.answerPrompt(id, answer(p));
  }
  const r = await settled;
  await s.drainProse();
  return r;
}

/** Real seconds a game duration takes at the default scale (12 game-s per real-s). */
const SCALE = 12;

/**
 * ⭐ Let an engaged act finish and say how it ended. Short acts are waited
 * out in real time; a long one is jumped (a jump under a day) and then
 * waited for. Run-stable: the kinds of the completion frame's notes.
 */
async function finish(s: Session, r: CommandResult): Promise<string[] | null> {
  const started = r.notes.find((n) => n.kind === 'engagement-started') as
    | { engagementId?: string; duration?: number }
    | undefined;
  if (!started?.engagementId) return null;
  const ms = started.duration ?? 0;
  const realMs = ms / SCALE;
  if (realMs > 60_000 && ms <= 86_400_000) {
    await advanceWorldClock(`${Math.ceil(ms / 1000) + 5} seconds`);
    await nourish(s);
  }
  const notes = await s
    .awaitActivity(started.engagementId, Math.min(realMs, 60_000) + 60_000)
    .catch(() => null);
  await s.drainProse();
  if (notes === null) return ['did-not-finish'];
  return notes.map((n) => {
    const reason = (n as { reason?: unknown }).reason;
    return typeof reason === 'string' ? `${n.kind}:${reason}` : n.kind;
  });
}

/* ───────────────────────── the acts ───────────────────────── */

/** One handed thing: its name in the row, its template, an overlay, and whether it is set down first. */
type Handed = [name: string, template: string, data?: Record<string, unknown>, drop?: boolean];

interface Act {
  /** The baseline key — `<verb>` or `<verb>.<form>`. */
  key: string;
  /** Where the act is done. */
  at: string;
  /** What the actor is handed first. */
  hand?: Handed[];
  /** The line typed, given the handed ids by name. */
  cmd: (id: Record<string, string>) => string;
  /** Extra staging after the hand (an `eval`, a second command). */
  stage?: (s: Session, id: Record<string, string>) => Promise<void>;
  /** Extra state, read after the act (and its completion). */
  read?: (s: Session, id: Record<string, string>) => Promise<Record<string, unknown>>;
  /**
   * A kind the act leaves in the place over the game clock with no
   * engagement to wait on (the mill's grind): wait until one of the actor's
   * appears, so the record never races the work.
   */
  awaitMine?: string;
  /** A durative act whose end is not the record (a line in the water): record at the start. */
  noFinish?: boolean;
  /** Session options beyond the stager's (parcels, offices). */
  session?: Partial<Parameters<typeof Session.open>[1]>;
}

/** Staging lines typed before the act (their answers are not the record). */
const typed =
  (...lines: Array<string | ((id: Record<string, string>) => string)>) =>
  async (s: Session, id: Record<string, string>): Promise<void> => {
    for (const l of lines) {
      const r = await s.cmd(typeof l === 'string' ? l : l(id));
      const started = r.notes.find((n) => n.kind === 'engagement-started') as { engagementId?: string } | undefined;
      if (started?.engagementId) await s.awaitActivity(started.engagementId, 120_000).catch(() => undefined);
      await s.drainProse();
    }
  };

const P = {
  fuelYard: '/world/terminus/rejection/location/fuel-yard',
  smelter: '/world/terminus/rejection/location/smelter',
  bar: '/world/lounge/location/bar',
  cookhouse: '/world/terminus/hearthworks/location/cookhouse',
  smithy: '/world/terminus/hearthworks/location/smithy',
  millHouse: '/world/terminus/hearts-delight/location/mill-house',
  sawmill: '/world/terminus/hearts-delight/location/sawmill',
  hangingWood: '/world/terminus/rejection/hanging-wood/ride',
  glasshouse: '/world/terminus/rejection/hanging-wood/glasshouse',
  ward: '/world/terminus/infirmary/ward',
  assayShed: '/world/terminus/rejection/location/assay-shed',
  drift: '/world/terminus/rejection/ferrow/timbered-drift',
  face: '/world/terminus/rejection/ferrow/face',
  claims: '/world/terminus/rejection/location/claims-office',
  homeField: '/world/terminus/eternal/campus-field/location/home-field',
  saltSpring: '/world/terminus/rejection/location/salt-spring',
  upperBench: '/world/terminus/hearts-delight/bench-field/location/upper-bench',
  cheeseRoom: '/world/terminus/hearts-delight/creamery/location/cheese-room',
  quay: '/world/terminus/wharfside/bank',
  goodsYard: '/world/terminus/goods-yards/yard',
  estuaryMouth: '/world/terminus/estuary/estuary-mouth',
  harborOffice: '/world/terminus/harbor/office',
  registry: '/world/terminus/registry/office',
  towpath: '/world/terminus/valley-road/towpath',
  gazette: '/world/terminus/gazette/office',
  dyehouse: '/world/terminus/wharfside/dyehouse/location/floor',
  tannery: '/world/terminus/wharfside/tannery/location/yard',
};

const ACTS: Act[] = [
  /* ── Appendix A rung 1 · the kernel and the trades ── */
  { key: 'harvest', at: P.fuelYard, stage: typed('get billhook'), cmd: () => 'harvest panel' },
  {
    key: 'smelt',
    at: P.smelter,
    hand: [
      ['ore1', '/world/terminus/rejection/thing/copper-ore', { grade: 0.24 }],
      ['ore2', '/world/terminus/rejection/thing/copper-ore', { grade: 0.24 }],
      ['coal', '/trade/fuel/thing/charcoal'],
    ],
    stage: typed((id) => `put #${id.ore1} in furnace`, (id) => `put #${id.ore2} in furnace`, (id) => `put #${id.coal} in furnace`),
    cmd: () => 'smelt',
  },
  { key: 'order', at: P.bar, cmd: () => 'order pint' },
  { key: 'butcher', at: P.cookhouse, stage: typed('get "boning knife"'), cmd: () => 'butcher carcass' },
  {
    key: 'mill',
    at: P.millHouse,
    hand: [['wheat', '/trade/farming/thing/crop/wheat', undefined, true]],
    cmd: (id) => `mill #${id.wheat} 0.72 at stones`,
    awaitMine: '/trade/milling/thing/flour-sack',
  },
  { key: 'saw', at: P.sawmill, hand: [['bole', '/trade/forestry/thing/bole', undefined, true]], cmd: (id) => `saw #${id.bole}` },
  { key: 'fell', at: P.hangingWood, hand: [['axe', '/trade/forestry/thing/felling-axe']], cmd: (id) => `fell oak with #${id.axe}` },
  {
    key: 'carve',
    at: SQUARE,
    hand: [
      ['hook', '/trade/forestry/thing/billhook'],
      ['blank', '/trade/carpentry/thing/riven-blank'],
    ],
    cmd: (id) => `carve peg from #${id.blank} --with #${id.hook}`,
  },
  {
    // ⭐ W19 (owner: `stir` is for runny stuff): a powder is stirred — the
    // row is `stir` again (W18 had moved it to `knead.compound`); the
    // recorded act (two minutes, engagement-started) never moved.
    key: 'stir',
    at: P.glasshouse,
    hand: [
      ['sand1', '/trade/glass/thing/sand'],
      ['sand2', '/trade/glass/thing/sand'],
    ],
    stage: typed((id) => `put #${id.sand1} in pot`, (id) => `put #${id.sand2} in pot`),
    cmd: () => 'stir pot',
  },
  { key: 'heat.build', at: P.smithy, stage: typed('light forge', 'pump forge'), cmd: () => 'heat ingot' },
  { key: 'heat.tool', at: P.ward, hand: [['kit', '/trade/medicine/thing/surgical-kit']], cmd: (id) => `heat #${id.kit}` },
  { key: 'dry.hang', at: P.cookhouse, hand: [['rag', '/stuff/thing/rag']], cmd: (id) => `dry #${id.rag}` },
  {
    key: 'dry.rub',
    at: P.cookhouse,
    hand: [
      ['rag', '/stuff/thing/rag'],
      ['cloth', '/stuff/thing/rag'],
    ],
    cmd: (id) => `dry #${id.rag} with #${id.cloth}`,
  },
  { key: 'wash', at: P.cookhouse, stage: typed('get "boning knife"'), cmd: () => 'wash boning' },
  { key: 'fit', at: P.smithy, cmd: () => 'fit pick' },
  // ⚠ A handed, COLD ingot: the smithy's own ingot sits by a forge the
  // other rows light, so its heat is the hour's, and the record must not be.
  { key: 'hammer', at: P.smithy, hand: [['ingot', '/trade/smithing/thing/iron-ingot']], cmd: (id) => `hammer #${id.ingot}` },
  { key: 'quench', at: P.smithy, hand: [['ingot', '/trade/smithing/thing/iron-ingot']], cmd: (id) => `quench #${id.ingot}` },
  {
    key: 'assay',
    at: P.assayShed,
    hand: [['ore', '/world/terminus/rejection/thing/copper-ore', { grade: 0.24 }]],
    cmd: (id) => `assay #${id.ore} at the bench`,
  },
  { key: 'hew', at: P.drift, cmd: () => 'hew west' },
  { key: 'stake', at: P.claims, cmd: () => 'stake 5,7,0' },
  { key: 'drift', at: P.face, hand: [['pick', '/trade/mining/thing/pick']], cmd: () => 'drift north' },
  { key: 'shore', at: P.drift, hand: [['set', '/trade/mining/thing/timber-set']], cmd: (id) => `shore with #${id.set}` },
  { key: 'char', at: P.fuelYard, cmd: () => 'char' },
  { key: 'plow', at: P.homeField, cmd: () => 'plow at the "far side"' },
  { key: 'bore', at: P.saltSpring, hand: [['rig', '/trade/drilling/thing/derrick']], cmd: () => 'bore' },
  {
    key: 'water',
    at: P.upperBench,
    hand: [['can', '/stuff/thing/vessel/watering-can']],
    cmd: () => 'water wheat at the middle',
  },
  {
    key: 'feed',
    at: P.homeField,
    hand: [['sack', '/stuff/thing/vessel/compost-sack']],
    cmd: (id) => `feed wheat at the "far side" with #${id.sack}`,
  },
  { key: 'sample', at: P.face, cmd: () => 'sample the "north face"' },
  // ⭐ `survey` was retired (owner, W17): the place read is `analyze rooms`.
  // The key stays the before-record's — the same read of the same drift, so
  // the shape it is compared against (ok, no notes, nothing moved) is too.
  { key: 'survey', at: P.drift, cmd: () => 'analyze rooms' },
  { key: 'sweep', at: P.cookhouse, hand: [['broom', '/stuff/thing/gear/broom']], cmd: (id) => `sweep with #${id.broom}` },
  { key: 'label', at: SQUARE, hand: [['crate', '/trade/farming/thing/crate']], cmd: (id) => `label #${id.crate} trial` },
  { key: 'dose', at: P.ward, cmd: () => 'dose me with vial' },
  { key: 'cool', at: P.ward, cmd: () => 'cool' },
  { key: 'warm', at: P.ward, cmd: () => 'warm by brazier' },
  { key: 'rinse', at: SQUARE, cmd: () => 'rinse' },
  { key: 'transfuse', at: P.ward, stage: typed('get syringe'), cmd: () => 'transfuse me from saline' },
  { key: 'pump', at: P.smithy, stage: typed('light forge'), cmd: () => 'pump forge' },
  {
    key: 'split',
    at: P.cheeseRoom,
    hand: [['wheel', '/trade/dairying/thing/wheel']],
    stage: typed('get knife'),
    cmd: (id) => `split #${id.wheel} with knife`,
  },
  {
    key: 'plant',
    at: SQUARE,
    hand: [
      ['pot', '/trade/farming/thing/pot/small', { interiorMaterial: '/stuff/idea/material/bulk/potting-soil', interiorAmount: 0.5 }],
      ['seed', '/trade/farming/thing/seed/turnip'],
    ],
    cmd: (id) => `plant #${id.seed} in #${id.pot}`,
  },
  {
    key: 'put',
    at: SQUARE,
    hand: [
      ['crate', '/trade/farming/thing/crate', undefined, true],
      ['rag', '/stuff/thing/rag'],
    ],
    cmd: (id) => `put #${id.rag} in #${id.crate}`,
  },
  {
    // ⚠ The stager is seated on Terminus and the Lounge only (an `eval`
    // reaches no further), so the knot is tied in the square, to a crate.
    key: 'tie',
    at: SQUARE,
    hand: [
      ['crate', '/trade/farming/thing/crate', undefined, true],
      ['rope', '/trade/cordage/thing/rope'],
    ],
    cmd: (id) => `tie #${id.rope} to #${id.crate} with bowline`,
  },
  { key: 'read', at: SQUARE, hand: [['book', '/platform/thing/book']], cmd: (id) => `read #${id.book} page 1` },
  { key: 'read.display', at: P.gazette, cmd: () => 'read screen' },
  { key: 'lie', at: P.ward, cmd: () => 'lie on cot' },
  { key: 'swim', at: P.quay, cmd: () => 'swim basin' },
  { key: 'hitch', at: P.goodsYard, cmd: () => 'hitch wagon to horse' },
  { key: 'unhitch', at: P.goodsYard, cmd: () => 'unhitch wagon' },
  { key: 'anchor', at: P.estuaryMouth, cmd: () => 'anchor' },
  { key: 'launch', at: P.estuaryMouth, cmd: () => 'launch' },
  { key: 'recover', at: P.estuaryMouth, cmd: () => 'recover' },
  { key: 'menu', at: P.ward, cmd: () => 'menu' },
  // ⚠ `pay office` (the bills arm) answered `nothing-owed` on one fresh
  // world and a controller-error on the next — a defect, unstable, so not
  // a record (the plan's W0 note). The person arm is recorded instead.
  { key: 'pay', at: P.harborOffice, cmd: () => 'pay founder 1' },
  { key: 'tip', at: P.bar, cmd: () => 'tip 1' },
  { key: 'title.transfer', at: P.registry, cmd: () => 'title transfer nosuchparcel to nobody' },
  { key: 'title.buy', at: P.registry, cmd: () => 'title buy nosuchlot' },
  { key: 'stall.rent', at: SQUARE, cmd: () => 'stall rent' },
  {
    key: 'maintain',
    at: P.towpath,
    hand: [['kit', '/system/residence/thing/householders-kit']],
    cmd: () => 'maintain cottage',
  },
  { key: 'dye', at: P.dyehouse, hand: [['bolt', '/trade/textiles/thing/bolt']], cmd: (id) => `dye #${id.bolt} in dye-vat` },
  {
    key: 'fish',
    at: P.quay,
    hand: [
      ['rod', '/trade/fishing/thing/rod'],
      ['worm', '/trade/fishing/thing/worm'],
    ],
    cmd: (id) => `fish with #${id.worm} using #${id.rod}`,
    noFinish: true,
  },
  { key: 'print', at: P.gazette, stage: typed('get ream'), cmd: () => 'print ledger on printer' },
  { key: 'tan', at: P.tannery, hand: [['hide', '/trade/ranching/thing/hide']], cmd: (id) => `tan #${id.hide}` },
  { key: 'berth', at: P.harborOffice, cmd: () => 'berth kittiwake at town-quay' },
  { key: 'course', at: P.estuaryMouth, cmd: () => 'course roads' },
  { key: 'journey', at: P.quay, cmd: () => 'journey to the market square' },
  { key: 'teleport.free', at: SQUARE, cmd: () => 'teleport /world/terminus/market/bakery' },
  { key: 'assess.self', at: SQUARE, cmd: () => 'assess' },
  { key: 'assess.ward', at: P.ward, cmd: () => 'assess me' },
  { key: 'ring', at: SQUARE, cmd: () => 'ring "curfew bell"' },
  { key: 'name', at: SQUARE, hand: [['jug', '/trade/ceramics/thing/jug']], cmd: (id) => `name #${id.jug} Mother` },
  { key: 'chronicle', at: SQUARE, cmd: () => 'chronicle' },
  /* ── the shell's file verbs (the tree is not a Stuff; state is the answer) ── */
  { key: 'cat', at: SQUARE, cmd: () => 'cat /stuff/thing/rag' },
  { key: 'ls', at: SQUARE, cmd: () => 'ls /stuff/thing/vessel' },
  { key: 'grep', at: SQUARE, cmd: () => 'grep rag /stuff/thing' },
  { key: 'mkdir', at: SQUARE, cmd: () => 'mkdir ~/cliq' },
  { key: 'cp', at: SQUARE, cmd: () => 'cp /stuff/thing/rag ~/rag' },
  { key: 'mv', at: SQUARE, stage: typed('mkdir ~/cliq-a'), cmd: () => 'mv ~/cliq-a ~/cliq-b' },
  { key: 'rm', at: SQUARE, stage: typed('mkdir ~/cliq-gone'), cmd: () => 'rm ~/cliq-gone' },
  { key: 'edit', at: SQUARE, cmd: () => 'edit -c ~/cliq-probe' },
];

/* ───────────────────────── the run ───────────────────────── */

/** Bring the world to `hour`:00 of the game day (a jump under a day). */
async function toHour(hour: number): Promise<void> {
  const now = await worldClockNow();
  const h = (((now % 86_400) + 86_400) % 86_400) / 3_600;
  const minutes = Math.round(((((hour - h) % 24) + 24) % 24) * 60);
  if (minutes > 0) await advanceWorldClock(`${minutes} minutes`);
}

beforeAll(async () => {
  // One clock, one sky: who is on shift, the light and the warmth.
  await toHour(11);
  await pinWeather('clear', SQUARE);
  // ⚠ The first `help` of a world warms the catalogue past a command's patience.
  const h = await Session.open(uniqueHandle('cliq-warmer'), { startLocation: SQUARE });
  for (let i = 0; i < 20; i++) {
    const r = await h.cmd('help look').catch(() => null);
    if (r?.status === 'ok') break;
    await new Promise((d) => setTimeout(d, 3_000));
  }
  h.close();
}, 600_000);
afterAll(async () => {
  await parkAll();
  await unpinWeather(SQUARE).catch(() => undefined);
});

/** Run one recorded act from a fresh stager: its answer and its run-stable state. */
async function runAct(
  a: Act,
  handle = `cliq-${a.key.split('.')[0]!.replace(/\W/g, '')}`,
): Promise<{ r: CommandResult; state: Record<string, unknown>; said: string }> {
  const s = await stager(uniqueHandle(handle), a.at, a.session);
  const extent = extentOf(a.at);
  const id: Record<string, string> = {};
  for (const [name, template, data, drop] of a.hand ?? []) {
    id[name] = await hand(s, template, data);
    if (drop) {
      const d = await s.cmd(`drop #${id[name]}`);
      expect(d.status, `staging: drop ${name}`).toBe('ok');
    }
  }
  await s.drainProse();
  if (a.stage) await a.stage(s, id);
  const before = await ev<string[]>(s, hereIds, extent);
  const r = await act(s, a.cmd(id));
  const said = await r.said();
  const completion = a.noFinish ? null : await finish(s, r);
  if (a.awaitMine) {
    for (let i = 0; i < 30; i++) {
      const mine = await ev<string[]>(s, newMineKinds(before), extent);
      if (mine.includes(a.awaitMine)) break;
      await new Promise((d) => setTimeout(d, 5_000));
    }
  }
  const state: Record<string, unknown> = {
    handed: Object.keys(id).length ? await ev(s, whereAll(id), extent) : {},
    held: await ev(s, heldKinds, extent),
    newMine: await ev(s, newMineKinds(before), extent),
    completion,
    ...(a.read ? await a.read(s, id) : {}),
  };
  s.close();
  open.splice(open.indexOf(s), 1);
  return { r, state, said };
}

const actNamed = (key: string): Act => {
  const a = ACTS.find((x) => x.key === key);
  if (!a) throw new Error(`no act row '${key}'`);
  return a;
};

/* ───────────── step 13: before and after (the record) ───────────── */

suite('13. before and after: every act whose logic moved matches the before-record', () => {
  afterAll(parkAll);
  // `CLIQ_ONLY=a,b` runs (and records) only those rows — the record is merged per key.
  const only = (process.env.CLIQ_ONLY ?? '').split(',').filter(Boolean);
  for (const a of ACTS.filter((x) => only.length === 0 || only.includes(x.key))) {
    it(a.key, async () => {
      const { r, state } = await runAct(a);
      check(a.key, r, state);
    }, 300_000);
  }
});

/* ───────────────────────── the drive (plan W15) ───────────────────────── */

const reasonOf = (r: CommandResult): string | undefined =>
  (r.notes.find((n) => typeof (n as { reason?: unknown }).reason === 'string') as { reason?: string } | undefined)
    ?.reason;
const notesOf = (r: CommandResult): string => JSON.stringify(r.notes);
const detailsOf = (r: CommandResult): string =>
  r.notes.map((n) => String((n as { detail?: unknown }).detail ?? '')).join(' | ');

/** A fresh player (no wizard, no seat), stood somewhere. */
async function player(handle: string, where: string): Promise<Session> {
  const s = await Session.open(uniqueHandle(handle), { startLocation: where });
  open.push(s);
  await s.drainProse();
  await nourish(s);
  return s;
}

/** The first option of whatever is asked: a choice's first response, an object prompt's first match, else yes. */
function firstAnswer(p: unknown): unknown {
  const frame = p as { payload?: { outcome?: { notes?: unknown[] } }; outcome?: { notes?: unknown[] } };
  const notes = (frame.outcome?.notes ?? frame.payload?.outcome?.notes ?? []) as {
    kind?: string;
    choices?: { response?: string }[];
    matches?: { stuffId?: string }[];
  }[];
  const n = notes.find((x) => x.kind?.startsWith('prompt-'));
  if (n?.kind === 'prompt-choice') return n.choices?.[0]?.response ?? '';
  if (n?.kind === 'prompt-mql-object') return n.matches?.[0]?.stuffId ?? '';
  return 'yes';
}

/** The money a person holds, summed over their accounts (rawValue, in minor units). */
const moneyOf = `(await BankingApi.accountIdsOf(self.getIdentityPath())).map(a => BankingApi.balanceOf(a).minor).reduce((x, y) => x + y, 0)`;

/** Open an account and have the Governor put `amount` in it (by the name the bank knows). */
async function fund(handle: string, amount: number): Promise<void> {
  const hall = await Session.open(handle, { startLocation: BANK_HALL });
  try {
    await hall.drainProse();
    await act(hall, 'bank open');
    // ⚠ The Governor finds the account's holder ONLINE (river-c's funding
    // keeps them in the hall while the override runs).
    const gov = await Session.open('founder', { startLocation: BANK_HALL });
    try {
      await gov.drainProse();
      const r = await gov.cmd(`reserve override ${amount} to ${handle} "wire: controller-liquidity drive"`);
      expect(r.status, `funding ${handle}: ${await r.said()}`).toBe('ok');
    } finally {
      gov.close();
    }
  } finally {
    hall.close();
  }
}

const BANK_HALL = '/world/terminus/counting-houses/banking-hall';
const STORE = '/world/terminus/general-store/shop-floor';
const PUT_IN = '/world/terminus/rejection/put-in/landing';
const REALTY = '/world/terminus/realty/office';
const PILOT_BANK = '/world/terminus/wharfside/bank';

/* ───────────── steps 1–2: a replaced controller (the CMS method of !527 step 16) ───────────── */

suite('1–2. a wizard re-points a view: the same world in other words, and a controller that asks', () => {
  afterAll(parkAll);
  const VIEWS: Record<string, string> = {
    harvest: '/platform/cmd/inventory/harvest',
    order: '/platform/cmd/retail/order',
    smelt: '/trade/smelting/cmd/smelting/smelt',
    butcher: '/trade/cooking/cmd/crafting/butcher',
  };
  const SHIPPED: Record<string, string> = {
    harvest: '/platform/idea/cmd/inventory/HarvestController',
    order: '/platform/idea/cmd/retail/OrderController',
    smelt: '/trade/smelting/idea/cmd/smelting/SmeltController',
    butcher: '/trade/cooking/idea/cmd/crafting/ButcherController',
  };
  const WORDED: Record<string, string> = {
    harvest: '/platform/idea/cmd/inventory/HarvestWordedController',
    order: '/platform/idea/cmd/retail/OrderWordedController',
    smelt: '/trade/smelting/idea/cmd/smelting/SmeltWordedController',
    butcher: '/trade/cooking/idea/cmd/crafting/ButcherWordedController',
  };
  /** What the replacement says, which the shipped controller never does. */
  const WORDS: Record<string, RegExp> = {
    harvest: /The harvest comes in|will not go that way|You set to/,
    order: /The order will not go that way|Your order is done/,
    smelt: /The smelt will not go that way \(no-fuel\)/,
    butcher: /comes apart into \d+ piece/,
  };
  let gov: Session;
  const titles: { extent: string; owner: string }[] = [];

  /** Re-point a view's controller through the CMS REST surface, as its titleholder. */
  const install = async (view: string, controller: string): Promise<void> => {
    const headers = { cookie: gov.cookie };
    const base = process.env.WIRE_SERVER_URL!;
    const { token } = (await (await fetch(`${base}/api/cms/csrf`, { headers })).json()) as { token: string };
    const read = (await (
      await fetch(`${base}/api/cms/read?backend=document&path=${encodeURIComponent(view)}`, { headers })
    ).json()) as { content?: string; body?: string };
    const data = JSON.parse(read.content ?? read.body ?? '') as Record<string, unknown>;
    const res = await fetch(`${base}/api/cms/write`, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json', 'X-CMS-CSRF': token },
      body: JSON.stringify({ backend: 'document', path: view, body: JSON.stringify({ ...data, controller }) }),
    });
    expect(res.status, `the CMS took ${view}: ${await res.clone().text()}`).toBe(200);
  };

  beforeAll(async () => {
    const clerk = await stager(uniqueHandle('cliq-clerk'), SQUARE);
    for (const view of Object.values(VIEWS)) {
      const t = await ev<{ extent: string; owner: string }>(
        clerk,
        `((p) => ({ extent: p.getExtent(), owner: JSON.stringify(p.getOwner()) }))(ParcelApi.coveringParcelOfSync('${view}'))`,
      );
      if (!titles.some((x) => x.extent === t.extent)) titles.push(t);
    }
    gov = await Session.open(uniqueHandle('cliq-keeper'), {
      startLocation: SQUARE,
      wizard: true,
      committees: [TERMINUS, LOUNGE],
      parcels: titles.map((t) => t.extent),
    });
    open.push(gov);
    await gov.drainProse();
  }, 300_000);

  afterAll(async () => {
    for (const k of Object.keys(VIEWS)) await install(VIEWS[k]!, SHIPPED[k]!);
    for (const t of titles) await ev(gov, `(await ParcelApi.transfer('${t.extent}', ${t.owner}), true)`, t.extent);
  });

  for (const key of ['harvest', 'smelt', 'order', 'butcher']) {
    it(`1. ${key}: a worded replacement ends in the before-record's world, duration and reasons`, async () => {
      await install(VIEWS[key]!, WORDED[key]!);
      try {
        const { r, state, said } = await runAct(actNamed(key), `cliq-l-${key}`);
        expect({ ...shape(r), state }, `'${key}' under ${WORDED[key]} (${said})`).toEqual(baseline.acts[key]);
        expect(said, 'and the words are the replacement\'s').toMatch(WORDS[key]!);
      } finally {
        await install(VIEWS[key]!, SHIPPED[key]!);
      }
    }, 300_000);
  }

  it('2. a divided field: the shipped controller refuses with the list; the asking one asks; the world is the same', async () => {
    const shipped = await stager(uniqueHandle('cliq-reap-a'), P.upperBench);
    const refused = await act(shipped, 'harvest wheat');
    expect(reasonOf(refused), notesOf(refused)).toBe('part-unnamed');
    expect(await refused.said(), 'the list').toMatch(/top end/i);
    expect(await refused.said(), 'the list').toMatch(/lane end/i);
    const named = await act(shipped, 'harvest wheat --at "top end"');
    const namedShape = shape(named);
    await park(shipped);

    await install(VIEWS.harvest!, '/platform/idea/cmd/inventory/HarvestAskingController');
    try {
      const asker = await stager(uniqueHandle('cliq-reap-b'), P.upperBench);
      let asked: unknown = null;
      const picked = await act(asker, 'harvest wheat', (p) => {
        asked = p;
        return firstAnswer(p);
      });
      expect(asked, 'the asking controller put the fields to the player').not.toBeNull();
      expect(JSON.stringify(asked)).toMatch(/top end/i);
      expect(shape(picked), 'answering the prompt is naming the field').toEqual(namedShape);
      await park(asker);
    } finally {
      await install(VIEWS.harvest!, SHIPPED.harvest!);
    }
  }, 300_000);
});

/** Close a session and drop it from the open list. */
async function park(s: Session): Promise<void> {
  s.close();
  const i = open.indexOf(s);
  if (i >= 0) open.splice(i, 1);
}

/* ───────────── step 3: the protection test ───────────── */

/**
 * ⭐ (build, W15) The bare controller is the SHIPPED one: after W3 the seven
 * controllers carry no check (`lint:controller-gates` names none of them), so
 * a replacement that "only calls the object" calls exactly what they call.
 * Each act is driven as a player the object must refuse.
 */
suite('3. each protected act refuses another player, with nothing but the object to stop it', () => {
  afterAll(parkAll);
  it('3a. renaming another player\'s chat channel', async () => {
    const owner = await player('cliq-chan-a', SQUARE);
    const other = await player('cliq-chan-b', SQUARE);
    const name = `cliq${Date.now().toString(36)}`;
    expect((await owner.cmd(`chat make ${name}`)).status).toBe('ok');
    expect((await other.cmd(`chat join ${name}`)).status).toBe('ok');
    const r = await other.cmd(`chat rename ${name} ${name}x`);
    expect(r.status, notesOf(r)).not.toBe('ok');
    expect(reasonOf(r), notesOf(r)).toMatch(/owner|not-/);
  }, 120_000);

  it('3b. `errors raw` without the right', async () => {
    const p = await player('cliq-errs', SQUARE);
    const r = await p.cmd('errors raw');
    expect(reasonOf(r), notesOf(r)).toBe('pm-only');
  }, 60_000);

  it('3c. a Tier C setting, even by the Prime Minister', async () => {
    const pm = await Session.open('founder', { startLocation: SQUARE });
    open.push(pm);
    await pm.drainProse();
    const r = await pm.cmd('config banking.salesTaxRate 0.5');
    expect(reasonOf(r), notesOf(r)).toBe('tier-c');
  }, 60_000);

  it('3d. a wiki page\'s hidden revision', async () => {
    // A level-3 reader is an owner of the /wiki root (the encyclopedia's own
    // capability, never the wizard axis): seated on its committee as owner.
    const author = await Session.open(uniqueHandle('cliq-wiki-ed'), { startLocation: SQUARE, committees: ['/wiki:owner'] });
    open.push(author);
    await author.drainProse();
    const page = `cliqwiki${Date.now().toString(36)}`;
    const body = `Open words. <spoiler level="3">CLIQSECRET</spoiler> More open words.`;
    const made = await act(author, `wiki create ${page} --title "Cliq ${page}"`, () => body);
    expect(made.status, `${notesOf(made)} ${await made.said()}`).toBe('ok');
    const own = await author.prose(`wiki read ${page}`);
    expect(own, 'the author, at level 3, reads the line').toContain('CLIQSECRET');
    const reader = await player('cliq-wiki', SQUARE);
    for (const line of [`wiki diff ${page}`, `wiki history ${page}`, `wiki read ${page}`]) {
      const said = await reader.prose(line);
      expect(said, `${line}: a player reads past nothing`).not.toContain('CLIQSECRET');
    }
  }, 120_000);

  it('3e. hiring past the criteria', async () => {
    // The general store's hand wants two settled gigs; a newcomer has none.
    const p = await player('cliq-hire', STORE);
    const r = await act(p, 'job apply hand');
    expect(r.status, notesOf(r)).not.toBe('ok');
    expect(await r.said(), 'the refusal names the number short').toMatch(/gig/i);
  }, 120_000);

  it('3f. locking a way you hold no key to', async () => {
    const p = await player('cliq-lock', P.harborOffice);
    const r = await p.cmd('lock north');
    expect(r.status, notesOf(r)).not.toBe('ok');
  }, 60_000);

  it('3g. posting to a board outside its audience', async () => {
    const owner = await player('cliq-board-a', SQUARE);
    const other = await player('cliq-board-b', SQUARE);
    const name = `cliqb${Date.now().toString(36)}`;
    expect((await owner.cmd(`forum make ${name}`)).status).toBe('ok');
    const r = await other.cmd(`forum post ${name} hello from outside`);
    expect(r.status, notesOf(r)).not.toBe('ok');
    expect(reasonOf(r), notesOf(r)).toMatch(/member|audience|not-/);
  }, 120_000);
});

/* ───────────── steps 4–9: reach, here, quoting, values, the new forms ───────────── */

suite('4–9. the player-facing forms', () => {
  afterAll(parkAll);

  it('4. `eat orange` finds it in the open bag you carry; a shut chest says so; `--top` has none; `me:I:` finds it anywhere', async () => {
    const s = await stager(uniqueHandle('cliq-eat'), SQUARE);
    const bag = await hand(s, '/trade/papermaking/thing/bag');
    const orange = await hand(s, '/trade/farming/thing/orange');
    expect((await s.cmd(`put #${orange} in #${bag}`)).status).toBe('ok');
    const top = await s.cmd('eat orange --top');
    expect(top.status, `--top reaches only what is at hand: ${notesOf(top)}`).not.toBe('ok');
    const look = await s.cmd('look me:I:orange');
    expect(look.status, notesOf(look)).toBe('ok');
    const ate = await act(s, 'eat orange');
    expect(ate.status, `in the open bag: ${notesOf(ate)}`).toBe('ok');
    const chest = await hand(s, '/world/terminus/hesper/thing/sea-chest', undefined);
    expect((await s.cmd(`drop #${chest}`)).status).toBe('ok');
    const second = await hand(s, '/trade/farming/thing/orange');
    expect((await s.cmd(`put #${second} in #${chest}`)).status).toBe('ok');
    expect((await s.cmd(`close #${chest}`)).status).toBe('ok');
    const shut = await s.cmd('eat orange');
    expect(
      shut.notes.some((n) => (n as { validator?: string }).validator === 'reach:enclosed-shut'),
      `the chest is shut, said by the reach: ${notesOf(shut)}`,
    ).toBe(true);
    expect(await shut.said()).toMatch(/shut/i);
    const anywhere = await s.cmd('look here:I:orange');
    expect(anywhere.status, `MQL addresses through the lid: ${notesOf(anywhere)}`).toBe('ok');
  }, 180_000);

  it('5. in a boat on the river, `look here` is the river and `look me:e` is the boat', async () => {
    const s = await stager(uniqueHandle('cliq-boat'), PUT_IN);
    const into = await s.cmd('go canoe');
    expect(into.status, await into.said()).toBe('ok');
    const launched = await s.cmd('launch');
    expect(launched.status, await launched.said()).toBe('ok');
    await s.drainProse();
    const here = await s.prose('look here');
    const boat = await s.prose('look me:e');
    expect(here, 'the place').toMatch(/water|river|current|bank/i);
    expect(boat, 'the boat').toMatch(/canoe/i);
    expect(here).not.toEqual(boat);
  }, 180_000);

  it('6. `buy "padded gambeson"` buys it; unquoted it is refused with the hint; `say` takes a sentence', async () => {
    const handle = uniqueHandle('cliq-buyer');
    await fund(handle, 500);
    const s = await Session.open(handle, { startLocation: STORE });
    open.push(s);
    await s.drainProse();
    const bare = await s.cmd('buy padded gambeson');
    expect(reasonOf(bare), notesOf(bare)).toBe('bind-failed');
    expect(detailsOf(bare), 'the hint names the quoting').toMatch(/"padded gambeson"|quote/i);
    const quoted = await act(s, 'buy "padded gambeson"');
    expect(quoted.status, `${notesOf(quoted)} ${await quoted.said()}`).toBe('ok');
    expect(await s.prose('inventory')).toMatch(/gambeson/i);
    const said = await s.cmd('say the gambeson fits like a dream');
    expect(said.status).toBe('ok');
    expect(await said.said()).toMatch(/the gambeson fits like a dream/i);
  }, 180_000);

  it('7. a bad `values:` word is refused with the list; a duration is taken in its written forms', async () => {
    const s = await stager(uniqueHandle('cliq-values'), P.smithy);
    const bad = await s.cmd('draught forge medium');
    expect(bad.status).not.toBe('ok');
    expect(detailsOf(bad), notesOf(bad)).toMatch(/wide.*half.*low.*banked/);
    const notDuration = await s.cmd('press publish cliq --expires 10');
    expect(detailsOf(notDuration), notesOf(notDuration)).toMatch(/is not a duration/);
    for (const d of ['90m', '2 hours']) {
      const ok = await s.cmd(`press publish cliq --expires ${d}`);
      expect(detailsOf(ok), `${d} is a duration: ${notesOf(ok)}`).not.toMatch(/is not a duration/);
    }
  }, 120_000);

  it('8. the three representatives answer in their new forms, and `help` lists them', async () => {
    const s = await stager(uniqueHandle('cliq-forms'), P.smithy);
    expect((await s.cmd('notify set friends --login show')).status).toBe('ok');
    const show = await s.cmd('notify show friends');
    expect(show.status, notesOf(show)).toBe('ok');
    expect((await s.cmd('notify move friends --above contacts')).status).not.toBe('error');
    expect(await s.prose('help notify')).toMatch(/notify set[\s\S]*notify move/);
    await s.cmd('light forge');
    const low = await s.cmd('draught forge low');
    expect(low.notes.every((n) => n.kind !== 'command-rejected'), `draught <fire> <setting> routes: ${notesOf(low)}`).toBe(true);
    expect(await s.prose('help draught')).toMatch(/draught (<|&lt;)fire(>|&gt;)|draught forge wide/);
    // The two shapes of `dry`, where a rack stands (it affords the hang).
    const k = await stager(uniqueHandle('cliq-forms-dry'), P.cookhouse);
    const wet = await hand(k, '/stuff/thing/gear/towel');
    const towel = await hand(k, '/stuff/thing/gear/towel');
    const rub = await k.cmd(`dry #${wet} with #${towel}`);
    const hang = await k.cmd(`dry #${wet} on rack`);
    const routed = (r: CommandResult): boolean => r.notes.every((n) => n.kind !== 'command-rejected');
    expect(routed(rub), `dry … with routes to the rub: ${notesOf(rub)}`).toBe(true);
    expect(routed(hang), `dry … on routes to the hang: ${notesOf(hang)}`).toBe(true);
    // (The wire's plain text keeps the markup's entity escapes.)
    expect(await s.prose('help dry')).toMatch(/dry (<|&lt;)target(>|&gt;) with (<|&lt;)cloth(>|&gt;)/);
  }, 180_000);

  it('9. `client-layout save list` then `client-layout recall list` round-trips', async () => {
    const s = await player('cliq-cockpit', SQUARE);
    const saved = await s.cmd('client-layout save list');
    expect(saved.status, notesOf(saved)).toBe('ok');
    const recalled = await s.cmd('client-layout recall list');
    expect(recalled.status, notesOf(recalled)).toBe('ok');
    const listed = await s.cmd('client-layout list');
    expect(await listed.said()).toMatch(/\blist\b/);
  }, 60_000);
});

/* ───────────── steps 10–12: the confirmed defects ───────────── */

suite('10–12. the defects, driven', () => {
  afterAll(parkAll);

  it('10a. a transfusion narrates, credits and records', async () => {
    const s = await stager(uniqueHandle('cliq-transfuse'), P.ward);
    await hand(s, '/trade/medicine/thing/syringe');
    const bag = await hand(s, '/trade/medicine/thing/saline-bag');
    const r = await act(s, `transfuse me from #${bag}`);
    expect(r.notes.some((n) => n.kind === 'engagement-started'), `the line went in: ${notesOf(r)} ${await r.said()}`).toBe(true);
    const done = await finish(s, r);
    expect(done, 'and the completion ran to its end').toEqual(['engagement-completed']);
  }, 300_000);

  it('10b. a `search` finishes and records what it searched', async () => {
    const s = await stager(uniqueHandle('cliq-search'), SQUARE);
    const r = await act(s, 'search');
    const done = await finish(s, r);
    expect(done, `the search ran to its end: ${notesOf(r)}`).toEqual(['engagement-completed']);
  }, 300_000);

  it('10c. a teleport in an extent you hold arrives', async () => {
    const s = await stager(uniqueHandle('cliq-hop'), SQUARE);
    const r = await act(s, 'teleport /world/terminus/market/bakery');
    await finish(s, r);
    const at = await ev<string>(s, `self.getContainer().getTemplatePath()`);
    expect(at, notesOf(r)).toBe('/world/terminus/market/bakery');
  }, 300_000);

  it('11a. a refused land purchase leaves the buyer\'s money untouched', async () => {
    const handle = uniqueHandle('cliq-lander');
    await fund(handle, 300);
    const s = await Session.open(handle, { startLocation: REALTY, wizard: true, committees: [TERMINUS, LOUNGE] });
    open.push(s);
    await s.drainProse();
    const before = await ev<number>(s, moneyOf);
    const r = await act(s, 'title buy nosuchlot');
    expect(r.status, notesOf(r)).not.toBe('ok');
    expect(await ev<number>(s, moneyOf), 'not a coin moved').toBe(before);
  }, 180_000);

  it('11b. a pilot is paid before she tells: with no coin, nothing is told', async () => {
    // C27 — the fee used to be taken AFTER the claims were written, so a
    // refused fee had already told. (The paid path is maritime-space's step 21.)
    const poor = await stager(uniqueHandle('cliq-pilot-poor'), PILOT_BANK);
    // ⚠ Only the map's own lines: the prose window also catches the room
    // (finalize: a cook leaving to the northwest made this red once).
    const mapOnly = (said: string): string =>
      said.split('\n').filter((l) => /\bmap\b|greywater/i.test(l)).join('\n');
    const before = mapOnly(await poor.prose('map greywater'));
    expect(before, 'the map read answered').not.toBe('');
    const unpaid = await act(poor, 'pilot');
    expect(reasonOf(unpaid), notesOf(unpaid)).toBe('cannot-pay');
    expect(mapOnly(await poor.prose('map greywater')), 'told nothing').toEqual(before);
  }, 240_000);

  it('12a + 12b. introducing a player: they know you; a gift of land: the receiver owns it', async () => {
    const giverHandle = uniqueHandle('cliq-gift-a');
    await fund(giverHandle, 20_000);
    const giver = await Session.open(giverHandle, { startLocation: REALTY, wizard: true, committees: [TERMINUS, LOUNGE] });
    open.push(giver);
    await giver.drainProse();
    const receiver = await player('cliq-gift-b', REALTY);
    const nameOf = async (x: Session): Promise<string> =>
      String(((await x.query('me', { fields: ['displayName'] }))[0] as { displayName?: unknown } | undefined)?.displayName ?? '');
    // 12a — the introduction: after it the receiver sees the giver by name.
    const name = await nameOf(giver);
    expect(name, 'the giver has a name').toBeTruthy();
    expect((await giver.cmd('introduce')).status).toBe('ok');
    await receiver.drainProse();
    expect(await receiver.prose('look'), 'the receiver knows the giver by name').toContain(name);
    // 12b — buy a lot, give it away.
    const book = await giver.prose('title list');
    let lot = '';
    for (const line of book.split('\n')) {
      const m = /^\s*([a-z][a-z-]*-\d+)\s+—\s+(.*)$/.exec(line);
      if (m && !/sold|held|owned/i.test(m[2]!)) {
        lot = m[1]!;
        break;
      }
    }
    expect(lot, `a lot for sale: ${book.slice(0, 400)}`).toBeTruthy();
    const bought = await act(giver, `title buy ${lot}`);
    expect(bought.status, `${notesOf(bought)} ${await bought.said()}`).toBe('ok');
    const extent = (await ev<string[]>(giver, `(await AccessApi.heldExtents(self)).filter(e => e.includes('${lot}'))`))[0];
    expect(extent, 'the bought lot is a held extent').toBeTruthy();
    const rName = await nameOf(receiver);
    expect((await receiver.cmd('introduce')).status).toBe('ok');
    await giver.drainProse();
    // ⭐ A title pushed onto a person needs their yes: the receiver answers.
    const giving = giver.cmd(`title transfer ${extent} to "${rName}"`);
    const ask = await receiver.awaitPrompt(30_000);
    const askId = (ask as { promptId?: string; payload?: { promptId?: string } }).promptId ?? (ask as { payload?: { promptId?: string } }).payload?.promptId;
    expect(askId, 'the receiver is asked').toBeTruthy();
    receiver.answerPrompt(askId!, 'yes');
    const gave = await giving;
    expect(gave.status, `${notesOf(gave)} ${await gave.said()}`).toBe('ok');
    const owner = await ev<{ kind?: string; templatePath?: string }>(
      giver,
      `ParcelApi.coveringParcelOfSync(${JSON.stringify(extent)}).getOwner()`,
    );
    expect(owner.kind).toBe('player');
    expect(owner.templatePath, 'a person, by identity').toMatch(/^\/platform\/agent\/Avatar\/.+/);
    expect(owner.templatePath, 'not the giver').not.toBe(await ev<string>(giver, 'self.getIdentityPath()'));
  }, 300_000);
});

/* ───────────── step 14: a restart mid-act, LAST ───────────── */

/**
 * A real restart, as !527 steps 17–18 do: an act in progress (a smelt run,
 * a mill grind) survives it and completes, and the world reads back the
 * same. Only in a world this run owns.
 */
suite.skipIf(!isOwnedTestWorld())('14. a restart mid-act', () => {
  afterAll(parkAll);
  const smelter = uniqueHandle('cliq-r-smelt');
  const miller = uniqueHandle('cliq-r-mill');
  const opts = { wizard: true, committees: [TERMINUS, LOUNGE] };
  /** What the furnace here holds, by kind, and whether it is still running. */
  const inFurnace = `((f) => f ? f.getContents().map(c => c.getTemplatePath()).sort() : null)(self.getContainer().getContents().find(c => /\\/furnace$/.test(c.getTemplatePath() ?? '')))`;
  let smeltBefore: string[] = [];

  it('14a. start a grind and a smelt run', async () => {
    const m = await Session.open(miller, { startLocation: P.millHouse, ...opts });
    open.push(m);
    await m.drainProse();
    await nourish(m);
    const wheat = await hand(m, '/trade/farming/thing/crop/wheat');
    expect((await m.cmd(`drop #${wheat}`)).status).toBe('ok');
    const g = await m.cmd(`mill #${wheat} 0.72 at stones`);
    expect(g.status, `${notesOf(g)} ${await g.said()}`).toBe('ok');

    const s = await Session.open(smelter, { startLocation: P.smelter, ...opts });
    open.push(s);
    await s.drainProse();
    await nourish(s);
    for (let i = 0; i < 2; i++) {
      const id = await hand(s, '/world/terminus/rejection/thing/copper-ore', { grade: 0.24 });
      expect((await s.cmd(`put #${id} in furnace`)).status).toBe('ok');
    }
    for (let i = 0; i < 3; i++) {
      const id = await hand(s, '/trade/fuel/thing/charcoal');
      expect((await s.cmd(`put #${id} in furnace`)).status).toBe('ok');
    }
    // The fire's own fuel, stoked, and lit — then the charge is worked.
    const kindling = await hand(s, '/trade/fuel/thing/charcoal');
    await s.cmd(`stoke #${kindling} into furnace`);
    const lit = await s.cmd('light furnace');
    expect(lit.status, `the furnace lights: ${notesOf(lit)} ${await lit.said()}`).toBe('ok');
    const r = await s.cmd('smelt');
    expect(r.notes.some((n) => n.kind === 'engagement-started'), `the run began: ${notesOf(r)} ${await r.said()}`).toBe(true);
    smeltBefore = await ev<string[]>(s, inFurnace);
  }, 300_000);

  it('14b. restart: both complete, and the world reads back', async () => {
    for (const s of [...open]) await park(s);
    await new Promise((r) => setTimeout(r, 8_000)); // let the logout saves land
    const serverDir = fileURLToPath(new URL('../../server', import.meta.url));
    // ⭐ A RESTART, not a crash (the cleanliness drive's precedent):
    // preflight's default two seconds SIGKILLs the server before its
    // shutdown capture, so the mill house's record — the hopper's
    // `pendingGrind` — was never written and the grind could not land
    // (finalize, 2026-11-11: W20's green was the capture winning the race).
    spawnSync('node', [join(serverDir, 'scripts', 'dev-preflight.mjs'), String(WIRE_PORT), 'server'], {
      cwd: serverDir,
      stdio: 'ignore',
      env: { ...process.env, PREFLIGHT_GRACE_MS: '300000' },
    });
    process.env.WIRE_SERVER_URL = await bootOwnedWorld();

    const s = await Session.open(smelter, opts);
    open.push(s);
    await s.drainProse();
    const m = await Session.open(miller, opts);
    open.push(m);
    await m.drainProse();
    await advanceWorldClock('2 hours');
    let after: string[] = [];
    for (let i = 0; i < 24; i++) {
      after = await ev<string[]>(s, inFurnace);
      if (JSON.stringify(after) !== JSON.stringify(smeltBefore)) break;
      await new Promise((r) => setTimeout(r, 5_000));
    }
    expect(after, `the furnace's charge became something (before: ${smeltBefore.join(', ')})`).not.toEqual(smeltBefore);
    let flour: string[] = [];
    for (let i = 0; i < 24; i++) {
      flour = await ev<string[]>(m, `self.getContainer().getContents().map(c => c.getTemplatePath()).filter(t => (t ?? '').endsWith('-sack')).filter(t => t.includes('/milling/'))`);
      if (flour.length > 0) break;
      await new Promise((r) => setTimeout(r, 5_000));
    }
    expect(flour, 'the grind completed into a sack').not.toEqual([]);
  }, 900_000);
});
