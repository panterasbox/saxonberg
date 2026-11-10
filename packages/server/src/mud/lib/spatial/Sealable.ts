/**
 * SealableMixin — binary open/closed state for things that can be sealed.
 *
 * Doors are the canonical sealable, but the concept generalizes: chests,
 * boxes, trapdoors, windows, envelopes. Open/close controllers target any
 * Sealable rather than Door specifically — the surface is the same.
 *
 * Scope is intentionally narrow: `setOpen()` / `isOpen()` (the
 * predicate/setter pair), plus `open()` / `close()` (the action verbs).
 * Locks, keys, and unlock commands are future phases.
 *
 * Convention (per `feedback_boolean_field_naming`): the field, setter,
 * and YAML key use the noun form (`open`); the predicate getter uses
 * the `is` prefix (`isOpen()`). Reads naturally at every site:
 * `door.setOpen(true)`, `door.isOpen()`, `data: { open: true }`.
 *
 * Note: no `get open() / set open()` accessor pair is declared — the
 * accessor name would collide with the `open()` action method. With
 * the new three-phase applier dispatch (`TemplateApplier` Phase 1
 * tries `setOpen` first, falls back to bracket-assign only when no
 * setter exists), the bracket-assign-fallback path is never reached
 * for `open` because `setOpen` is defined; the runtime-shape
 * validation lives in `setOpen` directly.
 *
 * The guarded-boolean storage is delegated to `BistateMixin` (the
 * shared substrate under Sealable/Switchable/Foldable); this mixin is
 * the open/closed naming layer over `getState()` / `setState()`.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import { BistateMixin, type BistateInternal } from '../Bistate';
import type { VetoResult } from '../errors';
import type { Stuff } from '../stuff/Stuff';
import type { MarkupAugmenter } from '../../api/mml';
import { MixinApi } from '../../api/mixin';

/**
 * ⭐ What a thing can be SEALED with — a gummed flap, a blob
 * of wax pressed with a device. `''` = no seal. A closed vocabulary.
 */
export const SEALS = ['', 'gum', 'wax'] as const;
export type SealKind = (typeof SEALS)[number];

/** Why a seal could not be set, in words. */
export type SealOutcome =
  | { ok: true; line: string }
  | { ok: false; reason: 'open' | 'seal-broken' | 'unknown-seal'; line: string };

/**
 * ⭐ A broken seal SHOWS: *its seal is broken* on a look, so a
 * letter that has been opened says so to whoever holds it next.
 */
const sealAugmenter: MarkupAugmenter = (text, host, _viewer, opts) => {
  if (opts?.filter) return text;
  if (!MixinApi.isSealable(host)) return text;
  const seal = host.getSeal();
  if (seal === '') return text;
  const line = host.isSealBroken()
    ? `Its ${seal === 'wax' ? 'wax seal' : 'gummed flap'} has been broken.`
    : `It is sealed ${seal === 'wax' ? 'with wax' : 'shut, its flap gummed down'}.`;
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
};

/**
 * Public shape added by SealableMixin. `isOpen()` (predicate getter) /
 * `setOpen()` (noun setter) is the inter-Stuff contract surface;
 * `open()` / `close()` are the action-shaped mutators most callers
 * want.
 */
export interface Sealable {
  isOpen(): boolean;
  setOpen(value: boolean): void;
  /** `by` is who did it, for a sealable that keeps a record (`Throttleable`). */
  open(by?: Stuff | null): void;
  close(by?: Stuff | null): void;
  /**
   * @hook May `by` open this now? (water-supply D12) The default says yes;
   * a `Door` says no while it is locked, a `Gate` while its padlock holds
   * against somebody with no key. The `open` verb asks it first and renders
   * the refusal it returns — the mixin decides, the controller says it.
   */
  canOpen(by: Stuff): VetoResult;
  /**
   * @hook May `by` close this now? The default says yes; a fixed grating
   * says no (boundary build — it is always open). The `close` verb asks it
   * first and renders the refusal, as `open` does `canOpen`.
   */
  canClose(by: Stuff): VetoResult;
  /** ⭐ The seal on it (`''` · `gum` · `wax`) — paper D11. */
  getSeal(): SealKind;
  /** ⭐ Has the seal been broken since it was set? */
  isSealBroken(): boolean;
  /**
   * ⭐ Seal it shut. It must be closed; a broken seal is not re-made — a
   * fresh WAX seal replaces it, a gummed flap cannot be gummed twice
   * (that is the forger's act, refused in words).
   */
  sealWith(kind: string, by?: Stuff): SealOutcome;
}

export function SealableMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class SealableMixin extends BistateMixin(Base) {
    static _mixinName = 'SealableMixin';

    static fieldMeta: FieldMeta = {
      open: { persistent: true },
      seal: { persistent: true, authorable: true },
      sealBroken: { persistent: true },
    };

    static markupAugmenters: MarkupAugmenter[] = [sealAugmenter];

    /** What it is sealed with; `''` = nothing (every door, chest and vat). */
    public seal: SealKind = '';
    /** Set when a sealed thing is opened; never cleared by closing it. */
    public sealBroken = false;

    getSeal(): SealKind {
      return (SEALS as readonly string[]).includes(this.seal) ? this.seal : '';
    }

    setSeal(kind: string): void {
      if (!(SEALS as readonly string[]).includes(kind)) {
        throw new RangeError(`seal: unknown seal '${kind}' (expected ${SEALS.filter((k) => k).join(' | ')})`);
      }
      this.seal = kind as SealKind;
    }

    isSealBroken(): boolean {
      return this.getSeal() !== '' && this.sealBroken === true;
    }

    sealWith(kind: string, by?: Stuff): SealOutcome {
      if (!(SEALS as readonly string[]).includes(kind) || kind === '') {
        return { ok: false, reason: 'unknown-seal', line: 'You can seal a thing with gum or with wax.' };
      }
      if (this.isOpen()) {
        return { ok: false, reason: 'open', line: 'Close it first.' };
      }
      // ⭐ A broken gummed flap does not take gum twice; wax over a broken
      // seal is a NEW seal — and anyone who knew the old one sees it is new.
      if (this.isSealBroken() && kind === 'gum' && this.getSeal() === 'gum') {
        return { ok: false, reason: 'seal-broken', line: 'The flap has been opened; the gum will not take again. You would need a new one.' };
      }
      // ⭐ Wax comes from somewhere: a candle end, a stick of sealing wax in
      // the sealer's hands (a material tagged `wax`).
      if (kind === 'wax' && by !== undefined) {
        const wax = MixinApi.isContainer(by)
          ? by.getContents().find((c) => MixinApi.isTangible(c) && c.getMaterial()?.hasTag('wax') === true)
          : undefined;
        if (wax === undefined) {
          return { ok: false, reason: 'unknown-seal', line: 'You have no wax to seal it with — a candle end would do.' };
        }
      }
      this.seal = kind as SealKind;
      this.sealBroken = false;
      return {
        ok: true,
        line: kind === 'wax' ? 'You drip wax over the join and press it shut.' : 'You lick the flap and press it down.',
      };
    }

    /** Predicate getter. */
    isOpen(): boolean {
      return (this as unknown as BistateInternal).getState();
    }

    /**
     * Noun setter. Rejects non-boolean assignments with `TypeError`
     * — a malformed template (`open: 1`) crashes loudly at hydrate
     * time rather than being silently coerced.
     */
    setOpen(value: boolean): void {
      (this as unknown as BistateInternal).setState(value, 'Sealable.open');
    }

    /** Open the sealable. Idempotent — opening an already-open one is a no-op. */
    open(_by?: Stuff | null): void {
      // ⭐ Opening a sealed thing BREAKS the seal; closing it
      // again never mends it.
      if (!this.isOpen() && this.getSeal() !== '') this.sealBroken = true;
      (this as unknown as BistateInternal).setState(true, 'Sealable.open');
    }

    /** Close the sealable. Idempotent — closing an already-closed one is a no-op. */
    close(_by?: Stuff | null): void {
      (this as unknown as BistateInternal).setState(false, 'Sealable.open');
    }

    /** May `by` open this? A plain sealable always says yes. */
    canOpen(_by: Stuff): VetoResult {
      return { ok: true };
    }

    /** May `by` close this? A plain sealable always says yes. */
    canClose(_by: Stuff): VetoResult {
      return { ok: true };
    }
  };
}
