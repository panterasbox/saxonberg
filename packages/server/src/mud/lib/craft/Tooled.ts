/**
 * ToolMixin — a host that plays the **tool** role in a transformation: the
 * capital side of control (`control = f(skill, tools)`).
 *
 * A tool is not a kind — it's a role an object plays because a recipe asks
 * for it (see {@link ToolCapabilities}). The mixin adds the crafting
 * **capabilities** ("shaker") a recipe requires by kind.
 *
 * **Tool ⊂ durable-good, not the reverse.** The wear-on-use `condition`
 * gauge lives on {@link DurableMixin} — composed *alongside* ToolMixin on
 * `ToolItem` — precisely so weapons and armor can wear out *without* being
 * "tools" (they'd carry an inert `capabilities: []`). A crafting tool is a
 * `Durable` host that *also* offers capabilities; the two are composed at
 * the use site (`ToolMixin(DurableMixin(…))`), never bundled here.
 *
 * Composed on a `Thing` (Tangible + Visible) — see `ToolItem.ts`.
 */

import type { MixinConstructor } from '../mixin';
import { ToolCapabilities } from './ToolCapability';

export interface Tooled {
  getCapabilities(): readonly string[];
  setCapabilities(value: string[]): void;
  hasCapability(cap: string): boolean;
}

export function ToolMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class ToolMixin extends Base implements Tooled {
    static _mixinName = 'ToolMixin';

    static persistentFields = ['capabilities'];

    /**
     * The capabilities this tool offers (validated against the vocabulary).
     *
     * @authorable
     */
    public capabilities: string[] = [];

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
  };
}
