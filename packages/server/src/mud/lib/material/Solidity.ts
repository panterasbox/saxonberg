/**
 * SolidityMixin — *it has a mechanical RESPONSE.*
 *
 * Hardness, toughness, elasticity, how cleanly it rives, how much it grows
 * per kelvin, and what a broken piece of it becomes. Never on a liquid kind.
 *
 * A capability of a material, named for the substance's physics, never for
 * a process that reads it (material-decomposition D1). A consumer narrows
 * with `MixinApi.hasSolidity(m)` and never on a material's kind.
 */

import { Quantity } from '../quantity';
import { QuantityMarshaller } from '../../platform/idea/persistence/QuantityMarshaller';
import type { FieldMeta, MixinConstructor } from '../mixin';
import { MixinApi } from '../../api/mixin';
import type { Stuff } from '../stuff/Stuff';

export interface Solidity {
  getCleavability(): number;
  getHardness(): Quantity<'MPa'>;
  setHardness(value: Quantity<'MPa'>): void;
  getToughness(): Quantity<'MJ/m³'>;
  setToughness(value: Quantity<'MJ/m³'>): void;
  getElasticity(): Quantity<'%'>;
  setElasticity(value: Quantity<'%'>): void;
  getThermalExpansion(): number;
  setThermalExpansion(value: number): void;
  getBrokenTemplate(): string;
  setBrokenTemplate(value: string): void;
}

export function SolidityMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class SolidityMixin extends Base implements Solidity {
    static _mixinName = 'SolidityMixin';

    static fieldMeta: FieldMeta = {
      hardness: { persistent: true, spoiler: 1, spoilerName: 0, marshaller: QuantityMarshaller.pathFor('MPa') },
      // ⭐ Riving (plan D17): how cleanly it opens along its grain.
      cleavability: { persistent: true },
      toughness: { persistent: true, spoiler: 1, spoilerName: 0, marshaller: QuantityMarshaller.pathFor('MJ/m³') },
      elasticity: { persistent: true, marshaller: QuantityMarshaller.pathFor('%') },
      // ── Faces and coats (ceramics M6–M8) ──
      // ⭐ How much it grows per kelvin — a glaze that shrinks more than its
      // body on cooling crazes; a body that grows too much cracks in a fire.
      thermalExpansion: { persistent: true, authorable: true, spoiler: 1, spoilerName: 0 },
      // ⭐ What a broken piece of this becomes (ceramics M5) — fired clay
      // breaks to sherds; glass keeps its cullet (the cast template).
      brokenTemplate: { persistent: true, authorable: true },
    };
    /**
     * 0..1 — how cleanly it opens along its grain under a froe or a wedge.
     * Not toughness and not density: it is how STRAIGHT the fibres run (oak,
     * ash, a conifer: high) and whether they interlock (elm: almost none). 0
     * for anything never riven — every material but wood.
     */
    public cleavability = 0;

    private _hardness: Quantity<'MPa'> = Quantity.of(0, 'MPa');

    protected get hardness(): Quantity<'MPa'> {
      return this._hardness;
    }
    protected set hardness(value: Quantity<'MPa'>) {
      if (!(value instanceof Quantity) || value.unit !== 'MPa') {
        throw new TypeError(
          `Material.hardness must be a Quantity<'MPa'>; got ${value instanceof Quantity ? `Quantity<'${value.unit}'>` : typeof value}`
        );
      }
      this._hardness = value;
    }

    /**
     * Toughness as a `Quantity<'MJ/m³'>` — energy absorbed per unit volume
     * before fracture (a spread `blunt` load, and the resistance to a point
     * punching through). Real material property, Quantity-typed and strict on
     * unit. The *height* a material lends the response curve for the `blunt`
     * channel and for penetration resistance; read by `MaterialApi`'s
     * response function. Zero-default until authored.
     */
    private _toughness: Quantity<'MJ/m³'> = Quantity.of(0, 'MJ/m³');

    protected get toughness(): Quantity<'MJ/m³'> {
      return this._toughness;
    }
    protected set toughness(value: Quantity<'MJ/m³'>) {
      if (!(value instanceof Quantity) || value.unit !== 'MJ/m³') {
        throw new TypeError(
          `Material.toughness must be a Quantity<'MJ/m³'>; got ${value instanceof Quantity ? `Quantity<'${value.unit}'>` : typeof value}`
        );
      }
      this._toughness = value;
    }

    // ⭐ Elasticity (rubber build): the strain it springs back from, %.
    // Rubber 500, leather 10, linen 3, glass 0.1; unauthored reads 0 —
    // rigid, which is today's answer everywhere.
    private _elasticity: Quantity<'%'> = Quantity.of(0, '%');
    protected get elasticity(): Quantity<'%'> {
      return this._elasticity;
    }
    protected set elasticity(value: Quantity<'%'>) {
      if (!(value instanceof Quantity) || value.unit !== '%') {
        throw new TypeError(
          `Material.elasticity must be a Quantity<'%'>; got ${value instanceof Quantity ? `Quantity<'${value.unit}'>` : typeof value}`
        );
      }
      this._elasticity = value;
    }
    /** 0..1 — how cleanly it opens along its grain; 0 = it will not rive. */
    public getCleavability(): number {
      return Math.max(0, Math.min(1, Number(this.cleavability) || 0));
    }

    public getHardness(): Quantity<'MPa'> {
      return this._hardness;
    }
    /** Set indentation hardness. Strict on `Quantity<'MPa'>`. */
    public setHardness(value: Quantity<'MPa'>): void {
      this.hardness = value;
    }

    /**
     * Read toughness. Strict on `Quantity<'MJ/m³'>`; the QuantityMarshaller
     * absorbed authoring-shape coercion at the persistence boundary.
     */
    public getToughness(): Quantity<'MJ/m³'> {
      return this._toughness;
    }
    /** Set toughness. Strict on `Quantity<'MJ/m³'>`. */
    public setToughness(value: Quantity<'MJ/m³'>): void {
      this.toughness = value;
    }

    /** Read elasticity — the strain it springs back from (`%`; `0` = rigid). */
    public getElasticity(): Quantity<'%'> {
      return this._elasticity;
    }
    /** Set elasticity. Strict on `Quantity<'%'>`. */
    public setElasticity(value: Quantity<'%'>): void {
      this.elasticity = value;
    }

    /** ⭐ Linear thermal expansion, 1/K (`0` = not authored). */
    protected thermalExpansion = 0;
    public getThermalExpansion(): number {
      return this.thermalExpansion;
    }
    public setThermalExpansion(value: number): void {
      this.thermalExpansion = Number.isFinite(value) && value > 0 ? value : 0;
    }

    /**
     * ⭐ What a piece of this breaks into (ceramics M5): a row path, else the
     * material's own cast template (glass breaks to its cullet lump) when
     * it melts at all; `''` when it neither authors one nor melts.
     */
    protected brokenTemplate = '';
    public getBrokenTemplate(): string {
      if (this.brokenTemplate) return this.brokenTemplate;
      const self = this as unknown as Stuff;
      return MixinApi.hasFusion(self) ? self.getCastTemplate() : '';
    }
    public setBrokenTemplate(value: string): void {
      this.brokenTemplate = typeof value === 'string' ? value.trim() : '';
    }
  };
}
