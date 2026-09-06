/**
 * OrganismMixin — biological identity for an actor or in-world Thing.
 *
 * Composing this mixin says: "this Stuff is a member of a species and
 * carries the biological state that follows from that — age, lifecycle
 * state, optionally sex." Avatars compose it via Character (so every
 * player is an Organism). Plant-Things, NPC-fauna, and similar in-world
 * Stuff compose it on their own concrete class.
 *
 * Detached tissue is NOT an Organism. The apple-on-the-ground case is
 * Tangible (made of fruit-flesh) but not Organism — its parent tree is
 * the organism, the apple is bulk material. (See race.md.)
 *
 * **Cross-reference shape (LOCKED).** `_speciesPath` is the persistent
 * field; `getSpecies()` resolves on each call via
 * `StuffApi.findByTemplatePath`. HMR-safe; no instance cache.
 *
 * Sex delegation: `getSex()` checks `MixinApi.isSexed(this)` and
 * delegates to the SexedMixin surface when composed. Hosts that don't
 * compose `SexedMixin` (e.g. v1 plants) get `null`.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import { StuffApi } from '../../api/stuff';
import { MixinApi } from '../../api/mixin';
import type { Stuff } from '../stuff/Stuff';
import { WorldClockApi } from '../../api/worldclock';
import { TemplatePaths } from '../paths';
import type Species from '../../platform/idea/species/Species';
import type { LifeStage } from '../../platform/idea/species/Species';

const SECONDS_PER_GAME_DAY = 86_400;

export interface Organism {
  getSpecies(): Species | null;
  setSpecies(value: Species | null): void;
  getAge(): number;
  /** Back-date the birthday so this body is `value` game days old. */
  setAge(value: number): void;
  /** ⭐ Game-seconds this organism was born; `0` = unknown. */
  getBornAt(): number;
  setBornAt(value: number): void;
  /** ⭐ Game-seconds it died; `0` while it lives. The dead stop ageing. */
  getDiedAt(): number;
  /** Age in GAME DAYS — `(diedAt ?? now) − bornAt`, derived, never stored. */
  getAgeDays(): number;
  /**
   * The life stage, or `null`. ⚠⚠ **Always `null` for a body somebody
   * plays** — a player's age is seniority and must never be an input to
   * a capability. Also `null` for a species with no authored curve.
   */
  getLifeStage(): LifeStage | null;
  /** Has it reached breeding age? `false` when unmodelled or played. */
  isMature(): boolean;
  getLifecycleState(): string;
  setLifecycleState(value: string): void;
  /** Lifecycle predicates — the organism answers for its own state. */
  isAlive(): boolean;
  isDead(): boolean;
  isUndead(): boolean;
  isPowered(): boolean;
  /** Runs living processes? Neither `!isDead()` nor `isAlive()` — see impl. */
  isLivingBody(): boolean;
  getSex(): string | null;
}

export function OrganismMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class OrganismMixin extends Base {
    static _mixinName = 'OrganismMixin';
    static fieldMeta: FieldMeta = {
      _speciesPath: { persistent: true, authorable: true, authorPicker: 'Species' },
      bornAt: { persistent: true, authorable: true },
      diedAt: { persistent: true },
      lifecycleState: { persistent: true, runtimeState: true },
    };

    /**
     * Path to the Species singleton this organism belongs to. Resolved
     * lazily on each getSpecies() call so HMR replacement is observed
     * immediately.
     */
    public _speciesPath: string | null = null;

    /**
     * ⭐⭐ **The birthday — a DATE, in game-seconds, and not a counter.**
     *
     * Age is `now − bornAt`, derived on read and stored nowhere. That is
     * not a micro-optimisation; it is what makes the whole question
     * behave:
     *
     *  - ⚠ **There is nothing to farm.** An accumulating counter rewards
     *    leaving a character logged in, or logged out, or simply
     *    existing — which is why the first cut needed an absence guard
     *    and a debate about whose clock stops. Arithmetic on a fixed date
     *    has no such question: you are as old as the world is, minus when
     *    you arrived, and no amount of parking changes the subtraction.
     *  - ⭐ **A long absence is a non-event**, so `reconcileAge` and its
     *    far-past guard are both gone. Nothing to integrate, nothing to
     *    drop, no stepped walk to bound.
     *  - ⭐ It is the same primitive the herdbook already uses for a head
     *    born into the record (`HeadOverlay.bornAt`), so a lamb and a
     *    person are old in one way.
     *
     * `0` means unknown — a fixture, or a body nobody dated.
     */
    public bornAt: number = 0;

    /**
     * Game-seconds this organism died, or `0` while it lives.
     *
     * ⭐ **The dead do not get older**, which a counter got right by
     * skipping and a derive has to get right by remembering: a corpse's
     * age is the age it died at, which is exactly what a forensic read of
     * one is asking. Stamped by {@link setLifecycleState}, so every path
     * into `dead` records it without a second call to forget.
     */
    public diedAt: number = 0;

    /**
     * Current lifecycle state — one of the species' valid set
     * (`'alive'`, `'dead'`, `'undead'`, `'powered'`, `'unpowered'`,
     * `'destroyed'`). Initial value lives on the leaf template's
     * `data` per slate. Empty default keeps unhydrated test fixtures
     * trivially constructable.
     *
     * **This field IS persisted** — it is declared in `persistentFields`
     * above, so `PersistableApi.capture` writes it and `materialize`
     * restores it. (It formerly carried an `@runtimeState` tag, which is a
     * doc marker only and filters nothing; the tag read as a promise the
     * persistence layer never made.)
     *
     * The consequence a persistence host must respect: **a player body must
     * never let `'dead'` round-trip.** A restored dead body cannot act —
     * `requiresAnimate` refuses every verb — and the state is itself
     * persisted, so the next login restores it again, forever. A host that
     * can die records its death on its *identity* instead (see
     * `Avatar.mortalArc` and `lib/mortality/MortalArc.ts`), which always has
     * a way back. Non-player organisms are unaffected: a dead plant or beast
     * legitimately persists as dead, because nothing is waiting to re-enter
     * it.
     *
     * Reading it: a survival driver asking "should I run?" wants
     * `isLivingBody()`, which is neither `isAlive()` nor `!isDead()` — see
     * that predicate for why both of the obvious spellings are wrong.
     */
    public lifecycleState: string = '';

    public getSpecies(): Species | null {
      if (!this._speciesPath) return null;
      return StuffApi.findByTemplatePath<Species>(this._speciesPath) ?? null;
    }

    public setSpecies(value: Species | null): void {
      this._speciesPath = value?.getTemplatePath() ?? null;
    }

    public getBornAt(): number { return this.bornAt; }
    public setBornAt(value: number): void {
      this.bornAt = Number.isFinite(value) && value > 0 ? value : 0;
    }

    public getDiedAt(): number { return this.diedAt; }

    /**
     * Age in **game days** — derived, never stored.
     *
     * ⭐ Days rather than years because the curve is authored in days and
     * a lamb's whole juvenile period is shorter than a year: years would
     * round the interesting part of every ruminant's life to zero.
     *
     * ⚠ A body with no birthday reads `0` rather than guessing. Unknown
     * is a real answer.
     */
    public getAgeDays(): number {
      if (this.bornAt <= 0) return 0;
      const end = this.diedAt > 0 ? this.diedAt : nowSeconds();
      if (end <= 0) return 0;
      return Math.max(0, (end - this.bornAt) / SECONDS_PER_GAME_DAY);
    }

    public getAge(): number { return this.getAgeDays(); }

    /**
     * Set the age directly, in game days — sugar that back-dates the
     * birthday. ⚠ Kept because *"this animal is about four hundred days
     * old"* is how a herd is founded and how a fixture is written; the
     * stored fact is still the date.
     */
    public setAge(value: number): void {
      const now = nowSeconds();
      if (now <= 0) return;
      this.bornAt = Math.max(1, now - Math.max(0, value) * SECONDS_PER_GAME_DAY);
    }

    /**
     * The species' life stage at this age, or `null`.
     *
     * ⚠⚠ **`null` for a body somebody PLAYS, always — and that is the
     * whole of the player/NPC split.**
     *
     * A player and an innkeeper can be the same species row, so the
     * curve cannot be what tells them apart. What tells them apart is
     * that **we do not model a player character's biological arc**: their
     * age is seniority, a thing to say out loud, and it must never become
     * an input to a capability. If it did, the reward for leaving a
     * character parked would be real, and that is the one outcome this
     * design exists to refuse.
     *
     * ⭐ The number stays readable — `getAgeDays()` answers for anybody,
     * because a birthday is worth celebrating. It is the CONSEQUENCE
     * that stops here.
     *
     * For everyone else the ordinary rule holds: `null` also means the
     * species has no authored curve, which is *this species does not age
     * in this game* rather than *it ages instantly*.
     */
    public getLifeStage(): LifeStage | null {
      if (MixinApi.isHasInteractive(this as unknown as Stuff)) return null;
      const species = this.getSpecies();
      if (!species) return null;
      return species.lifeStageAt(this.getAgeDays());
    }

    public isMature(): boolean {
      const stage = this.getLifeStage();
      return stage === 'adult' || stage === 'aged';
    }

    public getLifecycleState(): string { return this.lifecycleState; }

    /**
     * ⚠ Stamps {@link diedAt} on the way into `dead`, so a corpse's age
     * freezes at the age it died. Every path into death goes through
     * here, which is why the stamp lives on the setter rather than in
     * the one caller that remembered.
     */
    public setLifecycleState(value: string): void {
      if (value === 'dead' && this.lifecycleState !== 'dead' && this.diedAt === 0) {
        this.diedAt = nowSeconds();
      }
      this.lifecycleState = value;
    }

    /* Lifecycle predicates — object-owned sugar over `lifecycleState`
     * (the `destroyed` state has no predicate here: `isDestroyed` is
     * Stuff's own lifecycle method; compare `getLifecycleState()`
     * directly for the organism-state reading). */
    public isAlive(): boolean { return this.lifecycleState === 'alive'; }
    public isDead(): boolean { return this.lifecycleState === 'dead'; }

    /**
     * Does this body run **living processes** — metabolism, respiration,
     * thermoregulation? The question every survival driver actually asks.
     *
     * It is deliberately neither of the two obvious spellings:
     *
     * - **not `!isDead()`** — `undead` is animate without being alive, so a
     *   shade would starve, suffocate, and freeze. That was the bug this
     *   predicate exists to prevent.
     * - **not `isAlive()`** — `lifecycleState` defaults to the empty string,
     *   and an unhydrated body (a fixture, a partially-constructed clone)
     *   carries it. The drivers have always treated unset as living, and
     *   flipping that silently switches metabolism off for anything whose
     *   state was never authored.
     *
     * So: everything runs living processes except the two states that
     * explicitly mean it does not.
     */
    public isLivingBody(): boolean {
      return this.lifecycleState !== 'dead' && this.lifecycleState !== 'undead';
    }
    public isUndead(): boolean { return this.lifecycleState === 'undead'; }
    public isPowered(): boolean { return this.lifecycleState === 'powered'; }

    /**
     * Sex default — `null` for biology-only organisms (v1 plants,
     * Constructa, raw Animalia without SexedMixin). When the host
     * composes `SexedMixin` (Item 7), that mixin's `getSex()` shadows
     * this default through the standard mixin override chain.
     */
    public getSex(): string | null {
      return null;
    }
  };
}

/**
 * Game-seconds now, or `0` before there is a world clock (fixtures,
 * pre-boot). ⚠ `0` reads as *unknown age*, never as *newborn*.
 */
function nowSeconds(): number {
  if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) return 0;
  return WorldClockApi.getNow().rawValue();
}
