/**
 * Door - First-class shared door state referenced by exit pairs.
 *
 * One `Door` instance represents one physical door. Both sides of a
 * bidirectional exit pair reference the SAME instance so that opening the
 * door from room A is immediately visible from room B.
 * `ExitableMixin.addBidirectionalExit()` wires this up in a single call.
 *
 * Composition: `VisibleMixin(PerceptibleMixin(SealableMixin(Idea)))`.
 * A Door is an `Idea` — it has identity but does NOT compose `Containable`
 * (no environment) or `Container` (no inventory). It lives nowhere spatial
 * and is referenced purely through `Exit.door`.
 *
 * Mixin responsibilities:
 *   - `SealableMixin`: open/closed state (shared with chests, trapdoors, …).
 *   - `PerceptibleMixin`: MQL keywords so the player can type
 *     `open the oak door` and have it resolve.
 *   - `VisibleMixin`: short/long descriptions, so `look door` and
 *     `DescribeApi.getDisplayName()` both work uniformly.
 *
 * Template-loadable: `Door` is cloned from a `domain` template via
 * `StuffApi.clone()`. Domain docs are `{ path, class, hydratorClass?, data }`;
 * the base `Hydrator`'s default mixin-field copy is sufficient here, and
 * Door-specific fixups (keyword normalization, `isOpen` strict-boolean
 * coercion) run in the `initialize()` hook that clone awaits after hydrate.
 * The constructor also accepts a raw `Record<string, unknown>` for
 * ad-hoc/test construction; that path applies the same fixups inline.
 *
 * MQL surfaces a door on its room via `ExitableMixin.getExitDoors()`
 * (MqlApi scans those in addition to the room's contents), so a door is
 * player-targetable by name even though it doesn't live in anyone's
 * inventory.
 *
 * Phase 7 scope: open/closed only. No locks, no keys, no `unlock` command.
 */

import { Idea } from '../stuff/Idea';
import { SealableMixin } from './Sealable';
import { PerceptibleMixin } from '../description/Perceptible';
import { VisibleMixin } from '../description/Visible';
import { MixinApi } from '../../api/mixin';

const DoorBase = VisibleMixin(PerceptibleMixin(SealableMixin(Idea)));

export class Door extends DoorBase {
  /**
   * Constructor — no-arg for the clone pipeline (`Hydrator.hydrate()` fills
   * state after construction), or with a raw data blob for direct
   * test/ad-hoc construction. The raw-data path mirrors the default
   * `Hydrator` field-copy and then applies Door's normalization fixups.
   */
  constructor(data?: Record<string, unknown>) {
    super();
    if (data) {
      const fields = MixinApi.getAllPersistentFields(
        this.constructor as new (...args: unknown[]) => Idea
      );
      const target = this as unknown as Record<string, unknown>;
      for (const field of fields) {
        if (field in data) target[field] = data[field];
      }
      this.#normalize();
    }
  }

  /**
   * Post-hydration fixup hook invoked by `StuffApi.clone()` after the
   * hydrator finishes. Normalizes keywords (lowercase/trim/dedupe via the
   * mixin setter) and coerces `isOpen` to a strict boolean. Idempotent —
   * safe to call again after direct-construction's inline normalize.
   */
  public async initialize(): Promise<void> {
    this.#normalize();
  }

  #normalize(): void {
    // Use `super.getKeywords()` to grab ONLY the raw PerceptibleMixin list —
    // Door's override also merges in `shortDescription` tokens, which would
    // otherwise turn every name token into a permanent explicit keyword.
    const kw = super.getKeywords();
    if (kw.length > 0) {
      this.setKeywords([]);
      for (const k of kw) this.addKeyword(k);
    }
    this.isOpen = this.isOpen === true;
  }

  /**
   * Union of the PerceptibleMixin keyword list with the tokens of the
   * door's shortDescription. A door constructed with only `shortDescription:
   * 'heavy oak door'` should still be targetable as `oak` / `door` without
   * the template author having to re-list those as explicit keywords.
   */
  override getKeywords(): string[] {
    const base = super.getKeywords();
    const nameTokens = this.shortDescription
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 0);
    return Array.from(new Set([...base, ...nameTokens]));
  }
}
