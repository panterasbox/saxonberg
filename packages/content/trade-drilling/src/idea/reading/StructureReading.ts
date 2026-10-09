/**
 * StructureReading — `measure structure` and `analyze structure`.
 *
 * ⭐⭐⭐ **The readable half of a two-factor survey, and the design is as
 * much about what this channel REFUSES as about what it reports.**
 *
 * A trap is a shape in the rock: a fold with a crest, an axis, and a
 * closure under it that could hold something. That shape is a fact, and
 * an instrument reads it with a bracket that narrows with the instrument
 * and the band — ordinary instrumentation, the strike channel's sibling.
 *
 * ⚠⚠ **Whether the trap holds anything has no channel at all.** Not a
 * harder read, not a deeper band, not a better instrument: there is no
 * `charge` field in what the column returns to this file, no row for it,
 * and no refusal naming a route that would work — because there is no
 * route. The only way to learn it is to spend the payroll and get to the
 * depth. That is why a dry hole survives every improvement to the
 * instruments, and why the money a bore spends is a **bet** rather than
 * an expense.
 *
 * ⭐ **And the bracket widens with depth**, which is the one law this
 * build's design asked for. See `GroundChannel`'s `DEPTH_FRACTION`: what
 * a structural survey measures is a ratio, so deep ground is read worse
 * than shallow ground by the same hand on the same day. A deep bet is
 * therefore different in KIND from a shallow one, and an improving
 * prospector's first real gain is being able to chase deep ground at
 * all.
 *
 * The three rungs, the ladder's own:
 *
 * | | Verb | What it is |
 * |---|---|---|
 * | the free evidence | `look` | the spring, the seep — *something*, never *where* |
 * | the eye rung | `analyze structure` | what a trained eye makes of the country, and of its own notes |
 * | the instrument | `measure structure` | a crest, a bearing and a bracket |
 */

import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import type { CommandContext } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Tooled } from '@saxonberg/server/mud/lib/craft/Tooled';
import type { CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import type { StructureReading as Structure } from '@saxonberg/content-ground/src/idea/Deposit';
import type Deposit from '@saxonberg/content-ground/src/idea/Deposit';
import { GroundChannel, GEOLOGY, READING_TOPIC } from '../../lib/GroundChannel';

export default class StructureReading extends GroundChannel {
  /**
   * ⭐ The instrument rung: the crest, which way it lies, and how well
   * this reader can claim to know.
   */
  protected override async measure(
    context: CommandContext,
    _subject: Stuff | null,
    _instrument: Stuff & Tooled,
    _band: CompetenceBandName,
    _param: string,
  ): Promise<void> {
    const giver = this.actorOf(context);
    const place = this.placeOf(giver);
    if (!place) {
      this.decline(
        context,
        Mml.compose`You are nowhere to run a line of levels across.`,
        'no-place',
      );
      return;
    }
    const deposit = await this.ground.depositAt(place);
    if (!deposit) {
      this.decline(
        context,
        Mml.compose`Nobody has ever written down what is under this ground.`,
        'no-deposit',
      );
      return;
    }

    const { band, fraction } = await this.depthBandOf(giver);
    const structures = await this.ground.structuresAt(place, fraction);

    if (structures.length === 0) {
      // ⭐ The informative negative, and it costs the same walk as a hit
      // — which is what makes where to look a decision. ⚠ It says the
      // beds lie FLAT, which is a true statement about the structure and
      // tells the player something real: flat beds hold nothing, so walk.
      MessageApi.scene(giver)
        .topic(READING_TOPIC)
        .toSelf(
          Mml.compose`You run your levels and the beds come out flat — no rise, no closure, nothing under this ground that would hold anything that tried to move through it. Whatever the country has, it is not here.`,
        )
        .send();
      context.note({
        kind: 'empty-result',
        field: 'structure',
        query: 'structure',
      });
      if (MixinApi.isAdvancing(giver))
        await giver.creditDeed({
          discipline: GEOLOGY,
          difficulty: 'standard',
          outcome: 'partial',
        });
      return;
    }

    const at = this.ground.metresAt(place);
    const where = `${Math.round(at[0])},${Math.round(at[1])}`;
    const lines: string[] = [];
    for (const s of structures) {
      // ⚠ The field book records the READING, never the truth and never
      // the band — a prospector who improves re-reads their own old
      // notes at their new resolution, which is what happens to a field
      // book. The referent is per-body, so two structures under one
      // point are two notes.
      this.remember(
        giver,
        `${where}#${s.key}`,
        String(Math.round(s.readingDepthM)),
      );
      lines.push(describe(s));
    }

    MessageApi.scene(giver)
      .topic(READING_TOPIC)
      .toSelf(
        Mml.compose`${lines.join('\n')}\nBy your ${band} reckoning, and the deeper it lies the less you can swear to.`,
      )
      .send();

    // World-derived difficulty: deep structure is a harder read than
    // shallow, and the ground decides which this was.
    if (MixinApi.isAdvancing(giver))
      await giver.creditDeed({
        discipline: GEOLOGY,
        difficulty: deepest(structures) > 150 ? 'hard' : 'standard',
        outcome: 'success',
      });
  }

  /**
   * ⭐ The eye rung: what the country itself says, and what this reader
   * can make of their own notes.
   *
   * Two things, and they are the two halves of prospecting without an
   * instrument. The **free evidence** is whatever has come to the
   * surface here — a salt spring, an oil seep — and a trained eye can
   * say what it means: *that is charge reaching daylight, and it is the
   * one thing in this trade you get for nothing*. The **notes** are the
   * readings already taken, averaged if the band can average at all.
   *
   * ⚠⚠ **The free evidence tells you there is something in this
   * country. It never tells you where to bore**, because what has
   * leaked to the surface is by definition what the trap did not hold.
   * The eye rung says so in those words rather than hinting.
   */
  protected override async analyze(
    context: CommandContext,
    _subject: Stuff | null,
    _band: CompetenceBandName,
    _handTool: (Stuff & Tooled) | null,
    _param: string,
  ): Promise<void> {
    const giver = this.actorOf(context);
    const place = this.placeOf(giver);
    if (!place) {
      this.decline(
        context,
        Mml.compose`You are nowhere to read the country from.`,
        'no-place',
      );
      return;
    }
    const deposit = await this.ground.depositAt(place);
    if (!deposit) {
      this.decline(
        context,
        Mml.compose`Nobody has ever written down what is under this ground.`,
        'no-deposit',
      );
      return;
    }

    const { band, fraction, solveFrom } = await this.depthBandOf(giver);
    const lines: string[] = [];

    const sign = this.showingOf(place);
    if (sign !== null) {
      lines.push(
        this.solvesStructure(band)
          ? `${sign} — and that is the country telling you it holds something. It is also the one place you should not bore: what reaches daylight is what the ground failed to keep.`
          : `${sign}. You could not say what it means.`,
      );
    }

    const notes = this.notesAt(giver, deposit, place);
    if (notes.length === 0) {
      lines.push(
        'You have run no levels here yet. Nothing about this country is written in your book.',
      );
    } else if (!Number.isFinite(solveFrom)) {
      lines.push(
        `You have ${notes.length} figure${notes.length === 1 ? '' : 's'} written down and no way to make them add up. A ${band} eye has numbers, not a structure.`,
      );
    } else {
      for (const [key, values] of notes) {
        if (values.length < solveFrom) {
          const want = solveFrom - values.length;
          lines.push(
            `${key}: ${values.length} reading${values.length === 1 ? '' : 's'}. ${want} more from ${want === 1 ? 'another place' : 'other places'} and it will solve.`,
          );
          continue;
        }
        // ⭐ The arithmetic IS the reason several beat one: independent
        // observations of one depth average, and the residual narrows as
        // error / √n. A player who walks the structure is actually doing
        // the thing that makes the answer better.
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const residual = (mean * fraction) / Math.sqrt(values.length);
        lines.push(
          `${key}: crest about ${Math.round(mean)} m ± ${residual.toFixed(1)} m, from ${values.length} readings.`,
        );
      }
    }

    // ⚠⚠ Whatever else is said, this sentence is always the last one,
    // and it is the trade's premise in one line.
    lines.push(
      'What none of it tells you is whether there is anything in it. Nothing tells you that but the hole.',
    );

    MessageApi.scene(giver)
      .topic(READING_TOPIC)
      .toSelf(Mml.compose`${lines.join('\n')}`)
      .send();

    if (notes.length > 0 && this.solvesStructure(band)) {
      if (MixinApi.isAdvancing(giver))
        await giver.creditDeed({
          discipline: GEOLOGY,
          difficulty: 'hard',
          outcome: 'success',
        });
    }
  }

  /**
   * ⭐ The free evidence standing in this room, in its own words.
   *
   * ⚠ Read off the PROP rather than off this file: a salt spring and an
   * oil seep are venue content with their own prose, and a channel that
   * knew the word "spring" would be a trade file hardcoding one town's
   * geology. The prop declares itself by carrying the `showing` detail,
   * which is the same shape every other authored detail uses, so a
   * third kind of surface showing is a row.
   */
  private showingOf(place: Stuff & Container): string | null {
    const contents = MixinApi.isContainer(place)
      ? (place as unknown as { getContents(): Stuff[] }).getContents()
      : [];
    for (const item of contents) {
      const detailed = item as unknown as {
        getDetail?(key: string): string | null;
      };
      const showing = detailed.getDetail?.('showing') ?? null;
      if (showing) return showing;
    }
    return null;
  }

  /**
   * The readings this character holds about the structures under THIS
   * point, grouped by body.
   *
   * ⚠ Grouped by the body's key rather than by position, because what
   * averages is repeated observations **of one structure**. The referent
   * carries both, so the grouping is a string split rather than a
   * second record.
   */
  private notesAt(
    giver: Stuff,
    _deposit: Deposit,
    _place: Stuff & Container,
  ): Array<[string, number[]]> {
    const grouped = new Map<string, number[]>();
    for (const note of this.recallAll(giver)) {
      const hash = note.where.lastIndexOf('#');
      if (hash < 0) continue;
      const key = note.where.slice(hash + 1);
      const value = Number(note.reading);
      if (!Number.isFinite(value)) continue;
      const list = grouped.get(key) ?? [];
      list.push(value);
      grouped.set(key, list);
    }
    return [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }
}

/**
 * One structure, as a surveyor would write it down.
 *
 * ⭐⭐ **The second sentence is the one that costs money.** `closureM` is
 * what the trap could hold at its best and `thicknessHereM` is what it
 * could hold *under your feet*, and the gap between them is the whole
 * reason to walk to the crest before raising a derrick. A player who
 * reads *forty metres of closure, and three of it here* and bores anyway
 * has made a decision rather than suffered an outcome.
 *
 * ⚠ The thickness is given in words rather than as a figure, because it
 * is a derived consequence of two bracketed numbers and quoting it to
 * the metre would claim a precision the survey has not got.
 */
function describe(s: Structure): string {
  const depth = `${Math.round(s.readingDepthM)} m ± ${Math.round(s.errorM)} m`;
  const closure = s.closureM >= 25 ? 'a deep closure' : 'a shallow closure';
  const here = thickness(s);
  if (s.distanceM < 20) {
    return `The beds arch right under your feet — ${closure}, crest at about ${depth}, the axis running ${bearing(s.axisDeg)}. ${here}`;
  }
  return `The beds rise toward ${bearing(s.bearingDeg)}, ${Math.round(s.distanceM)} m off — ${closure}, crest at about ${depth}, the axis running ${bearing(s.axisDeg)}. ${here}`;
}

/** How much of the closure is under THIS ground, in words. */
function thickness(s: Structure): string {
  const share = s.closureM > 0 ? s.thicknessHereM / s.closureM : 0;
  if (share >= 0.85) {
    return 'You are as near the top of it as the ground gets.';
  }
  if (share >= 0.5) {
    return 'You are well up the flank of it, but not at the top.';
  }
  if (share >= 0.15) {
    return 'Down on the flank: most of the closure is somewhere else.';
  }
  return 'You are out on the edge of it, where the arch has almost nothing left under it.';
}

/** The deepest crest reported, for the difficulty read. */
function deepest(structures: readonly Structure[]): number {
  return structures.reduce((d, s) => Math.max(d, s.crestDepthM), 0);
}

/** Three-figure bearing, the way a compass is actually read. */
function bearing(deg: number): string {
  return String(Math.round(((deg % 360) + 360) % 360)).padStart(3, '0');
}
