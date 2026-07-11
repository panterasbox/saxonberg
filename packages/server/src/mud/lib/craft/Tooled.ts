/**
 * ToolMixin — a host that plays the **tool** role in a transformation: the
 * capital side of control (`control = f(skill, tools)`).
 *
 * A tool is not a kind — it's a role an object plays because a recipe asks
 * for it (see {@link ToolCapabilities}). The mixin adds two things:
 *
 * - **capabilities** — what the tool can *do* ("shaker"), so a recipe can
 *   require by capability and any present tool offering it satisfies the slot;
 * - **condition** — a 0..1 wear gauge that drops with **use, not the clock**
 *   (economy Law 2: you dull the knife by cutting, never by time on the wall).
 *   The first durable-good sink shape; opt-in repair is a later increment.
 *
 * Composed on a `Thing` (Tangible + Visible) — see `ToolItem.ts`.
 */

import type { MixinConstructor } from '../mixin';
import { ToolCapabilities } from './ToolCapability';

export interface Tooled {
  getCapabilities(): readonly string[];
  setCapabilities(value: string[]): void;
  hasCapability(cap: string): boolean;
  /** Wear gauge, 0 (worn out) .. 1 (pristine). */
  getCondition(): number;
  setCondition(value: number): void;
  /** Decrement condition by `amount` (clamped at 0). The wear-on-use seam. */
  wear(amount?: number): void;
}

/** Default per-use wear when a recipe doesn't specify. */
const WEAR_PER_USE = 0.01;

export function ToolMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class ToolMixin extends Base implements Tooled {
    static _mixinName = 'ToolMixin';

    static persistentFields = ['capabilities', 'condition'];

    /**
     * The capabilities this tool offers (validated against the vocabulary).
     *
     * @authorable
     */
    public capabilities: string[] = [];

    /**
     * 0..1 wear gauge; default pristine.
     *
     * @runtimeState
     */
    private _condition: number = 1;

    protected get condition(): number {
      return this._condition;
    }
    protected set condition(value: number) {
      // Per-field invariant on the accessor: clamp into 0..1.
      this._condition = Math.max(0, Math.min(1, value));
    }

    getCapabilities(): readonly string[] {
      return this.capabilities;
    }

    setCapabilities(value: string[]): void {
      if (!Array.isArray(value)) {
        throw new TypeError('ToolMixin.setCapabilities: expected string[]');
      }
      for (const cap of value) {
        if (!ToolCapabilities.isCapability(cap)) {
          throw new RangeError(
            `ToolMixin.setCapabilities: unknown capability '${cap}'`,
          );
        }
      }
      this.capabilities = [...value];
    }

    hasCapability(cap: string): boolean {
      return this.capabilities.includes(cap);
    }

    getCondition(): number {
      return this._condition;
    }

    setCondition(value: number): void {
      this.condition = value;
    }

    wear(amount: number = WEAR_PER_USE): void {
      if (!Number.isFinite(amount) || amount < 0) return;
      this.condition = this._condition - amount;
    }
  };
}
