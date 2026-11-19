/**
 * Phone — the aether tuner of the Signal rung: a screen you carry that
 * tunes whoever bears it ready (aether-devices D1, D4).
 *
 * A phone is an augment you do not seat: it confers the aether sense
 * (`AetherMixin`) on the body that bears it **in hand or ready** — a hand,
 * a pocket, a belt — and on nobody else. Packed in a rucksack, switched
 * off, or with nobody carrying it, it confers nothing, and says why
 * (`conferralRefusal`), so the person's comms can name the fix. The
 * conferral substrate finds it on its own: a phone is an aether host,
 * hosts hand `apps` outward to whoever bears them, and so it sits on its
 * bearer's recency stack — which is what the conferral leg reads.
 *
 * It runs on a **battery** (`BatteryMixin`, D5): it drains while a live
 * body bears it switched on, charges resting on a powered charger, and
 * when it is dead it confers nothing (`dead`).
 *
 * It is an **aether host** (`AetherHostMixin`): it runs apps — Messages
 * from day one, installed from its row — and what arrives through it is
 * READ off the screen (`manifestsAs: read`, D9). It switches (`switch
 * phone off`, `SwitchableMixin`), and it carries its maker's mark
 * (`BrandedMixin` — phone brands are corpos).
 *
 * ⭐ The tuning rule lives in this class body, not a mixin: one carried
 * tuner is one consumer. A second (the needle, the aether radio) is the
 * signal to lift it out.
 *
 * **The hot path.** `confers()` runs whenever a gated mixin is read on the
 * bearer — every modality-stamped frame. The answer is memoized for one
 * game second and dropped on the acts the phone itself sees (switching,
 * moving).
 */

import Good from '../../lib/stuff/Good';
import { AugmentMixin, type AugmentRefusal } from '../../lib/augmentation/Augment';
import { AetherHostMixin } from '../../lib/augmentation/AetherHost';
import { SwitchableMixin } from '../../lib/boundary/Switchable';
import { BrandedMixin } from '../../lib/corpo/Branded';
import { BatteryMixin } from '../../lib/supply/Battery';
import { ReservedMixin } from '../../lib/reserve/Reserved';
import { WieldableMixin } from '../../lib/slot/Wieldable';
import { MixinApi } from '../../api/mixin';
import { WorldClockApi } from '../../api/worldclock';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Container } from '../../lib/spatial/Container';
import type { MarkupAugmenter } from '../../api/mml';
import type { FieldMeta } from '../../lib/mixin';

// Wieldable: a hand takes a phone (a biped's hands accept `WieldableMixin`).
const PhoneBase = BatteryMixin(
  ReservedMixin(
    AetherHostMixin(
      SwitchableMixin(BrandedMixin(AugmentMixin(WieldableMixin(Good)))),
    ),
  ),
);

/** What a phone confers when nothing stops it. */
const CONFERS: readonly string[] = ['AetherMixin'];

export default class Phone extends PhoneBase {
  static markupAugmenters: MarkupAugmenter[] = [phoneLineAugmenter];

  /** `ownerLocked` is authored on the row — declared so it is applied. */
  static fieldMeta: FieldMeta = {
    ownerLocked: { persistent: true },
  };

  /**
   * Authored: this phone runs only for its title-holder (aether-devices
   * D10 — ownership is the lock). A phone with no title stamped runs for
   * whoever bears it (a circle cannot stamp a title; a gift is handed
   * over); a shop's stock is stamped to the house and runs for nobody
   * until it is bought.
   */
  ownerLocked = false;

  /** Memo of `conferralRefusal()`, for one game second. Runtime only. */
  private _refusalMemo: { at: number; refusal: AugmentRefusal | null } | null = null;

  override confers(): readonly string[] {
    return this.conferralRefusal() === null ? CONFERS : [];
  }

  override conferralRefusal(): AugmentRefusal | null {
    const at = Math.floor(WorldClockApi.getNow().value);
    if (this._refusalMemo !== null && this._refusalMemo.at === at) {
      return this._refusalMemo.refusal;
    }
    // ⭐ The battery settles here (D5): once a game second, for whoever
    // bears it. A live body that asks is the drawer; an offline body never
    // asks, so it draws nothing; a clock jump while online drains the jump.
    const bearer = this.getBearer();
    this.settleBattery(at, bearer !== null && this.isOn() ? bearer.stuffId : null);
    const refusal = this.decideRefusal(bearer, at);
    this._refusalMemo = { at, refusal };
    return refusal;
  }

  /** Spend one message's energy (sent or read through this phone). */
  spendMessage(): void {
    const at = Math.floor(WorldClockApi.getNow().value);
    const bearer = this.getBearer();
    this.spendUse(at, bearer !== null && this.isOn() ? bearer.stuffId : null);
    this._refusalMemo = null;
  }

  /** The body carrying this phone, at any depth, or `null`. */
  getBearer(): Stuff | null {
    let up: Stuff | null = this.getContainer();
    for (let i = 0; up !== null && i < 32; i++) {
      if (up.isAgent()) return MixinApi.isCarrying(up) ? up : null;
      up = MixinApi.isContainable(up) ? up.getContainer() : null;
    }
    return null;
  }

  override setOn(value: boolean): void {
    // Settle first: the draw up to now was at the old state.
    const at = Math.floor(WorldClockApi.getNow().value);
    const bearer = this.getBearer();
    this.settleBattery(at, bearer !== null && this.isOn() ? bearer.stuffId : null);
    super.setOn(value);
    this._refusalMemo = null;
  }

  public onMoved(
    from: (Stuff & Container) | null,
    to: (Stuff & Container) | null,
  ): void {
    const sup = (PhoneBase.prototype as {
      onMoved?: (f: (Stuff & Container) | null, t: (Stuff & Container) | null) => void;
    }).onMoved;
    if (typeof sup === 'function') sup.call(this, from, to);
    // Settle across where it WAS (a phone lifted off its charger keeps
    // what it took). One from nowhere (a restore) keeps its stamp, so a
    // phone restored onto a charger charges across the whole absence.
    if (from !== null) {
      this.settleBattery(Math.floor(WorldClockApi.getNow().value), null, from);
    }
    this._refusalMemo = null;
  }

  /** The tuning rule (D1). */
  private decideRefusal(bearer: Stuff | null, at: number): AugmentRefusal | null {
    if (bearer === null || !MixinApi.isCarrying(bearer)) return 'not-borne';
    if (!this.isOn()) return 'off';
    const tier = bearer.tierOf(this);
    if (tier !== 'hand' && tier !== 'ready') return 'packed';
    if (this.isDead(at)) return 'dead';
    if (this.ownerLocked && !this.runsFor(bearer)) return 'not-yours';
    return null;
  }

  /** Does the title on this phone let `bearer` run it? Unstamped: anyone. */
  private runsFor(bearer: Stuff): boolean {
    const owner = this.stampedOwner();
    if (owner === null) return true;
    if (owner.kind === 'group') return false;
    return owner.templatePath === bearer.getIdentityPath();
  }
}

/**
 * `look phone` (D13): on or off, the apps it runs, and whose it is to the
 * one looking — *bound to you*, *yours*, *not yours*. The brand line is
 * `BrandedMixin`'s; the charge is the battery's.
 */
function phoneLineAugmenter(
  text: string,
  host: Stuff,
  viewer: Stuff,
  opts?: { filter?: readonly string[] },
): string {
  if (opts?.filter && !opts.filter.includes('vision')) return text;
  if (!(host instanceof Phone) || host.isDestroyed()) return text;
  const lines: string[] = [];
  if (!host.isOn()) {
    lines.push('It is switched off — its screen is dark.');
  } else {
    const apps = host.getHostedApps().map((a) => a.getAppName());
    lines.push(apps.length > 0 ? `It runs ${apps.join(', ')}.` : 'It runs no apps.');
  }
  const owner = host.stampedOwner();
  if (owner !== null && owner.kind === 'player') {
    const mine = owner.templatePath === viewer.getIdentityPath();
    if (mine) lines.push(host.isTitleBound() ? 'It is bound to you.' : 'It is yours.');
    else if (host.ownerLocked) lines.push('It is not yours — it will not run for you.');
  }
  const line = lines.join(' ');
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}
