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

import { readFileSync, writeFileSync, existsSync } from 'fs';
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
} from '../src/harness';
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
    cmd: (id) => `mill #${id.wheat} 0.72`,
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
    cmd: (id) => `feed wheat at the far side with #${id.sack}`,
  },
  { key: 'sample', at: P.face, cmd: () => 'sample the "north face"' },
  { key: 'survey', at: P.drift, cmd: () => 'survey' },
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

suite('the before-record: one act per controller whose logic moves', () => {
  afterAll(parkAll);
  // `CLIQ_ONLY=a,b` runs (and records) only those rows — the record is merged per key.
  const only = (process.env.CLIQ_ONLY ?? '').split(',').filter(Boolean);
  for (const a of ACTS.filter((x) => only.length === 0 || only.includes(x.key))) {
    it(a.key, async () => {
      const s = await stager(uniqueHandle(`cliq-${a.key.split('.')[0]!.replace(/\W/g, '')}`), a.at, a.session);
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
      check(a.key, r, state);
      s.close();
      open.splice(open.indexOf(s), 1);
    }, 300_000);
  }
});
