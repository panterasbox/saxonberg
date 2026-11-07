/**
 * WaterHose — ⭐ **a hose that carries water from a tap** (water supply, the
 * review). Its use is where its two ends are coupled: `tie hose to tap`
 * screws one end onto an outlet, `tie hose to sprinkler` the other onto a
 * sprinkler, and the sprinkler throws what the tap's head drives through
 * it. Carried and coupled at the tap only, it is a hose in your hand you can
 * `water` a bed from.
 *
 * ⚠ Not a `Line` — the owner's cordage rule, *a rope and a hose are
 * different things*: a line's free end is in somebody's hands and it is
 * thrown, tugged and hauled; a garden hose is coupled at both ends and lies
 * there. It shares `tie` with rope through the one `Tieable` protocol, so
 * there is no second verb. Its couplings are runtime, as a line's end is: a
 * restart leaves it lying where it was, to be coupled again.
 */

import Good from '../../lib/stuff/Good';
import { TieableMixin, type TieOutcome } from '../../lib/spatial/Tieable';
import { MixinApi } from '../../api/mixin';
import { ContainmentApi } from '../../api/containment';
import type { FieldMeta } from '../../lib/mixin';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { MarkupAugmenter } from '../../api/mml';
import type { CommandContributions } from '../../api/command';
import WaterFixture from './WaterFixture';
import Sprinkler from './Sprinkler';

/** ⭐ What a look tells: what each end is coupled to. */
function hoseAugmenter(text: string, host: Stuff): string {
  if (!(host instanceof WaterHose)) return text;
  const outlet = host.getOutlet();
  const sprinkler = host.getSprinkler();
  const ends = [
    outlet !== null ? `one end is screwed onto ${outlet.getPresentation()}` : null,
    sprinkler !== null ? `the other onto ${sprinkler.getPresentation()}` : null,
  ].filter((s): s is string => s !== null);
  if (ends.length === 0) return text;
  const line = `${ends.join(', and ')}.`;
  const said = line.charAt(0).toUpperCase() + line.slice(1);
  return text && text.length > 0 ? `${text}\n\n${said}` : said;
}

const WaterHoseBase = TieableMixin(Good);

export default class WaterHose extends WaterHoseBase {
  static markupAugmenters: MarkupAugmenter[] = [hoseAugmenter];

  /**
   * ⭐ Carried, a hose couples (`tie`) and waters (`water`, like the can);
   * lying coupled, it is uncoupled where it lies (`untie`). An affordance is
   * a static on the class — a row cannot confer a verb.
   */
  static commandContributions: CommandContributions = {
    environment: ['platform/cmd/inventory/tie.yaml', 'platform/cmd/bulk/water.yaml'],
    peers: ['platform/cmd/inventory/untie.yaml'],
  };

  static fieldMeta: FieldMeta = {
    lengthM: { persistent: true, authorable: true },
  };

  /** How long it is, m. */
  public lengthM = 15;

  private _outlet: WaterFixture | null = null;
  private _sprinkler: Sprinkler | null = null;

  /** The tap it is coupled to, or `null`. */
  public getOutlet(): WaterFixture | null {
    if (this._outlet !== null && this._outlet.isDestroyed()) this._outlet = null;
    return this._outlet;
  }

  /** The sprinkler on its other end, or `null`. */
  public getSprinkler(): Sprinkler | null {
    if (this._sprinkler !== null && this._sprinkler.isDestroyed()) this._sprinkler = null;
    return this._sprinkler;
  }

  /**
   * ⭐ Couple an end: to a tap (an outlet with water under pressure behind
   * it) or to a sprinkler. Coupled at both ends, it is laid down where you
   * stand.
   */
  public override async tieTo(by: Stuff, load: Stuff, _knot: string | null): Promise<TieOutcome> {
    const what = load.getPresentation();
    if (load instanceof WaterFixture) {
      if (load.isNatural()) {
        return { ok: false, reason: 'no-pressure', line: `There is nothing to screw a hose onto at ${what}; water stands in it, it does not come out of a tap.` };
      }
      if (this.getOutlet() !== null) {
        return { ok: false, reason: 'end-taken', line: `The hose is already on ${this.getOutlet()!.getPresentation()}.` };
      }
      this._outlet = load;
      load.coupleHose(this, true);
      this.layDownIfCoupled(by);
      return { ok: true, line: `You screw the hose onto ${what}.`, peers: `screws a hose onto ${what}.` };
    }
    if (load instanceof Sprinkler) {
      if (this.getSprinkler() !== null) {
        return { ok: false, reason: 'end-taken', line: `The hose is already on ${this.getSprinkler()!.getPresentation()}.` };
      }
      const other = load.getHose();
      if (other !== null && other !== (this as unknown as WaterHose)) {
        return { ok: false, reason: 'sprinkler-taken', line: `${what} already has a hose on it.` };
      }
      this._sprinkler = load;
      load.setHose(this);
      this.layDownIfCoupled(by);
      return { ok: true, line: `You screw the hose onto ${what}.`, peers: `screws a hose onto ${what}.` };
    }
    return { ok: false, reason: 'not-a-coupling', line: `A hose screws onto a tap or a sprinkler, not ${what}.` };
  }

  /** Uncouple both ends; it stays where it lies. */
  public override async untieBy(_by: Stuff): Promise<TieOutcome> {
    if (this.getOutlet() === null && this.getSprinkler() === null) {
      return { ok: false, reason: 'not-tied', line: 'The hose is not coupled to anything.' };
    }
    this.getSprinkler()?.setHose(null);
    this.getOutlet()?.coupleHose(this, false);
    this._sprinkler = null;
    this._outlet = null;
    return { ok: true, line: 'You unscrew the hose at both ends.', peers: 'unscrews a hose.' };
  }

  /** Coupled at both ends and still in hand, the hose goes down where you stand. */
  private layDownIfCoupled(by: Stuff): void {
    if (this.getOutlet() === null || this.getSprinkler() === null) return;
    const self = this as unknown as Stuff;
    if (!MixinApi.isContainable(self) || self.getContainer() !== by) return;
    const room = MixinApi.isContainable(by) ? (by.getContainer() as Stuff | null) : null;
    if (room !== null && MixinApi.isContainer(room)) ContainmentApi.move(self, room);
  }
}
