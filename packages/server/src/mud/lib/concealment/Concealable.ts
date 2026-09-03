/**
 * ConcealableMixin — the *presence-concealment* axis of a perceivable.
 *
 * Composing this mixin declares that a Stuff carries a single authored
 * {@link ConcealmentLevel} — "how hard is it to notice this is here?".
 * Every loose perceivable (a `Thing`, a `Creature`/`Character`, an `Exit`)
 * composes it so a designer can hide a cache, a secret door, or a lurking
 * creature, all through one representation. It defaults to `'obvious'`
 * (fully present in every viewer's world), so an un-authored thing is
 * inert — backcompat by construction.
 *
 * **The value is presence, not identity.** A concealment level answers
 * *whether* a thing resolves for a viewer at all; belief/recognition owns
 * *who* a resolved thing is. The detection gate (`PerceptionApi`, a later
 * phase) reads this field against a viewer's effective perception; this
 * mixin is the dumb carrier.
 *
 * **Carrier shape.** The durable field is the band *word*
 * (`concealment: ConcealmentLevel`, stable + human-readable in seeds),
 * validated on set. The inter-Stuff contract is the method surface
 * `getConcealment()` / `setConcealment()` / `isConcealed()` — other Stuff
 * read the band, never the raw field.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { ConcealmentLevel } from './ConcealmentLevel';
import { ConcealmentLevels } from './ConcealmentLevel';
import type { Stuff } from '../stuff/Stuff';
import { MixinApi } from '../../api/mixin';

export interface Concealable {
  /** The concealment band (`'obvious'` when not concealed). */
  getConcealment(): ConcealmentLevel;
  /** Set the concealment band; throws on an unknown band word. */
  setConcealment(level: ConcealmentLevel): void;
  /** The AUTHORED band, before any worn contribution. */
  getBaseConcealment(): ConcealmentLevel;
  /** True iff the band is anything other than `'obvious'`. */
  isConcealed(): boolean;
  /**
   * The authored *hint* — the "tell" a viewer who nearly-but-not-quite
   * perceives this thing notices ("a draft," "the bookshelf sits oddly").
   * `undefined` when the author left none (a generic nudge is used).
   * Honest fog: a hint names a tell, never the concealed thing's identity.
   */
  getConcealmentHint(): string | undefined;
  /** Set the authored hint / "tell" (pass `undefined` to clear). */
  setConcealmentHint(hint: string | undefined): void;
  /**
   * The durable, per-viewer **discovery key** this concealable is recorded
   * under in the `DISCOVERY` belief realm (D3). Defaults to the thing's own
   * `templatePath` (stable for authored singleton content). A perceivable
   * that carries no templatePath of its own — an `Exit` is a runtime
   * instance — overrides this to a durable synthetic key (source + label),
   * so a discovered secret door stays discovered across re-clones. Returns
   * `undefined` when no durable key exists (a generic multi-clone — the
   * player-placed-concealment case the requirements defer).
   */
  getDiscoveryKey(): string | undefined;
}

export function ConcealableMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class ConcealableMixin extends Base implements Concealable {
    static _mixinName = 'ConcealableMixin';
    static fieldMeta: FieldMeta = {
      concealment: { persistent: true, authorable: true },
      concealmentHint: { persistent: true, authorable: true },
    };

    /**
     * The concealment band; `'obvious'` (the default) = not concealed.
     * Authored on seeds that want a hidden thing (`concealment: hidden`).
     */
    public concealment: ConcealmentLevel = 'obvious';


    /**
     * The authored hint / "tell" surfaced to a viewer who nearly perceives
     * this thing (via `PerceptionApi.hintsFor` → the room render). Left
     * `undefined` by default; authored on seeds that want a directed nudge
     * (`concealmentHint: "a draft from the north wall"`). Never names the
     * concealed thing's identity — honest fog.
     */
    public concealmentHint?: string;

    /**
     * The concealment band — **derive-on-read**: the authored base,
     * shifted by whatever the host is WEARING.
     *
     * ⭐ The same architectural move as `clo`, on a different channel:
     * the persisted field is the author's claim about the thing itself,
     * and the read folds in what is true right now. A camouflaged
     * covering shifts it down, a conspicuous one up — and the offset's
     * sign comes from content (the outermost layer's colour and weave),
     * never from an `isCamouflage` flag.
     *
     * ⚠ Non-`Slotted` hosts (a trapdoor, a cached letter) read exactly
     * their authored band, so every shipped concealment row behaves
     * identically to before.
     */
    getConcealment(): ConcealmentLevel {
      const self = this as unknown as Stuff;
      if (!MixinApi.isSlotted(self)) return this.concealment;
      const offset = self.concealmentOffset();
      if (offset === 0) return this.concealment;
      // Positive offset = louder = a LOWER band; the ranks run
      // conspicuous → buried.
      const rank = ConcealmentLevels.rankOf(this.concealment) - Math.round(offset);
      const all = ConcealmentLevels.ALL;
      const clamped = rank < 0 ? 0 : rank >= all.length ? all.length - 1 : rank;
      return all[clamped]!;
    }

    /** The AUTHORED band, before any worn contribution. */
    getBaseConcealment(): ConcealmentLevel {
      return this.concealment;
    }

    setConcealment(level: ConcealmentLevel): void {
      if (!ConcealmentLevels.isLevel(level)) {
        throw new RangeError(
          `ConcealableMixin.setConcealment: unknown concealment level '${level}'`,
        );
      }
      this.concealment = level;
    }

    isConcealed(): boolean {
      return ConcealmentLevels.isConcealed(this.getConcealment());
    }

    getConcealmentHint(): string | undefined {
      return this.concealmentHint;
    }

    setConcealmentHint(hint: string | undefined): void {
      this.concealmentHint = hint;
    }

    getDiscoveryKey(): string | undefined {
      // Default: the thing's own durable templatePath (authored singletons).
      // Exit overrides — it carries no templatePath of its own.
      return (
        (this as unknown as { getTemplatePath(): string | null }).getTemplatePath() ??
        undefined
      );
    }
  };
}
