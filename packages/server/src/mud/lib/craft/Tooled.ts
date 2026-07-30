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
import type { Stuff } from '../stuff/Stuff';
import type { CommandContributions } from '../../api/command';
import { MixinApi } from '../../api/mixin';
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
      // Broken is capability loss: a broken tool (the two mixins compose
      // at the use site — ToolMixin(DurableMixin(…))) offers nothing
      // until repaired.
      const self = this as unknown as Stuff;
      if (MixinApi.isDurable(self) && self.isBroken()) return false;
      return this.capabilities.includes(cap);
    }

    /**
     * Per-instance dynamic command contributions (the
     * `InstanceContributor` seam): the union of the capability table's
     * verb families over this instance's **authored** capabilities —
     * the tool that does the work carries its working verbs, so a tool
     * variant is pure seed data. Placement per the kind's table entry
     * (`reachable` → environment + inventory, `carried` → inventory
     * only). Deliberately NOT broken-gated: a broken anvil keeps
     * *affording* `hammer` and the controller's `hasCapability` check
     * declines diegetically (a vanishing verb would also go stale —
     * breakage doesn't move the tool, so no containment delta fires).
     */
    public getInstanceContributions(): CommandContributions {
      // Merge any inner contributor's buckets (the Behaved pattern) —
      // a shadowing implementation must not drop a sibling seam.
      const inner =
        (
          Base.prototype as {
            getInstanceContributions?: () => CommandContributions;
          }
        ).getInstanceContributions?.call(this) ?? {};
      const environment: string[] = [...(inner.environment ?? [])];
      const inventory: string[] = [...(inner.inventory ?? [])];
      for (const cap of this.capabilities) {
        const def = ToolCapabilities.definitionOf(cap);
        if (!def || def.verbs.length === 0) continue;
        inventory.push(...def.verbs);
        if (def.placement === 'reachable') environment.push(...def.verbs);
      }
      if (
        environment.length === (inner.environment?.length ?? 0) &&
        inventory.length === (inner.inventory?.length ?? 0)
      ) {
        return inner;
      }
      return { ...inner, environment, inventory };
    }
  };
}
