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
import { MixinApi } from '../../api/mixin';
import { ToolCapabilities, type CapabilitySpec } from './ToolCapability';
import { EPOCHS, type Epoch } from './Epoch';
import type { ConferredTechnique } from './Technique';

export interface Tooled {
  getCapabilities(): readonly string[];
  setCapabilities(value: (string | CapabilitySpec)[]): void;
  hasCapability(cap: string): boolean;
  /** The kind's authored work-rate, clamped 0.25–10; 1 when absent. */
  capabilityRate(kind: string): number;
  /** The kind's authored control band, or null. */
  capabilityControl(kind: string): string | null;
  /**
   * Every working this instrument performs, across its capability
   * entries — what `Techniques.fromTools` reads at the fill. The tool
   * is what knows; the kernel keeps no technique table.
   */
  capabilityTechniques(): readonly ConferredTechnique[];
  /**
   * The technological epoch this instrument belongs to — one of the
   * closed {@link EPOCHS} — or `null` when the row does not say. A
   * stamp, not a mechanism: its reader is the land-use covenant's
   * predicate (a parcel that admits handsaws and refuses chainsaws asks
   * the INSTRUMENT, not the act). The setter refuses any other word, so
   * a mis-typed row fails at hydrate.
   */
  getEpoch(): Epoch | null;
  setEpoch(value: Epoch | null): void;
}

export function ToolMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class ToolMixin extends Base implements Tooled {
    static _mixinName = 'ToolMixin';

    static fieldMeta: FieldMeta = {
      capabilities: { persistent: true, authorable: true },
      epoch: { persistent: true, authorable: true },
    };

    /**
     * The capabilities this tool offers — bare kind strings (shorthand
     * for the defaulted spec) and/or parameterized entries
     * `{ kind, verbs?, rate?, control?, placement? }`, validated for
     * shape (the vocabulary is open). Persisted exactly as authored; normalization happens
     * on read (`entryFor`), so seeds stay byte-stable.
     */
    public capabilities: (string | CapabilitySpec)[] = [];

    /** The epoch stamp; `null` = unstated. */
    public epoch: Epoch | null = null;

    getEpoch(): Epoch | null {
      return this.epoch;
    }

    setEpoch(value: Epoch | null): void {
      // `''` too: the hydrator hands a row's empty string straight here.
      if (value == null || (value as string) === '') {
        this.epoch = null;
        return;
      }
      if (!(EPOCHS as readonly string[]).includes(value)) {
        throw new RangeError(
          `ToolMixin.setEpoch: unknown epoch '${String(value)}' — one of ${EPOCHS.join(', ')}`,
        );
      }
      this.epoch = value;
    }

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

    public capabilityTechniques(): readonly ConferredTechnique[] {
      const out: ConferredTechnique[] = [];
      for (const e of this.capabilities) {
        if (typeof e !== 'string' && e.technique) {
          out.push({ kind: e.kind, technique: e.technique });
        }
      }
      return out;
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

  };
}
