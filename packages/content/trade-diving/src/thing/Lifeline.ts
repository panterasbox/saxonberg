/**
 * Lifeline — ⭐⭐ **the line between a diver and the air** (underwater C1).
 *
 * A length of rope with two ends. The FIXED end is whoever holds the line
 * — the tender on the quay, the line in their hands; the FREE end is the
 * person on it, made fast to a diver before they go down or heaved to
 * somebody in the water who needs it. Everything the trade does with a
 * line is one of three acts on this object:
 *
 *  - **`throw <line> to <person>`** (`heave`) — the holder throws the free end to
 *    somebody here or in the water beside here. A body in the water that
 *    has the line is held up by it while it is held (the throw that saves
 *    a drowning swimmer: *reach, throw, don't go*).
 *  - **`tug <line>`** — the person on the free end signals up it; the
 *    holder feels it. One tug, all is well; two, haul me up; three, give
 *    me more line. The signals are physical: they reach whoever holds the
 *    other end, whatever the medium, and nobody else.
 *  - **`pull line`** — the holder brings whoever is on the end up one
 *    band of the water, then up the quay steps, conscious or not — hand
 *    over hand, so the meters take time. Weight is what a pull pays,
 *    never a skill check.
 *
 * The hose of a hard-hat suit is the same object (`kind: hose`): its
 * free end feeds the helmet, and the same pull brings the diver up.
 *
 * ⚠ Who is on the line is RUNTIME — a live ref, dropped on a restart.
 * A line is made fast for a dive; it does not outlive the dive.
 */

import Tool from '@saxonberg/server/mud/platform/thing/Tool';
import { TossableMixin, type TossOutcome } from '@saxonberg/server/mud/lib/spatial/Tossable';
import { PullableMixin, type PullOutcome, type PullSense } from '@saxonberg/server/mud/lib/spatial/Pullable';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { GrammarApi } from '@saxonberg/server/mud/api/grammar';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { BiomeApi } from '@saxonberg/server/mud/api/biome';
import type LineEnd from './LineEnd';
import AirBag from './AirBag';

/** The free end's row — minted when the line is made fast. */
const LINE_END_ROW = '/trade/diving/thing/line-end';

/**
 * ⭐ What a line will bring up off the bottom, kg as it weighs in the
 * water — a hand-over-hand haul. Heavier needs air under it (`AirBag`);
 * a person on the end is always hauled (their own body all but floats).
 */
const HAUL_LIMIT_KG = 80;

/** A haul's effort per kg brought up one place, W over a short pull. */
const HAUL_W_PER_KG = 4;

/** How fast a line comes in hand over hand with nothing heavy on it, m per real second. */
const PULL_MPS = 0.6;

/** The quay steps at the top: getting a body up them and out, real seconds. */
const STEPS_S = 5;

/** Tugs this close together are one signal, game-seconds. */
const SIGNAL_WINDOW_S = 20;

/** What a line signal means, by its count of tugs. */
const SIGNALS: Readonly<Record<number, string>> = {
  1: 'one tug — all is well',
  2: 'two tugs — haul me up',
  3: 'three tugs — give me more line',
};

/** A line signal as the holder reads it. */
export interface LineSignal {
  tugs: number;
  atS: number;
}

/** What a line act did — the line's own words, or why not. */
export type LineOutcome = { ok: true; line: string } | { ok: false; reason: string; line: string };

export default class Lifeline extends PullableMixin(TossableMixin(Tool)) {
  static commandContributions: CommandContributions = {
    self: [],
    // Whoever holds it (`environment` — item → holder) throws and pulls
    // (`throw` is everyone's verb; the line answers it as `Tossable`);
    // the person on the free end tugs on the END they hold (`LineEnd`). A
    // line lying on the quay is `peers` to whoever stands there.
    environment: ['platform/cmd/inventory/pull.yaml'],
    peers: ['platform/cmd/inventory/pull.yaml'],
  };

  static fieldMeta: FieldMeta = {
    kind: { persistent: true, authorable: true },
    lengthM: { persistent: true, authorable: true },
  };

  /** A rope you hold, or the hose that feeds a helmet. */
  public kind: 'line' | 'hose' = 'line';

  /** How much line there is, m — how deep it reaches. */
  public lengthM = 20;

  /** The free end, in somebody's hands (runtime; minted when made fast). */
  private _end: LineEnd | null = null;

  /** The tugs the holder has felt, newest last (runtime). */
  private _tugs: number[] = [];

  public getKind(): 'line' | 'hose' {
    return this.kind;
  }

  public getLengthM(): number {
    return this.lengthM;
  }

  /** The person on the free end — whoever holds it — or null. */
  public getOnEnd(): Stuff | null {
    const end = this._end;
    if (end === null || end.isDestroyed()) {
      this._end = null;
      return null;
    }
    return end.getHolder();
  }

  /** Whoever holds the fixed end — a person carrying the line — or null. */
  public getHolder(): Stuff | null {
    const at = this.getContainer() as Stuff | null;
    return at !== null && at.isAgent?.() ? at : null;
  }

  /** Make a person fast to the free end: its end goes into their hands. */
  public async makeFast(who: Stuff): Promise<void> {
    await this.castOff();
    if (!MixinApi.isContainer(who)) return;
    const end = await StuffApi.clone<LineEnd>(LINE_END_ROW);
    end.attachTo(this);
    ContainmentApi.move(end, who);
    this._end = end;
    this._tugs = [];
  }

  /** Let go of the free end: whoever had it is off the line. */
  public async castOff(): Promise<void> {
    const who = this.getOnEnd();
    if (who !== null && MixinApi.isRespiration(who)) who.releaseHold();
    const end = this._end;
    this._end = null;
    this._tugs = [];
    if (end !== null && !end.isDestroyed()) StuffApi.destruct(end);
  }

  /**
   * ⭐ `throw <line> to <person>` (`heave`): the free end, to somebody
   * here or in the water one way from here — a thrown line crosses that
   * gap where a hand cannot.
   */
  public override async tossTo(thrower: Stuff, who: string): Promise<TossOutcome> {
    const target = this.personWithinReach(thrower, who.trim().toLowerCase());
    if (target === null) {
      return { ok: false, reason: 'no-such-person', line: `You see no ${who} to throw it to.` };
    }
    const out = await this.heaveTo(thrower, target);
    if (!out.ok) return { ok: false, reason: out.reason, line: out.line };
    return {
      ok: true,
      self: Mml.compose`${out.line}`,
      peers: Mml.compose`${Mml.actor(thrower)} throws the end of a line to ${Mml.actor(target)}.`,
    };
  }

  /* ─────────────────────────── heave ─────────────────────────── */

  /**
   * ⭐ Throw the free end to `target` — here, or in the water beside here
   * (the basin below the quay). A body in the water that has the line is
   * held up by it while somebody holds the other end.
   */
  public async heaveTo(by: Stuff, target: Stuff): Promise<LineOutcome> {
    if (this.getHolder() !== by) {
      return { ok: false, reason: 'not-holding', line: `You are not holding ${this.getPresentation()}.` };
    }
    if (target === by) return { ok: false, reason: 'self', line: 'You keep hold of your own end.' };
    if (!this.withinReach(by, target)) {
      return { ok: false, reason: 'out-of-reach', line: `You cannot reach ${target.describeFor(by)} with it from here.` };
    }
    await this.makeFast(target);
    const medium = MixinApi.isRespiration(target) ? target : null;
    if (medium !== null && MixinApi.isContainable(target)) {
      const place = target.getContainer();
      if (place !== null && MixinApi.isWaterPlace(place)) medium.holdUp();
    }
    try {
      MessageApi.scene(target)
        .topic('act.deed')
        .toSelf(Mml.compose`A line comes snaking out to you from ${Mml.actor(by)}, and you have hold of it.`)
        .send();
    } catch {
      // decoration
    }
    return { ok: true, line: `You heave the end of ${this.getPresentation()} to ${target.describeFor(by)}.` };
  }

  /**
   * ⭐ The person a holder means by `word`, within a throw of them: here,
   * or one obvious way from here (the water below the quay). The LINE
   * answers how far it reaches.
   */
  public personWithinReach(holder: Stuff, word: string): Stuff | null {
    if (word === '') return null;
    const here = MixinApi.isContainable(holder) ? holder.getContainer() : null;
    if (here === null) return null;
    const places: Stuff[] = [here];
    if (MixinApi.isExitable(here)) {
      for (const { dest } of here.getObviousNeighbours()) places.push(dest);
    }
    for (const place of places) {
      if (!MixinApi.isContainer(place)) continue;
      for (const who of place.getContents()) {
        if (who === holder || !who.isAgent?.()) continue;
        // ⭐ By what the HOLDER knows them as (found by the underwater
        // browser walk): a stranger is "a human", and the line went only to
        // a real name nobody had been told — then said it back.
        const words = who.perceivedKeywordsFor(holder).map((k) => k.toLowerCase());
        if (words.includes(word) || who.describeFor(holder).toLowerCase().includes(word)) return who;
      }
    }
    return null;
  }

  /** Here, or one obvious way from here (the water below the quay). */
  private withinReach(by: Stuff, target: Stuff): boolean {
    const here = MixinApi.isContainable(by) ? by.getContainer() : null;
    const there = MixinApi.isContainable(target) ? target.getContainer() : null;
    if (here === null || there === null) return false;
    if (here === there) return true;
    if (!MixinApi.isExitable(here)) return false;
    return here.getObviousNeighbours().some(({ dest }) => dest === there);
  }

  /* ─────────────────────────── tug ─────────────────────────── */

  /**
   * ⭐ A signal up the line, felt by whoever holds the other end. Tugs a
   * few seconds apart are one signal; the holder is told the count.
   */
  public tugBy(by: Stuff): LineOutcome {
    if (this.getOnEnd() !== by) {
      return { ok: false, reason: 'not-on-line', line: 'You are not on the end of that line.' };
    }
    const nowS = this.nowS();
    this._tugs = this._tugs.filter((t) => nowS - t <= SIGNAL_WINDOW_S);
    this._tugs.push(nowS);
    const count = Math.min(3, this._tugs.length);
    const holder = this.getHolder();
    if (holder !== null) {
      try {
        MessageApi.scene(holder)
          .topic('act.deed')
          .toSelf(Mml.compose`The line in your hands jerks: ${SIGNALS[count] ?? `${count} tugs`}.`)
          .send();
      } catch {
        // decoration
      }
    }
    return { ok: true, line: count === 1 ? 'You tug the line once.' : `You tug the line again — ${count} in a row.` };
  }

  /** The signal the holder last felt, if one is still fresh. */
  public lastSignal(): LineSignal | null {
    const nowS = this.nowS();
    const fresh = this._tugs.filter((t) => nowS - t <= SIGNAL_WINDOW_S);
    if (fresh.length === 0) return null;
    return { tugs: Math.min(3, fresh.length), atS: fresh[fresh.length - 1]! };
  }

  /* ─────────────────────────── haul (Pullable) ─────────────────────────── */

  /**
   * ⭐ Bring whoever is on the end up one band of the water — then out up
   * the steps, conscious or not. The way up is the water's own: the
   * band's `up`, the basin's way up to the quay.
   */
  public override async pullBy(puller: Stuff, sense: PullSense | null): Promise<PullOutcome> {
    if (sense === 'down') {
      return { ok: false, reason: 'pay-out', line: 'You pay out line; the weight on the end takes it down.' };
    }
    if (this.getHolder() !== puller) {
      return { ok: false, reason: 'not-holding', line: `You are not holding ${this.getPresentation()}.` };
    }
    const diver = this.getOnEnd();
    if (diver === null || !MixinApi.isContainable(diver)) {
      return { ok: false, reason: 'nobody-on-line', line: 'There is nobody on the end of the line.' };
    }
    const where = diver.getContainer();
    const here = MixinApi.isContainable(puller) ? puller.getContainer() : null;
    if (where === null || here === null) {
      return { ok: false, reason: 'nobody-on-line', line: 'The line goes nowhere.' };
    }
    if (where === here) {
      return { ok: false, reason: 'already-up', line: `${GrammarApi.cap(diver.describeFor(puller))} is already up beside you.` };
    }
    let next: (Stuff & Container) | null = null;
    // The water's own way up, from wherever they are…
    if (MixinApi.isExitable(where)) {
      const up = where.getExit('up');
      if (up) {
        try {
          next = await up.resolveDestination();
        } catch {
          next = null;
        }
      }
    }
    // …or straight to the puller, when they are one way away.
    if (next === null && MixinApi.isExitable(here) &&
        here.getObviousNeighbours().some(({ dest }) => dest === where)) {
      next = here as Stuff & Container;
    }
    if (next === null) {
      return { ok: false, reason: 'no-way-up', line: 'The line is fast on something; it will not come.' };
    }
    // ⭐ A load (not a person) pays its weight in the water, less what air lifts it.
    const isLoad = !diver.isAgent?.();
    let loadKg = 0;
    if (isLoad) {
      const inWater = MixinApi.isWaterPlace(where);
      const depthM = inWater ? Math.max(0, BiomeApi.mediumFor(diver).depthM) : 0;
      const lashed = inWater && MixinApi.isContainer(where)
        ? where.getContents().filter((c): c is AirBag => c instanceof AirBag && c.getLashedTo() === diver)
        : [];
      const kg = MixinApi.isTangible(diver) ? diver.getMass().rawValue() : 0;
      const netKg = Math.max(0, kg - lashed.reduce((sum, bag) => sum + bag.liftKg(depthM), 0));
      loadKg = netKg;
      if (inWater && netKg > HAUL_LIMIT_KG) {
        return {
          ok: false,
          reason: 'too-heavy',
          line: `You pull until your arms crack; ${diver.describeFor(puller)} will not come up off the bottom. It wants air under it.`,
        };
      }
      if (MixinApi.isExerting(puller)) puller.exert({ durationS: 30, powerW: Math.min(600, 80 + netKg * HAUL_W_PER_KG) });
    }
    // ⭐ The meters cost time (underwater review): hand over hand, slower
    // the more the load weighs in the water, and the steps at the top.
    const fromM = MixinApi.isWaterPlace(where) ? Math.max(0, BiomeApi.mediumFor(diver).depthM) : 0;
    const toM = next !== here && MixinApi.isWaterPlace(next) ? Math.max(0, next.mediumFor(diver).depthM) : 0;
    const speed = PULL_MPS * Math.max(0.3, 1 - loadKg / (2 * HAUL_LIMIT_KG));
    const realS = Math.max(0, fromM - toM) / speed + (next === here ? STEPS_S : 0);
    const to = next;
    return {
      ok: true,
      self: Mml.compose`You take the strain on ${Mml.thing(this as unknown as Stuff)} and pull, hand over hand.`,
      peers: Mml.compose`${Mml.actor(puller)} pulls on a line, hand over hand.`,
      takes: { realS, finish: () => this.landPull(puller, diver, where, to) },
    };
  }

  /**
   * The pull lands: whoever is on the end comes up into `next` — if the
   * line is still in the puller's hands and they are still where the pull
   * began. Anything else and the pull came to nothing.
   */
  private async landPull(
    puller: Stuff,
    diver: Stuff & Containable,
    where: Stuff & Container,
    next: Stuff & Container,
  ): Promise<PullOutcome> {
    if (this.getHolder() !== puller || this.getOnEnd() !== diver || diver.getContainer() !== where) {
      return { ok: false, reason: 'line-slipped', line: 'The line goes slack in your hands; whatever was on it is not where it was.' };
    }
    const here = MixinApi.isContainable(puller) ? puller.getContainer() : null;
    const isLoad = !diver.isAgent?.();
    if (MixinApi.isRespiration(diver)) diver.releaseHold();
    const bags = isLoad && MixinApi.isContainer(where)
      ? where.getContents().filter((c): c is AirBag => c instanceof AirBag && c.getLashedTo() === diver)
      : [];
    ContainmentApi.move(diver, next);
    for (const bag of bags) ContainmentApi.move(bag as never, next);
    this._end?.followLoad();
    const out = next === here;
    if (MixinApi.isRespiration(diver) && !out && MixinApi.isWaterPlace(next) &&
        next.surfacePlace() === (next as unknown as Stuff)) {
      diver.holdUp();
    }
    if (!isLoad) {
      try {
        MessageApi.scene(diver)
          .topic('act.deed')
          .toSelf(out
            ? Mml.compose`The line drags you up the steps and out of the water.`
            : Mml.compose`The line pulls you upward through the water.`)
          .send();
      } catch {
        // decoration
      }
    }
    if (out) await this.castOff();
    return {
      ok: true,
      self: out
        ? Mml.compose`You pull ${Mml.actor(diver)} up the steps and out of the water.`
        : Mml.compose`The weight on the end of ${Mml.thing(this as unknown as Stuff)} comes up a length — there is more line still in the water.`,
      peers: Mml.compose`${Mml.actor(puller)} brings a line in.`,
    };
  }

  private nowS(): number {
    try {
      return WorldClockApi.getNow().rawValue();
    } catch {
      return 0;
    }
  }
}
