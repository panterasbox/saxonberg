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
 * Carrier shape mirrors the other Quantity-typed fields (Bulkable's
 * `surfaceAmount`, Material's `hardness`): a `private _voltage` behind a
 * strict accessor pair + the public `getVoltage`/`setVoltage` inter-Stuff
 * surface, marshalled by the `V` QuantityMarshaller so a seed authors
 * `voltage: 120` or `voltage: "50 kV"`.
 */

import type { MixinConstructor } from '../mixin';
import { Quantity } from '../quantity';
import { QuantityMarshaller } from '../persistence/QuantityMarshaller';

/** Public shape added by EnergizedMixin. The inter-Stuff contract. */
export interface Energized {
  /** The potential this source is held at (V). */
  getVoltage(): Quantity<'V'>;
  /** Set the potential this source is held at. Strict on `Quantity<'V'>`. */
  setVoltage(value: Quantity<'V'>): void;
}

const VOLTAGE_MARSHALLER = QuantityMarshaller.pathFor('V');

export function EnergizedMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class EnergizedMixin extends Base implements Energized {
    static _mixinName = 'EnergizedMixin';

    static persistentFields = ['voltage'];

    static fieldMarshallers = {
      voltage: VOLTAGE_MARSHALLER,
    };

    /**
     * The potential this source is held at. Zero-default until authored.
     *
     * @authorable
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
  };
}
