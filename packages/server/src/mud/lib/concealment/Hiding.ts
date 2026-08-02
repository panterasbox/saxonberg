/**
 * HidingMixin — the **actor-side** of presence-concealment: a Character's
 * dynamic decision to *disappear*.
 *
 * The concealment build shipped `ConcealableMixin` as a **static authored**
 * carrier — a room hides a cache, a creature is authored lurking. This
 * mixin makes concealment **actor-driven**: an actor enters a `hidden`
 * state on demand, and its *level* is computed at entry from competence ×
 * cover × light × stillness (`PerceptionApi.hideLevelFor`) and snapshotted
 * into `hiddenLevel`.
 *
 * **The seam is the `getConcealment()` override.** `Character` composes this
 * mixin *outside* `Creature`'s `ConcealableMixin`, so while `hiding` it
 * returns the dynamic `hiddenLevel`; otherwise it defers to `super` (the
 * authored static field — an NPC authored lurking keeps its band). The
 * shipped detection gate (`PerceptionApi.perceives`), the honest-fog
 * enumeration seams (look / scope-walk / the container wire projection),
 * and the `search` reveal all resolve an actively-hiding actor **for free**
 * — a hidden actor is a concealable like any other.
 *
 * **Discovery is not sticky while hiding.** `getDiscoveryKey()` returns
 * `undefined` while `hiding`, so a searcher who beats the level reveals the
 * actor **in the moment** (the `resolveSearch` `found` list) but records no
 * permanent per-viewer `DISCOVERY` — re-hiding is a fresh contest, not
 * "found forever." (A non-hiding NPC's authored concealment keeps its
 * durable templatePath key via `super`.)
 *
 * Storage mirrors `PosedMixin`: two persistent per-actor fields, plain
 * `get`/`set`-style surface. State only — the level *derivation* is a rule
 * that lives on the gated `PerceptionApi` engine, never here.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Concealable } from './Concealable';
import type { ConcealmentLevel } from './ConcealmentLevel';
import { ConcealmentLevels } from './ConcealmentLevel';

export interface Hiding {
  /** Is the actor currently in the hidden state? */
  isHiding(): boolean;
  /** The snapshotted dynamic concealment band (meaningful while hiding). */
  getHiddenLevel(): ConcealmentLevel;
  /**
   * Enter the hidden state at the given (pre-derived) level. The level is
   * computed by `PerceptionApi.hideLevelFor` at command time — this method
   * only stores the snapshot. Throws on an unknown band word.
   */
  enterHide(level: ConcealmentLevel): void;
  /** Leave the hidden state (motion / attacking / an unhide). Idempotent. */
  breakHide(): void;
  /**
   * Degrade the hidden level by `bands` (the motion-exposure step): drop
   * that many concealment bands, and break hiding entirely if it falls to
   * `obvious`. `0` (a sneak) holds; a large count (a run) clears. No-op when
   * not hiding. See `PerceptionApi.motionExposure`.
   */
  degradeHide(bands: number): void;
}

export function HidingMixin<TBase extends MixinConstructor<Concealable>>(
  Base: TBase,
) {
  return class HidingMixin extends Base implements Hiding {
    static _mixinName = 'HidingMixin';
    static fieldMeta: FieldMeta = {
      hiding: { persistent: true },
      hiddenLevel: { persistent: true },
    };

    /** Whether the actor is currently hidden. Persistent (survives a save
     * so a reconnect restores the state the avatar logged off in). */
    public hiding = false;

    /** The snapshotted dynamic band, presented via `getConcealment()` while
     * `hiding`. Meaningless (a stale snapshot) when not hiding. */
    public hiddenLevel: ConcealmentLevel = 'hidden';

    public isHiding(): boolean {
      return this.hiding;
    }

    public getHiddenLevel(): ConcealmentLevel {
      return this.hiddenLevel;
    }

    public enterHide(level: ConcealmentLevel): void {
      if (!ConcealmentLevels.isLevel(level)) {
        throw new RangeError(
          `HidingMixin.enterHide: unknown concealment level '${level}'`,
        );
      }
      this.hiding = true;
      this.hiddenLevel = level;
    }

    public breakHide(): void {
      this.hiding = false;
    }

    public degradeHide(bands: number): void {
      if (!this.hiding || bands <= 0) return;
      const rank = ConcealmentLevels.rankOf(this.hiddenLevel);
      const newRank = Math.max(0, rank - Math.floor(bands));
      if (newRank <= 0) {
        this.breakHide();
        return;
      }
      this.hiddenLevel = ConcealmentLevels.ALL[newRank]!;
    }

    /**
     * The concealment carrier override: present the dynamic `hiddenLevel`
     * while hiding, else defer to the authored static field (`super`). This
     * is the single seam the whole shipped detection engine rides.
     */
    getConcealment(): ConcealmentLevel {
      if (this.hiding) return this.hiddenLevel;
      return super.getConcealment();
    }

    /**
     * No durable found-memory while hiding (a fresh contest per hide); the
     * authored (non-hiding) key stands via `super`.
     */
    getDiscoveryKey(): string | undefined {
      if (this.hiding) return undefined;
      return super.getDiscoveryKey();
    }
  };
}
