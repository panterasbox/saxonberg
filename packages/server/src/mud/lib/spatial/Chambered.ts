/**
 * ChamberedMixin — a thing that has compartments of its own: a sawmill's
 * drying loft, a refrigerator's freezer, a smokehouse's chamber, a boat's
 * bow and stern.
 *
 * A host **declares** its chambers as data and the mixin **mints** them —
 * chambers are never placed by hand:
 *
 * ```yaml
 * chambers:
 *   - { key: loft, template: /trade/carpentry/thing/drying-loft }
 * ```
 *
 * Each chamber is its own Stuff (a `Chamber` — `Atmospheric` + `Placing
 * [in]`), with its own air: what is put `in` it reads the chamber's
 * temperature and humidity, not the room's. The host keeps them by key
 * and they die with it.
 *
 * ⭐ **The reconciliation this mixin records** (assembly plan D15). Two
 * design docs agreed a chamber is its own Stuff and disagreed on how a
 * thing sits in one. The fridge-design-pack's answer — **placement** —
 * won, so a chamber's occupants are placed `in` it (`put board in loft`)
 * and nothing about scope-walk or `canReach` changes. The
 * chambered-vessels slate's contribution survives as THIS host half: the
 * declaration, the mint, and the destruct cascade.
 *
 * ⭐ **Where a chamber stands: in the host's own container**, beside it —
 * NOT in the host's contents. A chamber offers a placement, and a
 * placement host must live in an environment for `getPlaced()` to walk
 * (Placing's first composition refusal); standing in the room beside its
 * host, the loft's boards keep `container = the room`, are in room scope,
 * and are reached in one step, which is the whole reason D15 chose
 * placement. It is also the fridge doc's boat clause: *"the Chambers are
 * in the vessel's contents, not placements on the vessel itself"* — a
 * boat's container for its stations is its own interior, and a sawmill's
 * is the yard. Where the host moves, its chambers move with it
 * ({@link onMoved}).
 *
 * ⭐ **Minted at phase 2, not in `onCreate`.** `chambers:` is an
 * INSTRUCTION field: the row's list is a recipe consumed to produce
 * separately-named runtime state (the chamber objects), which is what the
 * template applier's phase 2 is for (`props:`/`cast:` are the
 * precedents). Idempotent by key, because go-live re-runs every phase-2
 * applier — a re-applied row mints only the keys it has no live chamber
 * for, so an edit that ADDS a chamber reaches live hosts and an edit that
 * changes nothing mints nothing.
 *
 * ⚠ Mint order. A host cloned by a room's `props:` is minted BEFORE the
 * room moves it in, so at phase 2 it usually has no container yet: the
 * chamber is minted loose and joins the host on its first move. A host
 * that already stands somewhere (a `container:` row, a re-applied row)
 * lands its new chambers there directly.
 *
 * ⚠ **Not persisted as such.** The chambers are owned instance refs
 * (`lifetime: 'owned'` — the destruct cascade is the framework's, slot
 * 2.5) and an instance ref cannot persist; a host re-cloned from its row
 * re-mints them from the same declaration, the `props:` shape.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from './Container';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { ContainmentApi } from '../../api/containment';

/**
 * One declared compartment: the host's own name for it (`loft`,
 * `freezer`, `bow`) and the row its chamber clones from.
 */
export interface ChamberSpec {
  /** The host-local name; unique within one host. */
  key: string;
  /** The template path the chamber clones from (a `Chamber` row). */
  template: string;
}

/** Public shape added by ChamberedMixin. */
export interface Chambered {
  /** The live chambers, in declaration order. */
  getChambers(): readonly Stuff[];
  /** The live chamber declared under `key`, or `null`. */
  getChamber(key: string): Stuff | null;
  /**
   * Phase-2 applier for `chambers:`. Mints every declared chamber this
   * host has no live one for, and lands it beside the host when the host
   * stands somewhere. Idempotent by key.
   */
  applyChambers(specs: ChamberSpec[]): Promise<void>;
}

export function ChamberedMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class ChamberedMixin extends Base implements Chambered {
    static _mixinName: string = 'ChamberedMixin';

    static fieldMeta: FieldMeta = {
      chambers: { instruction: true, authorable: true },
      _chambers: { ref: 'instance', lifetime: 'owned' },
    };

    /**
     * The minted chambers by key. Owned: the destruct cascade
     * (`StuffApi`'s declared-ref cleanup) takes them with the host.
     */
    public _chambers: Map<string, Stuff> = new Map();

    getChambers(): readonly Stuff[] {
      return [...this._chambers.values()].filter((c) => !c.isDestroyed());
    }

    getChamber(key: string): Stuff | null {
      const c = this._chambers.get(key);
      return c !== undefined && !c.isDestroyed() ? c : null;
    }

    async applyChambers(specs: ChamberSpec[]): Promise<void> {
      if (!Array.isArray(specs)) return;
      const seen = new Set<string>();
      for (const spec of specs) {
        const key = typeof spec?.key === 'string' ? spec.key.trim() : '';
        const template =
          typeof spec?.template === 'string' ? spec.template.trim() : '';
        if (key === '' || template === '') {
          throw new Error(
            `ChamberedMixin.applyChambers: every chamber needs a \`key\` ` +
              `and a \`template\` (got ${JSON.stringify(spec)}).`,
          );
        }
        if (seen.has(key)) {
          throw new Error(
            `ChamberedMixin.applyChambers: two chambers share ` +
              `\`key: ${key}\`. A key is the chamber's name on its host — ` +
              `two of them have no answer.`,
          );
        }
        seen.add(key);
        if (this.getChamber(key) !== null) continue;

        const chamber = await StuffApi.clone<Stuff>(template);
        if (!MixinApi.isContainable(chamber) || !MixinApi.isPlacing(chamber)) {
          StuffApi.destruct(chamber);
          throw new Error(
            `ChamberedMixin.applyChambers: '${template}' is not a ` +
              `chamber — a chamber must be a Containable Placing host ` +
              `(a \`Chamber\` row) so things can be put in it.`,
          );
        }
        this._chambers.set(key, chamber);
        const env = this.hostEnvironment();
        // Fixture infrastructure: placed and captured, owned by nobody.
        if (env !== null) await ContainmentApi.land(chamber, env, null);
      }
    }

    /**
     * Containment witness — a host that moves takes its chambers with it.
     * The first move of a host minted inside a room's `props:` cascade is
     * what stands its chambers up beside it. Chains any inner `onMoved`
     * witness first (the `Thermal` shape).
     */
    public onMoved(
      from: (Stuff & Container) | null,
      to: (Stuff & Container) | null,
    ): void {
      const sup = (Base.prototype as {
        onMoved?: (
          f: (Stuff & Container) | null,
          t: (Stuff & Container) | null,
        ) => void;
      }).onMoved;
      if (typeof sup === 'function') sup.call(this, from, to);
      if (to === null) return;
      for (const chamber of this.getChambers()) {
        if (!MixinApi.isContainable(chamber)) continue;
        if (chamber.getContainer() === to) continue;
        ContainmentApi.move(chamber, to);
      }
    }

    /** Where this host stands, or `null` when it stands nowhere yet. */
    private hostEnvironment(): (Stuff & Container) | null {
      const self = this as unknown as Stuff;
      if (!MixinApi.isContainable(self)) return null;
      return self.getContainer();
    }
  };
}
