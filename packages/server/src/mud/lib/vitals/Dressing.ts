/**
 * DressingMixin — the **dressing** first-aid capability: an item that can
 * dress a wound (a bandage / gauze / a clean rag). A dressing is not a
 * *kind* — it's a role an item plays, marked by this mixin so `treat`
 * gates on the capability (`MixinApi.isDressing`), NOT `instanceof Bandage`
 * (any dressing-capable item qualifies).
 *
 * The one carried attribute is **dressingQuality** — a 0..1 grade that
 * feeds the treatment outcome (a clean bandage clots better than a filthy
 * rag). The dressing is **single-use**: `treat` spends it via
 * `StuffApi.destruct` (no wear gauge, no repair). Composed on a `Thing`
 * (Tangible + Visible) — see `obj/Bandage.ts`, the canonical concrete one.
 *
 * This is the ONLY first-aid branch v1 ships. Durable **instruments**
 * (splint / suture — the fracture-setting path) will ride crafting's
 * `ToolMixin`; **medicines** (antiseptic / analgesic) the bulk /
 * metabolism substrate. Both are named-but-deferred seams — no sibling
 * mixins here. See docs/subsystems/harm.md.
 */

import type { MixinConstructor } from '../mixin';

export interface Dressing {
  /** Dressing quality, 0 (filthy) .. 1 (clean/sterile). Grades outcome. */
  getDressingQuality(): number;
  setDressingQuality(value: number): void;
}

/** Default quality when a template doesn't specify (a clean bandage). */
const DEFAULT_QUALITY = 1;

export function DressingMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class DressingMixin extends Base implements Dressing {
    static _mixinName = 'DressingMixin';

    static persistentFields = ['dressingQuality'];

    /** 0..1 quality gauge; default clean. */
    private _dressingQuality: number = DEFAULT_QUALITY;

    protected get dressingQuality(): number {
      return this._dressingQuality;
    }
    protected set dressingQuality(value: number) {
      // Per-field invariant on the accessor: clamp into 0..1.
      this._dressingQuality = Math.max(0, Math.min(1, value));
    }

    getDressingQuality(): number {
      return this._dressingQuality;
    }

    setDressingQuality(value: number): void {
      this.dressingQuality = value;
    }
  };
}
