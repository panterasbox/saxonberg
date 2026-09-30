/**
 * The three invariants the whole reading ladder rests on.
 *
 *   1. ⭐⭐ **The bracket always contains the truth.** A coarse reading
 *      is VAGUE, never wrong. If this fails, an untrained reader is
 *      being lied to rather than hedged, and the honesty firewall is
 *      gone.
 *   2. ⭐⭐ **The effective band is a MINIMUM.** A novice with a
 *      masterful dial reads novice-wide; an expert with a poor dial is
 *      capped by the dial. Grade raises the ceiling; competence realizes
 *      it. Never a sum.
 *   3. ⭐ **A reading WEARS the instrument**, once per reading, on use
 *      and never on the clock.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Reading from '../Reading';
import { COMPETENCE_BANDS, CompetenceBand } from '../../advancement/CompetenceBand';
import type { CompetenceBandName } from '../../advancement/CompetenceBand';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';
import type { Stuff } from '../../stuff/Stuff';
import { SensorMixin } from '../../message/Sensor';
import { Idea } from '../../stuff/Idea';
import { AdvancementMixin } from '../../advancement/Advancement';
import type { Tooled } from '../../craft/Tooled';

const AdvancingIdea = AdvancementMixin(Idea);
import { CommandApi } from '../../../api/command';
import type { CommandContext } from '../../../api/command';
import { CommandDefinition } from '../../command/CommandDefinition';
import {
  driveMeasure,
  instrumentWith,
} from '../../../platform/idea/reading/__tests__/drive';

/** Somebody who can be spoken to — a refusal is prose before it is a note. */
class Listener extends SensorMixin(Idea) {
  public heard: unknown[] = [];
  protected override handleMessage(msg: unknown): void {
    this.heard.push(msg);
  }
}

/** A channel with nothing in it — the base's behaviour, exposed. */
class BareReading extends Reading {
  public bandFor(actor: Stuff): Promise<CompetenceBandName> {
    return this.bandOf(actor);
  }
  public ceilingFor(tool: Stuff): CompetenceBandName {
    return this.ceilingOf(tool);
  }
  public observeFor(
    truth: number,
    band: CompetenceBandName,
    seed: number,
  ): { centre: number; halfWidth: number } {
    return this.observe(truth, band, seed);
  }
  public lowerOf(a: CompetenceBandName, b: CompetenceBandName): CompetenceBandName {
    return this.lower(a, b);
  }
}

function bare(): BareReading {
  return makeStuff(() => new BareReading());
}

describe('Reading — the honest bracket', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('⭐⭐ contains the truth at every band, for every seed', () => {
    const r = bare();
    for (const band of COMPETENCE_BANDS) {
      for (let seed = 0; seed < 200; seed += 1) {
        for (const truth of [0.4, 7, 310, 101325, -12]) {
          const { centre, halfWidth } = r.observeFor(truth, band, seed);
          expect(
            truth >= centre - halfWidth - 1e-9 &&
              truth <= centre + halfWidth + 1e-9,
            `${band} seed ${seed} truth ${truth}: ${centre} ± ${halfWidth}`,
          ).toBe(true);
        }
      }
    }
  });

  it('⭐ a coarser band is a WIDER bracket, monotonically', () => {
    const r = bare();
    // COMPETENCE_BANDS is ascending (untrained → expert), so the
    // half-width must be non-increasing down it.
    let previous = Infinity;
    for (const band of COMPETENCE_BANDS) {
      const { halfWidth } = r.observeFor(310, band, 7);
      expect(halfWidth).toBeLessThanOrEqual(previous);
      previous = halfWidth;
    }
  });

  it('is SEEDED, not drawn — the same read twice agrees with itself', () => {
    const r = bare();
    const a = r.observeFor(310, 'novice', 42);
    const b = r.observeFor(310, 'novice', 42);
    expect(a).toEqual(b);
    expect(r.observeFor(310, 'novice', 43)).not.toEqual(a);
  });

  it('a zero figure has a zero bracket — nothing to be vague about', () => {
    expect(bare().observeFor(0, 'untrained', 1)).toEqual({
      centre: 0,
      halfWidth: 0,
    });
  });
});

describe('Reading — the band and the ceiling', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('an unbanded channel reads at full resolution', async () => {
    const r = bare();
    // `discipline: ''` is a PREVIEW or a rule read back, and a preview
    // that was bracketed would be a rule stated wrongly.
    expect(await r.bandFor(makeStuff(() => new Listener()) as unknown as Stuff)).toBe(
      'expert',
    );
  });

  it('a reader who cannot advance reads at the floor, not at nothing', async () => {
    const r = bare();
    r.discipline = 'geology';
    const rock = makeStuff(() => new Listener()) as unknown as Stuff;
    expect(await r.bandFor(rock)).toBe(CompetenceBand.FLOOR);
  });

  it('⭐⭐ the effective band is the MINIMUM, in both directions', () => {
    const r = bare();
    // A novice with a masterful dial is still a novice…
    expect(r.lowerOf('novice', 'expert')).toBe('novice');
    // …and an expert with a poor dial is capped by the dial.
    expect(r.lowerOf('expert', 'novice')).toBe('novice');
  });

  it('grade × condition decides the ceiling, and wear lowers it', async () => {
    const r = bare();
    const fine = await instrumentWith('x', { grade: 'masterful', condition: 1 });
    const shopBought = await instrumentWith('x', { grade: 'fair', condition: 1 });
    const worn = await instrumentWith('x', { grade: 'fair', condition: 0.3 });

    const fineBand = r.ceilingFor(fine);
    const shopBand = r.ceilingFor(shopBought);
    const wornBand = r.ceilingFor(worn);

    // ⭐ A shop-bought instrument caps a PROFICIENT reader — that is the
    // tool trade's whole story, and why a commission is worth paying for.
    expect(shopBand).toBe('proficient');
    expect(CompetenceBand.rank(fineBand)).toBeGreaterThanOrEqual(
      CompetenceBand.rank(shopBand),
    );
    expect(CompetenceBand.rank(wornBand)).toBeLessThan(
      CompetenceBand.rank(shopBand),
    );
  });

  it('an ungraded instrument is a plain honest dial', async () => {
    const r = bare();
    const plain = makeStuff(() => new BareReading()) as unknown as Stuff;
    expect(r.ceilingFor(plain)).toBe('proficient');
  });
});

/**
 * ⭐ The dispatch-level invariants: a reading WEARS its instrument, and a
 * worn-out one is refused BY NAME rather than silently not counting.
 *
 * These go through the verb — see `drive.ts` for why the rungs are gated
 * and why calling one directly is denied.
 */
class WeighingReading extends Reading {
  public reads = 0;
  protected override async measure(): Promise<void> {
    this.reads += 1;
  }
}

describe('Reading — wear on use', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  async function channel(): Promise<WeighingReading> {
    const r = await StuffApi.create(() => new WeighingReading());
    r.channel = 'weighing';
    r.instrument = 'weighing';
    r.instrumentNoun = 'a balance';
    r.scope = ['here'];
    return r;
  }

  function context(actor: Stuff): CommandContext {
    return CommandApi.createCommandContext({
      commandGiver: actor as never,
      interactive: {} as never,
      location: null as never,
      commandText: 'measure weighing',
      executionId: 't',
      commandId: 'c',
      verb: 'measure',
      command: CommandDefinition.fromYaml(
        'verbs: [measure]\ncontroller: NoopController\ndescription: stub\n',
        '<test>',
      ),
    });
  }

  it('⭐ wears the instrument exactly once per reading', async () => {
    const r = await channel();
    const tool = await instrumentWith('weighing');
    const before = (tool as unknown as { getCondition(): number }).getCondition();
    const actor = makeStuff(() => new Listener()) as unknown as Stuff;
    await driveMeasure(r, context(actor), { tools: [tool] });
    expect(r.reads).toBe(1);
    const after = (tool as unknown as { getCondition(): number }).getCondition();
    expect(after).toBeLessThan(before);
    // One reading's worth — not two, and not the clock's.
    expect(before - after).toBeCloseTo(0.002, 6);
  });

  it('⚠ a broken instrument is refused BY NAME, not silently skipped', async () => {
    const r = await channel();
    const tool = await instrumentWith('weighing', { condition: 0 });
    const actor = makeStuff(() => new Listener()) as unknown as Stuff;
    const ctx = context(actor);
    await driveMeasure(r, ctx, { tools: [tool] });
    expect(r.reads).toBe(0);
    const note = ctx
      .getNotes()
      .find((n) => n.kind === 'controller-rejected') as
      | { reason?: string }
      | undefined;
    // ⭐ `broken-instrument`, NOT `no-instrument`. "You have nothing that
    // could read that" while the thing is in your hand is a lie, and it
    // is the lie that sends a player shopping for a second one.
    expect(note?.reason).toBe('broken-instrument');
  });

  it('with nothing in reach, the refusal NAMES what would work', async () => {
    const r = await channel();
    const actor = makeStuff(() => new Listener()) as unknown as Stuff;
    const ctx = context(actor);
    await driveMeasure(r, ctx, { tools: [] });
    const note = ctx
      .getNotes()
      .find((n) => n.kind === 'controller-rejected') as
      | { reason?: string }
      | undefined;
    expect(note?.reason).toBe('no-instrument');
  });
});

/**
 * ⭐⭐⭐ **The three-reader test — the claim the whole build is making.**
 *
 * One fixture, three readers, one truth. The novice, the expert and the
 * instrumented expert all get an answer that CONTAINS the same figure,
 * and they differ only in how wide it is.
 *
 * > A better prospector does not get better rock. He knows where to
 * > point.
 */
class BandedReader extends SensorMixin(AdvancingIdea) {
  public band: CompetenceBandName = 'untrained';
  public heard: string[] = [];
  public override async competenceBandFor(): Promise<CompetenceBandName> {
    return this.band;
  }
  protected override handleMessage(msg: unknown): void {
    this.heard.push((msg as { body?: string }).body ?? '');
  }
}

/** The figure under test — one number, the same for everybody. */
const TRUTH = 310;

class FigureReading extends Reading {
  public seen: Array<{ centre: number; halfWidth: number }> = [];
  protected override async measure(
    context: CommandContext,
    _t: Stuff | null,
    _i: Stuff & Tooled,
    band: CompetenceBandName,
  ): Promise<void> {
    const actor = context.commandGiver as unknown as Stuff;
    this.seen.push(this.observe(TRUTH, band, this.seedFor(actor, null, '')));
  }
  public override async truth(): Promise<number> {
    return TRUTH;
  }
}

describe('⭐⭐⭐ competence resolves DETAIL, never access', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('three readers, one truth, three widths — and every one contains it', async () => {
    const reading = await StuffApi.create(() => new FigureReading());
    reading.channel = 'figure';
    reading.instrument = 'figuring';
    reading.instrumentNoun = 'a dial';
    reading.discipline = 'physics';
    reading.scope = ['here'];

    const widths: number[] = [];
    for (const band of ['novice', 'competent', 'expert'] as CompetenceBandName[]) {
      const reader = makeStuff(() => new BandedReader());
      reader.band = band;
      const ctx = CommandApi.createCommandContext({
        commandGiver: reader as never,
        interactive: {} as never,
        location: null as never,
        commandText: 'measure figure',
        executionId: 't',
        commandId: 'c',
        verb: 'measure',
        command: CommandDefinition.fromYaml(
          'verbs: [measure]\ncontroller: NoopController\ndescription: stub\n',
          '<test>',
        ),
      });
      await driveMeasure(reading, ctx, {
        tools: [await instrumentWith('figuring', { grade: 'masterful' })],
      });
      const last = reading.seen.at(-1)!;
      // ⭐ THE invariant: the truth is inside what every reader says.
      expect(last.centre - last.halfWidth).toBeLessThanOrEqual(TRUTH);
      expect(last.centre + last.halfWidth).toBeGreaterThanOrEqual(TRUTH);
      widths.push(last.halfWidth);
    }
    // …and the better reader's answer is strictly narrower, with the
    // SAME masterful instrument in hand. The dial raised the ceiling;
    // the reader is what realized it.
    expect(widths[0]!).toBeGreaterThan(widths[1]!);
    expect(widths[1]!).toBeGreaterThan(widths[2]!);
  });

  it('⚠ nobody is ever REFUSED for being untrained', async () => {
    const reading = await StuffApi.create(() => new FigureReading());
    reading.channel = 'figure';
    reading.instrument = 'figuring';
    reading.instrumentNoun = 'a dial';
    reading.discipline = 'physics';
    reading.scope = ['here'];
    const reader = makeStuff(() => new BandedReader());
    reader.band = 'untrained';
    const ctx = CommandApi.createCommandContext({
      commandGiver: reader as never,
      interactive: {} as never,
      location: null as never,
      commandText: 'measure figure',
      executionId: 't',
      commandId: 'c',
      verb: 'measure',
      command: CommandDefinition.fromYaml(
        'verbs: [measure]\ncontroller: NoopController\ndescription: stub\n',
        '<test>',
      ),
    });
    await driveMeasure(reading, ctx, { tools: [await instrumentWith('figuring')] });
    expect(reading.seen).toHaveLength(1);
    expect(
      ctx.getNotes().some((n) => n.kind === 'controller-rejected'),
    ).toBe(false);
  });
});
