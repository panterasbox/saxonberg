/**
 * Rope — ⭐⭐ **one rope; its use is where its ends are tied** (cordage D1).
 *
 * A lifeline is a rope a tender holds with a diver on the end; a heaving
 * line is a rope thrown to a swimmer; a painter is a rope on a boat's bow;
 * a rope tied round a post at the lip of a pit is a way down. There is one
 * class and one row shape — what it is FOR is where its two ends are:
 *
 *  - the FIXED end, in somebody's hands or tied round a fixture here;
 *  - the FREE end (`RopeEnd`, minted when it is made fast), in somebody's
 *    hands, tied to a load, or hanging down a drop.
 *
 * Everything a line does (`throw … to`, `tug`, `pull`) it inherits from
 * `Line`. What a rope adds is the tie: `tie rope to <person>` makes them
 * fast to the free end; `tie rope to <post>` makes the fixed end fast to
 * the post, and the rope stays where it was tied.
 *
 * ⭐ A hose is not a rope (the owner: *a rope and a hose are different
 * things; if they share a superclass that's fine*): the diving pack's
 * `Hose` is the other `Line`.
 */

import Line from '../../lib/spatial/Line';
import { TieableMixin, type TieOutcome } from '../../lib/spatial/Tieable';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Container } from '../../lib/spatial/Container';
import type { FieldMeta } from '../../lib/mixin';
import type { CommandContributions } from '../../api/command';
import { MixinApi } from '../../api/mixin';
import { ContainmentApi } from '../../api/containment';
import { GrammarApi } from '../../api/grammar';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';

/** What whoever holds a rope, or stands by one, can do with it. */
const HELD = [
  'platform/cmd/inventory/pull.yaml',
  'platform/cmd/inventory/tie.yaml',
  'platform/cmd/inventory/untie.yaml',
];

export default class Rope extends TieableMixin(Line) {
  static commandContributions: CommandContributions = {
    self: [],
    environment: HELD,
    peers: HELD,
  };

  static fieldMeta: FieldMeta = {
    diameterMm: { persistent: true, authorable: true },
    anchorPath: { persistent: true, runtimeState: true },
  };

  static override END_ROW = '/platform/thing/rope-end';

  /** How thick it is, mm — what its strength goes as the square of. */
  public diameterMm = 12;

  /**
   * The fixture its fixed end is tied round, by template path — the post
   * at the lip, the ring on the quay — so a restart finds it again.
   */
  public anchorPath: string | null = null;

  /** The fixture itself (runtime; found again from `anchorPath`). */
  private _anchor: Stuff | null = null;

  public getDiameterMm(): number {
    return this.diameterMm;
  }

  /** The fixture the fixed end is tied round, here, or null. */
  public getAnchor(): Stuff | null {
    const here = this.getContainer() as Stuff | null;
    const held = this._anchor;
    if (held !== null && !held.isDestroyed() && MixinApi.isContainable(held) && held.getContainer() === here) {
      return held;
    }
    this._anchor = null;
    if (this.anchorPath === null || here === null || !MixinApi.isContainer(here)) return null;
    const found = here.getContents().find((c) => c !== (this as unknown as Stuff) && c.getTemplatePath() === this.anchorPath);
    if (found === undefined) return null;
    this._anchor = found;
    return found;
  }

  /** ⭐ A rope tied round a post stays where it was tied. */
  public override isFixedInPlace(): boolean {
    return super.isFixedInPlace() || this.getAnchor() !== null;
  }

  /**
   * ⭐ `tie rope to <person>` — their hands on the free end (a diver going
   * down, a climber going up); `tie rope to <fixture>` — the fixed end
   * round a post here, and the rope stays.
   */
  public override async tieTo(by: Stuff, load: Stuff, knot: string | null): Promise<TieOutcome> {
    void knot;
    const self = this as unknown as Stuff;
    if (load === self) return { ok: false, reason: 'self', line: 'You cannot tie a rope to itself.' };
    const place = MixinApi.isContainable(by) ? by.getContainer() : null;
    const there = MixinApi.isContainable(load) ? load.getContainer() : null;
    if (place === null || there !== place) {
      return { ok: false, reason: 'out-of-reach', line: `${GrammarApi.cap(load.describeFor(by))} is not here.` };
    }
    if (load.isAgent?.()) {
      if (this.getHolder() !== by) {
        return { ok: false, reason: 'not-holding', line: `You are not holding ${this.getPresentation()}.` };
      }
      if (load === by) return { ok: false, reason: 'self', line: 'You keep hold of your own end; somebody else ties you on.' };
      await this.makeFast(load);
      try {
        MessageApi.scene(load)
          .topic('act.deed')
          .toSelf(Mml.compose`${Mml.actor(by)} ties the end of a rope round you.`)
          .send();
      } catch {
        // decoration
      }
      return {
        ok: true,
        line: `You tie the end of ${this.getPresentation()} round ${load.describeFor(by)}.`,
        peers: 'ties the end of a rope round somebody.',
      };
    }
    if (this.getHolder() !== by) {
      return { ok: false, reason: 'not-holding', line: `You are not holding ${this.getPresentation()}.` };
    }
    const already = this.getAnchor();
    if (already !== null) {
      return { ok: false, reason: 'already-tied', line: `It is already tied round ${already.getPresentation()}.` };
    }
    ContainmentApi.move(self as Stuff & Line, place as Stuff & Container);
    this._anchor = load;
    this.anchorPath = load.getTemplatePath();
    return {
      ok: true,
      line: `You tie ${this.getPresentation()} round ${load.getPresentation()}.`,
      peers: `ties a rope round ${load.getPresentation()}.`,
    };
  }

  /**
   * `untie rope` — the fixed end off its post, into your hands; or, held,
   * the free end off whoever is on it.
   */
  public override async untieBy(by: Stuff): Promise<TieOutcome> {
    const anchor = this.getAnchor();
    if (anchor !== null) {
      if (!MixinApi.isContainer(by)) return { ok: false, reason: 'no-hands', line: 'You have no hands to take it in.' };
      this._anchor = null;
      this.anchorPath = null;
      ContainmentApi.move(this as unknown as Stuff & Line, by as Stuff & Container);
      return { ok: true, line: `You untie ${this.getPresentation()} from ${anchor.getPresentation()} and take it up.` };
    }
    const onEnd = this.getOnEnd();
    if (onEnd !== null && (this.getHolder() === by || onEnd === by)) {
      await this.castOff();
      return { ok: true, line: `You cast off the end of ${this.getPresentation()}.` };
    }
    return { ok: false, reason: 'not-tied', line: `${GrammarApi.cap(this.getPresentation())} is not tied to anything.` };
  }
}
