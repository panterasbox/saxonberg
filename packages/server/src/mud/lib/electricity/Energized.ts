/**
 * EnergizedMixin — the electrical **source** capability.
 *
 * Composing this mixin marks a Stuff as a node **held at a potential**: it
 * carries a `voltage` (`Quantity<'V'>`) that the conduction walk
 * (`ElectricityApi`) reads to impose a potential difference across the
 * conductive-contact graph. A downed live wire, a stun baton's contact, a
 * wall socket (the deferred grid), and the magic Lightning bolt (the
 * deferred Create·Lightning noun) all compose this same mixin — a source is
 * always "a thing that imposes a potential", never a bespoke special case.
 * That is the generalizable seam the requirement demands: the grid plugs in
 * additively because a fixture-held-at-potential is just another Energized
 * node in the same graph.
 *
 * A source can be gated live/dead by *also* composing `SwitchableMixin` — a
 * switched-off wire is dead. The walk reads that (an off Switchable source
 * imposes 0 V); this mixin stays pure potential.
 *
 * **The stun-baton seam — the instrument grammar's first consumer**: the
 * factory composes `CombatReactiveMixin`, so every Energized source is a
 * combat-reactive instrument. A wielded energized weapon's
 * `augmentInflict` queues `ctx.deliverShock(this)` and the combat engine
 * drains it through `ElectricityApi.shockContact` right after the
 * mechanical inflict — "*any* energized wielded weapon shocks", with no
 * engine branch (the old `commitInflict` special case is retired). A
 * non-instrument source (a `LiveWire`) carries the seam harmlessly — it
 * is never resolved as a strike's carrier, so its hooks never fire.
 *
 * Carrier shape mirrors the other Quantity-typed fields (Bulkable's
 * `surfaceAmount`, Material's `hardness`): a `private _voltage` behind a
 * strict accessor pair + the public `getVoltage`/`setVoltage` inter-Stuff
 * surface, marshalled by the `V` QuantityMarshaller so a seed authors
 * `voltage: 120` or `voltage: "50 kV"`.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import { Quantity } from '../quantity';
import { StuffApi } from '../../api/stuff';
// eslint-disable-next-line no-restricted-imports -- the D3 object face: Energized's conduct()/currentThrough()/shockContact() forward into the electricity logic singleton exactly as the api/electricity facade does (the mixin is the subsystem's instance face — antipatterns.md § A subject-first Api static)
import { ElectricityLogic } from '../../platform/idea/api/ElectricityLogic';

/** One body reached by a conduction event: who, and the current through it. */
export interface ConductionOutcome {
  /** The bridged body the current passed through. */
  victim: Stuff;
  /** The current that actually passed through this body (A). */
  currentThrough: Quantity<'A'>;
}
import { Final, Unshadowable } from '../security/decorators';
import { QuantityMarshaller } from '../../platform/idea/persistence/QuantityMarshaller';
import { CombatReactiveMixin } from '../combat/CombatReactive';
import type { CombatHookContext } from '../combat/CombatHookContext';
import type { InflictSpec } from '../../api/condition';

/** Public shape added by EnergizedMixin. The inter-Stuff contract. */
export interface Energized {
  /** The potential this source is held at (V). */
  getVoltage(): Quantity<'V'>;
  /** Set the potential this source is held at. Strict on `Quantity<'V'>`. */
  setVoltage(value: Quantity<'V'>): void;
  conduct(): ConductionOutcome[];
  currentThrough(victim: Stuff): Quantity<'A'>;
  shockContact(victim: Stuff): ConductionOutcome[];
}

/**
 * Resolve the electricity logic singleton (the Ohm's-law core + the
 * conduction walk stay THERE — one home for the physics; these mixin
 * methods are the OO face, admitted by the Logic's widened
 * source-participant gate).
 */
function electricityLogic(): ElectricityLogic {
  return StuffApi.singletonSync(
    '/platform/idea/api/electricity',
    () => new ElectricityLogic(),
  );
}

const VOLTAGE_MARSHALLER = QuantityMarshaller.pathFor('V');

export function EnergizedMixin<TBase extends MixinConstructor>(Base: TBase) {
  // The nested factory (combat-hooks DECISION H): every Energized source
  // is CombatReactive, so the `hasMixin` per-level `_mixinName` walk
  // narrows a composition as both.
  // Declared-then-returned (the Meltable shape) so method decorators
  // are legal — a class EXPRESSION cannot carry them.
  class EnergizedMixin
    extends CombatReactiveMixin(Base)
    implements Energized
  {
    static _mixinName = 'EnergizedMixin';

    static fieldMeta: FieldMeta = {
      voltage: { persistent: true, marshaller: VOLTAGE_MARSHALLER, authorable: true },
    };

    /**
     * The potential this source is held at. Zero-default until authored.
     */
    private _voltage: Quantity<'V'> = Quantity.of(0, 'V');

    protected get voltage(): Quantity<'V'> {
      return this._voltage;
    }
    protected set voltage(value: Quantity<'V'>) {
      if (!(value instanceof Quantity) || value.unit !== 'V') {
        throw new TypeError(
          `EnergizedMixin.voltage must be a Quantity<'V'>; got ${value instanceof Quantity ? `Quantity<'${value.unit}'>` : typeof value}`,
        );
      }
      this._voltage = value;
    }

    public getVoltage(): Quantity<'V'> {
      return this._voltage;
    }
    public setVoltage(value: Quantity<'V'>): void {
      this.voltage = value;
    }

    /**
     * The instrument seam: an energized wielded weapon ALSO delivers a
     * direct two-terminal shock on every blow. The delivery is
     * **queued**, never called — the engine drains it through
     * `this.shockContact(target)` immediately after the
     * mechanical inflict (the exact sequence position the retired
     * `commitInflict` branch held). No switch check here: the
     * `effectiveVoltage ≤ 0` guard inside the conduction walk already
     * no-ops a dead/switched-off source, unmoved.
     *
     * The **innate shock** (combat-hooks DECISION K) rides this same
     * override: an Energized *creature* with a `shock` natural attack
     * striking bare is its own augment carrier — the engine skips the
     * mechanical primary entirely and the queued `deliverShock` is the
     * whole delivery (single-fire by construction). The creature class
     * composes `EnergizedMixin` directly — `Species.innateMixins`
     * conferral is activation-gated, not composition, and is not relied
     * on for this narrowing.
     */
    augmentInflict(spec: InflictSpec, ctx: CombatHookContext): InflictSpec {
      ctx.deliverShock(this as unknown as Stuff & Energized);
      return super.augmentInflict(spec, ctx);
    }
    /**
     * The conduction **event** (was `ElectricityApi.conduct` — the OO
     * sweep): walk the conductive-contact graph of this source's
     * location, compute the current through every body bridged between
     * this potential and ground, and inflict each via
     * `ConditionApi.inflict({mechanism:'shock'})`. Faction-blind.
     * Sealed; ungated — the callers are physics drivers (LiveWire,
     * weather lightning, magic loci, FloodedCell) in a trusted
     * physical relationship.
     */
    @Final
    @Unshadowable
    public conduct(): ConductionOutcome[] {
      return electricityLogic().conduct(
        this as unknown as Stuff & Energized,
      );
    }

    /**
     * The probe — the current that would pass through `victim` from
     * this source right now, WITHOUT inflicting anything (the
     * multimeter / analyze / test seam). `0 A` when not bridged.
     */
    public currentThrough(victim: Stuff): Quantity<'A'> {
      return electricityLogic().currentThrough(
        this as unknown as Stuff & Energized,
        victim,
      );
    }

    /**
     * A **direct two-terminal contact shock** — a stun baton / taser:
     * `I = V / R_body` straight through the contact, no ground path
     * needed. The combat toe-hold. Sealed.
     */
    @Final
    @Unshadowable
    public shockContact(victim: Stuff): ConductionOutcome[] {
      return electricityLogic().shockContact(
        this as unknown as Stuff & Energized,
        victim,
      );
    }

  }
  return EnergizedMixin;
}
