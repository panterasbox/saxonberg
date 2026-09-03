/**
 * ManaMain — **the city's line**, and deliberately the least
 * interesting object in the pack.
 *
 * A fixed charged shell that refills to capacity unless somebody cut it
 * or closed it. ⭐ That is the honest minimum: *the mains is abundant by
 * construction*, and where the city's line mana comes from is explicitly
 * off-stage. Modelling a generation economy here would be inventing a
 * subsystem to answer a question nobody in the fiction is asking.
 *
 * Two authored booleans, and they are the two of the six supply words a
 * LINE can be in:
 *
 * - `severed` → **`cut`** — somebody broke it, and it stays broken.
 * - `closed` → **`off`** — somebody shut it, and somebody can open it.
 *
 * ⚠ **`ManaMain` names the RELATIONSHIP, not the object**, and no
 * electrical noun appears anywhere near it. The fiction has no
 * electricity; it has a city that runs a line, which is a different
 * thing that happens to rhyme.
 */

import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import { ReservedMixin } from '@saxonberg/server/mud/lib/reserve';
import { ChargedMixin } from '@saxonberg/server/mud/lib/magic/Charged';
import { DetailedMixin } from '@saxonberg/server/mud/lib/description/Detailed';
import { FixtureMixin } from '@saxonberg/server/mud/lib/stuff/Fixture';
import { SingletonMixin } from '@saxonberg/server/mud/lib/stuff/Singleton';
import { PostRegistrationMixin } from '@saxonberg/server/mud/lib/stuff/PostRegistration';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { SupplyState } from '@saxonberg/server/mud/lib/supply/SupplyState';

const ManaMainBase = SingletonMixin(
  PostRegistrationMixin(
    FixtureMixin(DetailedMixin(ChargedMixin(ReservedMixin(Thing)))),
  ),
);

export default class ManaMain extends ManaMainBase {
  static fieldMeta: FieldMeta = {
    severed: { persistent: true, authorable: true },
    closed: { persistent: true, authorable: true },
  };

  /** Physically broken. Nobody opens this again without a repair. */
  public severed: boolean = false;

  /** Deliberately shut. Somebody can open it. */
  public closed: boolean = false;

  constructor() {
    super();
    this.fixedInPlace = true;
  }

  public isSevered(): boolean {
    return this.severed;
  }
  public setSevered(v: boolean): void {
    this.severed = v === true;
  }
  public isClosed(): boolean {
    return this.closed;
  }
  public setClosed(v: boolean): void {
    this.closed = v === true;
  }

  /**
   * ⭐ **Abundant by construction.** A working line is full whenever
   * anybody looks; a cut or closed one gives nothing. Reconcile-on-read
   * with no clock, because there is nothing to integrate — this is not
   * a reservoir, it is a connection.
   */
  public override getStoredTau(): number {
    if (this.severed || this.closed) return 0;
    const cap = this.getCapacityTau();
    const held = super.getStoredTau();
    if (held < cap) this.receiveCharge(cap - held);
    return super.getStoredTau();
  }

  /** `cut` beats `off` — the precedence rule, and the honest one: a
   * severed line is not something opening a valve fixes. */
  public supplyState(): SupplyState | null {
    if (this.severed) return 'cut';
    if (this.closed) return 'off';
    return null;
  }

  public override async postRegister(_context?: unknown): Promise<void> {
    await this.seatSelf();
    this.installChargeReserve();
  }

  override getShortDescription(): string {
    return super.getShortDescription() || 'a mana line';
  }

  override getLongDescription(): string {
    const flavor =
      this.longDescription && this.longDescription.length > 0
        ? this.longDescription
        : 'A brass conduit runs up out of the floor and into the wall, ' +
          'humming faintly to itself.';
    const state = this.severed
      ? 'It has been cut through: the ends are dark and cold.'
      : this.closed
        ? 'Its stopcock is turned hard over. Nothing is coming through.'
        : 'It runs warm and steady — the city is feeding it.';
    return `${flavor}\n${state}`;
  }

  override getLong(): string {
    return this.getLongDescription();
  }
}
