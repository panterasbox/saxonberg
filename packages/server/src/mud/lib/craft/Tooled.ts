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

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { CommandContributions } from '../../api/command';
import { MixinApi } from '../../api/mixin';
import { ToolCapabilities, type CapabilitySpec } from './ToolCapability';

export interface Tooled {
  getCapabilities(): readonly string[];
  setCapabilities(value: (string | CapabilitySpec)[]): void;
  hasCapability(cap: string): boolean;
  /** The kind's authored work-rate, clamped 0.25–10; 1 when absent. */
  capabilityRate(kind: string): number;
  /** The kind's authored control band, or null. */
  capabilityControl(kind: string): string | null;
}

export function ToolMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class ToolMixin extends Base implements Tooled {
    static _mixinName = 'ToolMixin';

    static fieldMeta: FieldMeta = {
      capabilities: { persistent: true, authorable: true },
    };

    /**
     * The capabilities this tool offers — bare kind strings (shorthand
     * for the defaulted spec) and/or parameterized entries
     * `{ kind, rate?, control?, placement? }`, validated against the
     * vocabulary. Persisted exactly as authored; normalization happens
     * on read (`entryFor`), so seeds stay byte-stable.
     */
    public capabilities: (string | CapabilitySpec)[] = [];

    getCapabilities(): readonly string[] {
      return this.capabilities.map((e) =>
        typeof e === 'string' ? e : e.kind,
      );
    }

    setCapabilities(value: (string | CapabilitySpec)[]): void {
      if (!Array.isArray(value)) {
        throw new TypeError(
          'ToolMixin.setCapabilities: expected an array of kinds/specs',
        );
      }
      for (const entry of value) {
        ToolCapabilities.validateEntry(entry);
      }
      this.capabilities = value.map((e) =>
        typeof e === 'string' ? e : { ...e },
      );
    }

    hasCapability(cap: string): boolean {
      // Broken is capability loss: a broken tool (the two mixins compose
      // at the use site — ToolMixin(DurableMixin(…))) offers nothing
      // until repaired.
      const self = this as unknown as Stuff;
      if (MixinApi.isDurable(self) && self.isBroken()) return false;
      return this.entryFor(cap) !== null;
    }

    capabilityRate(kind: string): number {
      const entry = this.entryFor(kind);
      const rate = entry?.rate ?? 1;
      if (!Number.isFinite(rate) || rate <= 0) return 1;
      return Math.min(
        ToolCapabilities.RATE_MAX,
        Math.max(ToolCapabilities.RATE_MIN, rate),
      );
    }

    capabilityControl(kind: string): string | null {
      return this.entryFor(kind)?.control ?? null;
    }

    /** The kind's normalized entry — a bare string IS the defaulted
     * spec everywhere behavior reads it. Null when the kind is absent. */
    private entryFor(kind: string): CapabilitySpec | null {
      for (const e of this.capabilities) {
        if (typeof e === 'string') {
          if (e === kind) return { kind };
        } else if (e.kind === kind) {
          return e;
        }
      }
      return null;
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
      for (const entry of this.capabilities) {
        const spec: CapabilitySpec =
          typeof entry === 'string' ? { kind: entry } : entry;
        const def = ToolCapabilities.definitionOf(spec.kind);
        if (!def || def.verbs.length === 0) continue;
        const placement = spec.placement ?? def.placement;
        inventory.push(...def.verbs);
        if (placement === 'reachable') environment.push(...def.verbs);
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
