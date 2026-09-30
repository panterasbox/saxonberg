/**
 * Surveying (metal chain M7) — ⭐ **the read that makes finding copper an
 * inference rather than luck.**
 *
 * The load-bearing assertions:
 *
 *  1. ⭐⭐ **Competence changes READINGS, never the world** — asserted by
 *     the IDENTITY of the underlying figure across two bands, not by a
 *     range. A better prospector does not get more ore from the same
 *     rock.
 *  2. ⭐ **Three points beat one**, and the arithmetic is the reason:
 *     independent observations average and the residual narrows as
 *     `error / √n`.
 *  3. ⚠ **Dip is unobtainable from the surface** — by construction (a
 *     line has no fall in it), and obtainable underground on a vein.
 *  4. ⭐ **A barren survey is a legitimate, informative outcome**, and it
 *     names why.
 *  5. ⭐⭐ **Survey knowledge is a per-viewer BELIEF**: two characters on
 *     one outcrop hold different books.
 *  6. Each platform stanza's controller path resolves to a row this pack
 *     actually ships — the P1 mitigation, checked rather than promised.
 */

import '@saxonberg/server/test-bootstrap';
import { AdvancementMixin } from '@saxonberg/server/mud/lib/advancement/Advancement';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import StrikeReading from '../../../reading/StrikeReading';
import DipReading from '../../../reading/DipReading';
import GroundReading from '../../../reading/GroundReading';
import type Reading from '@saxonberg/server/mud/lib/instrument/Reading';
import {
  driveMeasure,
  driveAnalyze,
} from '@saxonberg/server/mud/platform/idea/reading/__tests__/drive';
import { applyRowFrom } from '@saxonberg/server/mud/platform/idea/reading/__tests__/row';
import SurveyInstrument from '../../../../thing/instrument/SurveyInstrument';
import Deposit from '@saxonberg/content-ground/src/idea/Deposit';
import MineRoom from '../../../../location/MineRoom';
import CartesianZone from '@saxonberg/server/mud/platform/idea/location/CartesianZone';
import Material from '@saxonberg/server/mud/platform/idea/material/Material';
import { CommandDefinition } from '@saxonberg/server/mud/lib/command/CommandDefinition';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { CardApi } from '@saxonberg/server/mud/api/card';
import { BeliefStoreMixin, DISCOVERY } from '@saxonberg/server/mud/lib/belief/BeliefStore';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import {
  TestActor,
  makeContext,
  standUpBranchHarness,
} from '@saxonberg/server/mud/platform/idea/cmd/crafting/__tests__/branch-fixtures';
import type { CommandContext } from '@saxonberg/server/mud/api/command';
import type { CardPayload } from '@saxonberg/types';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';

const SURFACE = '/world/fx-mine/pithead';
const UNDER = '/world/fx-mine/mine';
const DEPOSIT = '/world/fx-mine/idea/deposit/fx';
const SLATE = '/stuff/idea/material/rock/slate';
const MALACHITE = '/stuff/idea/material/mineral/malachite';
const QUARTZ = '/stuff/idea/material/mineral/quartz';

/** A prospector: the harness actor with a field book. */
// The competence read runs ON the prospector since the OO sweep;
// pinned by the module `band` var (credits no-op — PM disconnected).
class Prospector extends AdvancementMixin(BeliefStoreMixin(TestActor)) {
  override async competenceBandFor(): Promise<CompetenceBandName> {
    return band;
  }
}
/** Where this trade's channel rows live, for {@link run}. */
const ROWS = fileURLToPath(
  new URL('../../../../../content/trade/mining/idea/reading/', import.meta.url),
);

let surface: CartesianZone;
let under: CartesianZone;
let deposit: Deposit;
let band: CompetenceBandName;

function outcropAt(x: number, y: number): MineRoom {
  const r = makeStuff(() => new MineRoom());
  surface.addLocation(r as unknown as never, x, y, 0);
  return r;
}

function workingAt(x: number, y: number, z: number): MineRoom {
  const r = makeStuff(() => new MineRoom());
  under.addLocation(r as unknown as never, x, y, z);
  return r;
}

function prospector(withInstrument = true): Prospector {
  const p = makeStuff(() => new Prospector());
  if (withInstrument) {
    ContainmentApi.move(
      makeStuff(() => new SurveyInstrument()) as unknown as Stuff & Containable,
      p as unknown as Stuff & Container,
    );
  }
  return p;
}

/**
 * ⭐⭐ **Dispatch through the VERB.** The channels are `Reading` rows
 * now, and their rungs are gated to the two controllers — so this drives
 * `measure`/`analyze` for real and stubs exactly one thing, the channel
 * lookup. `applyRowFrom` reads the SHIPPED yaml, so a row that stops
 * agreeing with its class fails here.
 */
async function run(
  Channel: new () => Reading,
  channel: string,
  who: Prospector,
  where: Stuff,
  text: string,
): Promise<CommandContext> {
  ContainmentApi.move(who as unknown as Stuff & Containable, where as unknown as Stuff & Container);
  const ctx = makeContext(who as unknown as Stuff, where, text);
  // ⚠ Stand in for the BINDER: `measure strike` / `measure dip` declare
  // a `tool` arg defaulting to `reachable:[capability.surveying]`, so
  // the binder finds the instrument and the controller reads it. A
  // hand-built model skips the binder.
  const held =
    (who as unknown as { getContents?(): unknown[] }).getContents?.() ?? [];
  const tool = held.find((i) => {
    const t = i as { hasCapability?(c: string): boolean };
    return typeof t.hasCapability === 'function' && t.hasCapability('surveying');
  });
  const reading = applyRowFrom(
    makeStuff(() => new Channel()),
    `${ROWS}${channel}.yaml`,
  );
  const tools = tool === undefined ? [] : [tool as Stuff];
  if (channel === 'ground') await driveAnalyze(reading, ctx, { tools });
  else await driveMeasure(reading, ctx, { tools });
  return ctx;
}

function rejected(ctx: CommandContext): string | null {
  const note = ctx.getNotes().find((n) => n.kind === 'controller-rejected');
  return note ? (note as unknown as { reason: string }).reason : null;
}

function bookOf(who: Prospector): Array<{ referent: string; value: string | null }> {
  return [...who.recallRealm(DISCOVERY)].map(([referent, r]) => ({
    referent,
    value: r.knownAs,
  }));
}

describe('surveying', () => {
  beforeEach(async () => {
    await standUpBranchHarness();
    installV1QuantityMarshallers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    band = 'competent';

    const m = makeStuffAtPath(() => new Material(), SLATE);
    (m as unknown as { hardness: Quantity<'MPa'> }).hardness = Quantity.of(90, 'MPa');

    surface = makeStuffAtPath(() => new CartesianZone(), SURFACE);
    surface.setCellSize(10);
    (surface as unknown as { deposit: string }).deposit = DEPOSIT;
    under = makeStuffAtPath(() => new CartesianZone(), UNDER);
    under.setCellSize(10);
    (under as unknown as { deposit: string }).deposit = DEPOSIT;

    deposit = makeStuffAtPath(() => new Deposit(), DEPOSIT);
    deposit.setName('ferrow');
    deposit.setStratigraphy([{ toZ: -4000, host: SLATE }]);
    deposit.setWaterTable(-450);
    deposit.setLode({
      through: [0, 0, -10], strike: 41, dip: 62,
      thickness: 12, strikeExtent: 300, dipExtent: 300, gangue: QUARTZ,
    });
    deposit.setZones([{ toZ: -4000, mineral: MALACHITE, meanGrade: 0.08, spread: 0.04 }]);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  // ───────────────── measure strike ─────────────────

  it('reads a bearing on the outcrop, and writes it to the field book', async () => {
    const who = prospector();
    const ctx = await run(StrikeReading, 'strike', who, outcropAt(0, 0), 'measure strike');
    expect(rejected(ctx)).toBeNull();
    const book = bookOf(who);
    expect(book).toHaveLength(1);
    expect(book[0]!.referent).toContain('#strike');
    expect(Number(book[0]!.value)).toBeGreaterThan(0);
  });

  it('⚠ with no instrument it refuses, and says which instrument', async () => {
    const ctx = await run(
      StrikeReading,
      'strike',
      prospector(false),
      outcropAt(0, 0),
      'measure strike',
    );
    expect(rejected(ctx)).toBe('no-instrument');
  });

  it('⭐ a barren survey is a real answer, and names WHY', async () => {
    const who = prospector();
    // Well past the 300 m strike extent — the trace does not reach here.
    const ctx = await run(StrikeReading, 'strike', who, outcropAt(60, 60), 'measure strike');
    expect(rejected(ctx)).toBeNull();
    expect(ctx.getNotes().some((n) => n.kind === 'empty-result')).toBe(true);
    // …and nothing was written down, because nothing was read.
    expect(bookOf(who)).toHaveLength(0);
  });

  it('⭐⭐ competence changes the READING, never the world — asserted by identity', async () => {
    // The same point, the same seed, two different eyes.
    const novice = prospector();
    const expert = prospector();
    band = 'novice';
    await run(StrikeReading, 'strike', novice, outcropAt(1, 1), 'measure strike');
    band = 'expert';
    await run(StrikeReading, 'strike', expert, outcropAt(2, 2), 'measure strike');

    // The IDENTITY, straight off the deposit: the underlying figure both
    // of them are reading is one figure, and the band only sets the bar.
    const truth = deposit.surfaceReadingAt(10, 10, 15, Deposit.seedFor(''))!;
    const sameTruth = deposit.surfaceReadingAt(10, 10, 2, Deposit.seedFor(''))!;
    expect(sameTruth.strikeDeg).toBe(truth.strikeDeg);
    expect(sameTruth.distanceM).toBe(truth.distanceM);
    expect(sameTruth.errorDeg).toBeLessThan(truth.errorDeg);
  });

  // ───────────────── measure dip ─────────────────

  it('⚠ dip is UNOBTAINABLE from the surface, and obtainable on a vein underground', async () => {
    const who = prospector();
    // ⚠ The lode OUTCROPS here — it is in the plane at ground level —
    // and dip is still unreadable, because what you have is a stain seen
    // from above and not a face cut across the vein.
    expect(deposit.isInLode([0, 0, 0])).toBe(true);
    const above = await run(DipReading, 'dip', who, outcropAt(0, 0), 'measure dip');
    expect(above.getNotes().some((n) => n.kind === 'empty-result')).toBe(true);
    expect(bookOf(who)).toHaveLength(0);

    // Underground, in the lode: the plane runs through (0,0,-10) m, so
    // cell (0,0,-1) is on it.
    const below = await run(DipReading, 'dip', who, workingAt(0, 0, -1), 'measure dip');
    expect(rejected(below)).toBeNull();
    expect(bookOf(who).some((b) => b.referent.endsWith('#dip'))).toBe(true);
  });

  // ───────────────── analyze ground ─────────────────

  it('⭐ three surface readings narrow strike further than one does', async () => {
    const opened: CardPayload[] = [];
    vi.spyOn(CardApi, 'open').mockImplementation(((_c: unknown, _id: unknown, opts: { payload?: CardPayload }) => {
      if (opts.payload) opened.push(opts.payload);
      return 'card';
    }) as never);

    const who = prospector();
    await run(StrikeReading, 'strike', who, outcropAt(0, 0), 'measure strike');
    await run(GroundReading, 'ground', who, outcropAt(0, 0), 'analyze ground');
    const afterOne = opened.at(-1)!;

    await run(StrikeReading, 'strike', who, outcropAt(3, 3), 'measure strike');
    await run(StrikeReading, 'strike', who, outcropAt(-3, -3), 'measure strike');
    await run(GroundReading, 'ground', who, outcropAt(0, 0), 'analyze ground');
    const afterThree = opened.at(-1)!;

    expect(afterOne.kind).toBe('survey');
    expect(afterThree.kind).toBe('survey');
    if (afterOne.kind !== 'survey' || afterThree.kind !== 'survey') throw new Error('unreachable');

    // One reading does not solve; three do — and the residual is the
    // arithmetic, not a rule.
    expect(afterOne.survey.solved).toHaveLength(0);
    expect(afterOne.survey.note).toMatch(/more/);
    const strike = afterThree.survey.solved.find((s) => s.parameter === 'strike')!;
    expect(strike).toBeDefined();
    expect(strike.from).toBe(3);
    expect(strike.value).toMatch(/±\s*4\.6°/);
    expect(afterThree.survey.points).toHaveLength(3);
  });

  it('⭐ under an untrained eye three points do not solve at all — and the card SAYS so', async () => {
    const opened: CardPayload[] = [];
    vi.spyOn(CardApi, 'open').mockImplementation(((_c: unknown, _id: unknown, opts: { payload?: CardPayload }) => {
      if (opts.payload) opened.push(opts.payload);
      return 'card';
    }) as never);
    band = 'untrained';
    const who = prospector();
    for (const [x, y] of [[0, 0], [3, 3], [-3, -3]] as const) {
      await run(StrikeReading, 'strike', who, outcropAt(x, y), 'measure strike');
    }
    await run(GroundReading, 'ground', who, outcropAt(0, 0), 'analyze ground');
    const frame = opened.at(-1)!;
    if (frame.kind !== 'survey') throw new Error('unreachable');
    // Every reading is written down…
    expect(frame.survey.points).toHaveLength(3);
    // …and none of it adds up, which the card states rather than leaving blank.
    expect(frame.survey.solved).toHaveLength(0);
    expect(frame.survey.note).toMatch(/green rocks/);
  });

  it('⭐⭐ two characters on one outcrop hold DIFFERENT books', async () => {
    const a = prospector();
    const b = prospector();
    await run(StrikeReading, 'strike', a, outcropAt(0, 0), 'measure strike');
    expect(bookOf(a)).toHaveLength(1);
    expect(bookOf(b)).toHaveLength(0);
    // …and a survey record is therefore a thing one of them HAS.
    await run(StrikeReading, 'strike', b, outcropAt(5, 5), 'measure strike');
    expect(bookOf(a)[0]!.referent).not.toBe(bookOf(b)[0]!.referent);
  });

  it('with nothing measured, the card is honest rather than empty', async () => {
    const opened: CardPayload[] = [];
    vi.spyOn(CardApi, 'open').mockImplementation(((_c: unknown, _id: unknown, opts: { payload?: CardPayload }) => {
      if (opts.payload) opened.push(opts.payload);
      return 'card';
    }) as never);
    await run(GroundReading, 'ground', prospector(), outcropAt(0, 0), 'analyze ground');
    const frame = opened.at(-1)!;
    if (frame.kind !== 'survey') throw new Error('unreachable');
    expect(frame.survey.points).toHaveLength(0);
    expect(frame.survey.note).toMatch(/measured nothing/);
  });

  // ────────── ⭐⭐ the platform names NOTHING of this pack's ──────────

  it('⭐⭐ no platform view mentions a mining channel — install the pack, get the channel', () => {
    // ⚠⚠ **This assertion is inverted, and the inversion IS the build.**
    //
    // It used to check that each platform stanza named a controller in
    // this pack and that the pack shipped the row. That was the
    // mitigation for a defect rather than a property worth having: a
    // stanza in the kernel's own view meant `measure strike` was
    // advertised in an install with no mining pack and died on dispatch
    // with `controller-error`, and it meant this trade could not add a
    // channel without editing a platform file.
    //
    // A channel is a ROW now. The platform ships one flat view per verb
    // and resolves the channel token against whatever is installed, so
    // the honest test is that the platform does not know this trade
    // exists.
    const PLATFORM = fileURLToPath(
      new URL('../../../../../../platform/content/platform/cmd/perception/', import.meta.url),
    );
    for (const file of ['measure.yaml', 'analyze.yaml']) {
      const raw = readFileSync(`${PLATFORM}${file}`, 'utf8');
      const def = CommandDefinition.fromYaml(raw, file);
      // One flat view, one controller, no per-channel map at all.
      expect(def.controllerForSubcommand('strike')).toBe(
        `/platform/idea/cmd/perception/${file === 'measure.yaml' ? 'Measure' : 'Analyze'}Controller`,
      );
      expect(YAML.parse(raw)).not.toHaveProperty('subcommands');
      // Not in the help either — an install with no mine must not be
      // told about a reading it cannot take.
      expect(raw).not.toMatch(/\/trade\/mining\//);
    }
  });

  it('⭐ the channel rows and their classes are both this pack\'s, and they agree', () => {
    const PACK = fileURLToPath(new URL('../../../../../', import.meta.url));
    for (const channel of ['strike', 'dip', 'ground']) {
      const file = `${PACK}content/trade/mining/idea/reading/${channel}.yaml`;
      expect(existsSync(file), `${channel}.yaml missing`).toBe(true);
      const row = YAML.parse(readFileSync(file, 'utf8')) as {
        class: string;
        data: { channel: string };
      };
      // The row's own token is what a player types, and the class path
      // resolves into THIS pack's `src/` by longest prefix.
      expect(row.data.channel).toBe(channel);
      expect(row.class).toMatch(/^\/trade\/mining\/idea\/reading\//);
      const cls = row.class.replace('/trade/mining/', '');
      expect(existsSync(`${PACK}src/${cls.replace('idea/reading/', 'idea/reading/')}.ts`)).toBe(true);
    }
  });

  it('the analyze view declares the survey card at VERB level — recorded, not a leak', () => {
    const PLATFORM = fileURLToPath(
      new URL('../../../../../../platform/content/platform/cmd/perception/analyze.yaml', import.meta.url),
    );
    const raw = YAML.parse(readFileSync(PLATFORM, 'utf8')) as { opens_card?: string };
    // ⚠ `opens_card` is verb-level in the schema, so this licenses every
    // analyze subcommand to open `survey` and only `ground` ever will.
    expect(raw.opens_card).toBe('survey');
  });

  it('⭐ the instrument contributes NO verb — it declares a capability', () => {
    // ⚠⚠ This assertion is inverted deliberately. The instrument used to
    // contribute the whole `measure` view, which meant the VERB vanished
    // when you were not holding one — and a vanished verb can only
    // answer *unknown command*, which cannot say what is missing. The
    // verb is the Avatar's now and the gate is the CHANNEL's, so
    // `measure strike` with empty hands says *"it wants a surveyor's
    // compass or a miner's dial"*. Same rule retire-conferral reached
    // from the advancement side.
    expect(SurveyInstrument.commandContributions.environment ?? []).not.toContain(
      'platform/cmd/perception/measure.yaml',
    );
    const kit = makeStuff(() => new SurveyInstrument());
    expect(kit.hasCapability('surveying')).toBe(true);
  });
});
