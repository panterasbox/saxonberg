/**
 * Effect — the closed, curated effect union: what a cast (or, later, a
 * quaffed potion / read scroll / sprung rune) *does*.
 *
 * **The one governing invariant:** an `Effect` primitive exists **iff**
 * a gated Api already does that work. Magic is a new *trigger*, never a
 * new *mechanism* — a fireball is legal because `ConditionApi.inflict`
 * exists and real combustion takes over; "gain 5 levels" is illegal
 * because no Api does it, and this closed union makes it
 * **unrepresentable** (`MagicEffects.validate` throws on any kind not
 * listed here). No backing Api → the code-trust-gated `script`
 * trapdoor, or go build the real system first. `transform` is
 * deliberately absent (no Api yet — polymorph's own build).
 *
 * Two families cut across the union — **impulse** (fire-and-resolve:
 * real now, can't un-happen, suppression never touches it) vs
 * **modifier** (installs a `SustainedEffect` condition the
 * reconcile-on-read drivers realize by pull; magic is still holding it
 * up, so suppression drops it). The family is *derived from the kind*
 * (shape in code), never authored.
 *
 * Executors live on `MagicLogic` (each a thin wrapper over its backing
 * Api); this module is the pure data shape + seed validation. The
 * trigger-agnostic envelope is the magic-items slate's "Gap 0" —
 * potions/scrolls/wands consume this same union later.
 */

import type { Channel } from '../material/Channel';
import { CHANNELS } from '../material/Channel';
import type { BlessingBand } from './Blessing';
import { Blessing } from './Blessing';
import type { ResistSpec } from './Resist';
import { Resists } from './Resist';

/** Impulse = fired-and-released; modifier = sustained, magically-bound. */
export type EffectFamily = 'impulse' | 'modifier';

/**
 * The two reserves an `adjust-reserve` may never top up. Literal here
 * (not imported from `Caster` / `Charge`) so the effect vocabulary stays
 * import-free of the casting substrate; `Caster.MANA_RESERVE_KEY` and
 * `Charge.RESERVE_KEY` are the same strings, pinned by test.
 */
export const MANA_RESERVE_KEY = 'mana';
export const CHARGE_RESERVE_KEY = 'charge';

/** Inject a real mechanism channel — backing: `ConditionApi.inflict` (heat at a body), `ThermalApi.depositHeat`+`FireApi.tryAutoignite` (heat at an object), `ElectricityApi.conduct` (shock, via a transient energized locus). */
export interface InjectChannelEffect {
  readonly kind: 'inject-channel';
  readonly channel: Channel;
  /** The channel-axis energy token a body-target inflict folds (the
   * materials-response magnitude the covering stack attenuates). */
  readonly energy?: number;
  /** The shock potential (V) a spark imposes on its transient locus. */
  readonly voltage?: number;
  /** Real thermal joules an OBJECT-target heat injection deposits
   * (`ThermalApi.depositHeat` + `FireApi.tryAutoignite`) — authored
   * separately from `energy` because the two branches speak different
   * physical scales. */
  readonly joules?: number;
  readonly site?: string;
  readonly resist?: ResistSpec;
  /**
   * **Land this on the ACTOR, not the target** — the backfire flag.
   *
   * Distinct from the shipped `target ?? ctx.actor` fallback, which only
   * fires when nothing was aimed at. This one redirects *deliberately*,
   * even with a target in hand, which is what "a cursed wand goes off in
   * your face" requires. Pair it with {@link bands} to make it the low
   * end of a working's own axis.
   */
  readonly self?: boolean;
}

/** Install an authored condition — backing: `Vitals.afflict`. */
export interface AfflictEffect {
  readonly kind: 'afflict';
  /** The Condition seed's templatePath (`/platform/idea/Condition/magic/dread`). */
  readonly conditionPath: string;
  readonly resist?: ResistSpec;
  /** Land it on the ACTOR — see {@link InjectChannelEffect.self}. */
  readonly self?: boolean;
}

/** Remove magic — backing: `Vitals.relieve`, **tag-keyed only** (scans for `magicOrigin`, structurally unable to touch a laceration). */
export interface RelieveEffect {
  readonly kind: 'relieve';
  /** Optional grid filter — dispel only matching cells. */
  readonly verb?: string;
  readonly noun?: string;
}

/** Move a reserve — backing: `Reserved.adjustReserve`. `delta` in the reserve's own unit (mana: pt). */
export interface AdjustReserveEffect {
  readonly kind: 'adjust-reserve';
  readonly reserveKey: string;
  readonly delta: number;
}

/**
 * **Shift an item along its own BUC axis** — backing:
 * `Blessable.setBlessing` + `revealBlessing`.
 *
 * The first effect kind that addresses an **item's durable state**
 * rather than a creature or the world, and the mechanism behind
 * remove-curse.
 *
 * `steps` is a signed **displacement** in bands, clamped to the band
 * range — `+1` lifts a curse, `-1` lays one. A displacement rather than
 * a destination because BUC is itself defined as "a displacement from
 * the ordinary" ({@link Blessing}), and because one mechanism then
 * serves both directions without a second kind.
 *
 * ⚠ **This is `control`, not `destroy`.** A curse here is not another
 * caster's working laid over the thing — it is the item's own potency
 * one notch down, so lifting it *changes a parameter of a thing that
 * remains itself*, which is what `control` means on the grid. `dispel`
 * (`relieve`) cannot reach it, and should not: it scans for
 * `magicOrigin` conditions on a **body**. See `arcane-science.md` §
 * The five verbs.
 */
export interface AdjustBlessingEffect {
  readonly kind: 'adjust-blessing';
  /**
   * **An MQL query naming the SET this acts on**, instead of the single
   * aimed target. Band-varying like any other field, which is how a
   * working expresses "more of the same act" at its high end:
   *
   * ```yaml
   * scope: [null, null, 'inventory:[mixin.BlessableMixin]']
   * ```
   *
   * Absent ⇒ the aimed target, unchanged. Resolved against the ACTOR
   * (`commandGiver`), so `inventory` means *the reader's* pack.
   *
   * This is the honest high end for a working whose identity is "remove
   * curses": removing MORE curses is unmistakably more of the same act
   * and cannot drift into being a different one.
   */
  readonly scope?: string;
  /** Signed band displacement; `+1` lifts a curse. Clamped. */
  readonly steps: number;
  /**
   * **How far this working may push, in the direction it travels.**
   *
   * A cure *restores*; it does not *improve*. Without this bound,
   * `steps: +1` on an ordinary item blesses it, and remove-curse
   * becomes a cheap route to blessed gear that you cast on everything
   * you own. `limit: 'uncursed'` says "walk it back up to ordinary and
   * stop", which is what a cure means.
   *
   * Consecrating something past ordinary is a *different* working with
   * a different cost, and it declares `limit: 'blessed'`. Authoring the
   * ceiling rather than hardcoding it is what keeps one mechanism
   * serving both.
   *
   * Absent ⇒ the full band range.
   */
  readonly limit?: BlessingBand;
}

/** Body control — backing: the posture surface (shove→prone) / the timed body-slot hold (pin). No combat machinery. */
export interface MoveEffect {
  readonly kind: 'move';
  readonly move: 'shove' | 'pin';
  readonly resist?: ResistSpec;
  /** Land it on the ACTOR — see {@link InjectChannelEffect.self}. */
  readonly self?: boolean;
}

/** Bring Stuff or bulk into being — backing: `StuffApi.clone`+`ContainmentApi.move` (Stuff) / `BulkableApi.transfer` from an unbounded source (bulk). */
export interface ConjureEffect {
  readonly kind: 'conjure';
  /** Clone this template… */
  readonly templatePath?: string;
  /** …or transfer this bulk material (litres from the magic.* dial when absent). */
  readonly bulkMaterial?: string;
  readonly litres?: number;
}

/**
 * Read-only reveal. Two senses, both backed by a shipped read:
 *
 * - **`detect-magic`** — the `magicOrigin` tag scan.
 * - **`identify-item`** — a **write to the reader's own belief store**
 *   (`IDENTIFICATION` realm), never a message (requirements D24). It
 *   does not examine anything cleverly and it is not oracular: it is the
 *   *paid shortcut past experiment* — the thing you buy instead of
 *   drinking the unknown flask to find out.
 */
export interface SenseEffect {
  readonly kind: 'sense';
  /**
   * `misidentify` is the **false-belief** case: it writes a confident
   * record naming the WRONG thing. Strictly worse than no information,
   * because you will act on it — and the only thing in the game that
   * exercises the belief store's capacity to hold something untrue.
   */
  readonly sense: 'detect-magic' | 'identify-item' | 'misidentify';
  /** See {@link AdjustBlessingEffect.scope}. */
  readonly scope?: string;
}

/** Imposed semblance — backing: `Disguisable.setDisguise`. Modifier-bound (the veil is held up). */
export interface CloakEffect {
  readonly kind: 'cloak';
  readonly disguise: string;
}

/** A sustained field — backing: a conjured bound emitter (`GlowlightOrb`) realized by the `SustainedEffect` reconcile arm. */
export interface EmitFieldEffect {
  readonly kind: 'emit-field';
  readonly field: 'light';
}

/** The exotic 5% — backing: the scripting interpreter, **code-trust (`isWizard`) gated** at execution. */
export interface ScriptEffect {
  readonly kind: 'script';
  readonly source: string;
}

/** The closed union. Growing it means shipping the backing Api first. */
export type Effect =
  | InjectChannelEffect
  | AfflictEffect
  | RelieveEffect
  | AdjustReserveEffect
  | AdjustBlessingEffect
  | MoveEffect
  | ConjureEffect
  | SenseEffect
  | CloakEffect
  | EmitFieldEffect
  | ScriptEffect;

/** The known effect kinds (validation vocabulary). */
export const EFFECT_KINDS = [
  'inject-channel',
  'afflict',
  'relieve',
  'adjust-reserve',
  'adjust-blessing',
  'move',
  'conjure',
  'sense',
  'cloak',
  'emit-field',
  'script',
] as const;

/** Thin static holder — family derivation + seed validation. */
export class MagicEffects {
  /**
   * **Does this effect need a mark to do anything at all?**
   *
   * Derived from the kind, like {@link familyOf} — never authored. An
   * `inject-channel` with nothing to inject into is a no-op; a `conjure`
   * with no target pools on the floor, which is a perfectly good
   * outcome.
   *
   * Read by the **shape gate**, which runs *before* anything is spent.
   * Without it, `targeting: 'any'` (which permits a missing target)
   * lets a working reach its executor, refuse there for want of a mark,
   * and leave the caster's mana — or a wand's charge — already gone.
   * Live-driving found exactly that: 45 targetless zaps flattened a
   * 900 kJ wand as thoroughly as 45 real ones.
   */
  public static needsTarget(effect: Effect): boolean {
    // A SCOPED effect finds its own subjects, so there is nothing to
    // aim. Without this a blessed remove curse — which sweeps your whole
    // pack — refused for want of a mark it never needed.
    if (typeof (effect as { scope?: string }).scope === 'string') return false;
    switch (effect.kind) {
      // These act ON something. With nothing to act on there is no
      // effect to have, and no reason to charge for one.
      case 'inject-channel':
      case 'afflict':
      case 'move':
      case 'adjust-blessing':
        return true;
      // These are fine — or better — without a mark. Conjured water
      // pools on the floor; a sense sweeps the scene; a cloak, a field
      // and a script all act on the actor or the world.
      case 'relieve':
      case 'adjust-reserve':
      case 'conjure':
      case 'sense':
      case 'cloak':
      case 'emit-field':
      case 'script':
        return false;
    }
  }

  /**
   * Does a spell need a mark? True only when **every** effect does — a
   * spell that would still do *something* useful untargeted is allowed
   * to fire untargeted, and the effects that wanted a mark report their
   * own miss.
   */
  public static everyEffectNeedsTarget(effects: readonly Effect[]): boolean {
    return effects.length > 0 && effects.every(MagicEffects.needsTarget);
  }

  /**
   * The impulse/modifier line, derived from the kind: `emit-field` and
   * `cloak` install a sustained hold (suppressible); everything else is
   * fired-and-released.
   */
  public static familyOf(effect: Effect): EffectFamily {
    return effect.kind === 'emit-field' || effect.kind === 'cloak'
      ? 'modifier'
      : 'impulse';
  }

  /**
   * Parse one authored effect blob from a spell seed. Throws on an
   * unknown kind or malformed fields — the structural enforcement of
   * the governing invariant ("gain 5 levels" cannot parse).
   */
  /**
   * **Band-varying authored fields** — the mechanism behind
   * "the item owns the effect-as-a-function-of-potency".
   *
   * Any scalar field of an authored effect may be written as an ordered
   * 2- or 3-step list instead of a value, and the band picks one:
   *
   * ```yaml
   * - kind: inject-channel
   *   channel: heat
   *   energy: [1, 2, 4]          # cursed · uncursed · blessed
   * ```
   *
   * The engine owns **only the ordering** (`Blessing.pick`, which is why
   * an author cannot get it backwards); the *meaning* of each step is the
   * working's own. That is the slate's contract, and the reason there is
   * no global potency constant: a blanket multiplier made every cursed
   * item identical AND unobservable, when the whole point of magic is
   * that each one is its own thing.
   *
   * Scalars, enums and paths all work, so this covers magnitude
   * (`energy: [1,2,4]`), scope, count, and outright sign inversion
   * (`steps: [-1, 1, 1]` — a cursed remove-curse that *curses*).
   *
   * No effect field is legitimately array-valued, so a bare list is
   * unambiguous. Resolution happens ONCE, here at validation, so every
   * executor keeps receiving a concrete `Effect` and none of them learn
   * about bands.
   */
  private static forBand(raw: unknown, band: BlessingBand): unknown {
    if (!raw || typeof raw !== 'object') return raw;
    const blessing = Blessing.of(band);
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      out[k] =
        Array.isArray(v) && v.length >= 2 && v.length <= 3
          ? Blessing.pick(blessing, v)
          : v;
    }
    return out;
  }

  /**
   * Parse one authored effect **as a given band would fire it**. The
   * band-aware sibling of {@link validate}; `validate` itself is the
   * `uncursed` case, which is what a CAST uses (a caster has no BUC).
   */
  public static validateForBand(raw: unknown, band: BlessingBand): Effect {
    return MagicEffects.validate(MagicEffects.forBand(raw, band));
  }

  public static validate(raw: unknown): Effect {
    const e = MagicEffects.forBand(raw, 'uncursed') as Record<string, unknown>;
    const kind = e?.kind;
    if (
      typeof kind !== 'string' ||
      !(EFFECT_KINDS as readonly string[]).includes(kind)
    ) {
      throw new TypeError(`effect: unknown kind '${String(kind)}'`);
    }
    const resist =
      e.resist === undefined ? undefined : Resists.validate(e.resist);
    switch (kind as Effect['kind']) {
      case 'inject-channel': {
        const channel = e.channel;
        if (
          typeof channel !== 'string' ||
          !(CHANNELS as readonly string[]).includes(channel)
        ) {
          throw new TypeError(
            `inject-channel: unknown channel '${String(channel)}'`,
          );
        }
        return {
          self: e.self === true ? true : undefined,
          kind: 'inject-channel',
          channel: channel as Channel,
          energy: MagicEffects.optNumber(e.energy, 'energy'),
          voltage: MagicEffects.optNumber(e.voltage, 'voltage'),
          joules: MagicEffects.optNumber(e.joules, 'joules'),
          site: MagicEffects.optString(e.site, 'site'),
          resist,
        };
      }
      case 'afflict': {
        const conditionPath = e.conditionPath;
        if (typeof conditionPath !== 'string' || !conditionPath.startsWith('/')) {
          throw new TypeError(
            `afflict: bad conditionPath '${String(conditionPath)}'`,
          );
        }
        return {
          kind: 'afflict',
          conditionPath,
          resist,
          self: e.self === true ? true : undefined,
        };
      }
      case 'relieve':
        return {
          kind: 'relieve',
          verb: MagicEffects.optString(e.verb, 'verb'),
          noun: MagicEffects.optString(e.noun, 'noun'),
        };
      case 'adjust-reserve': {
        const reserveKey = e.reserveKey;
        const delta = Number(e.delta);
        if (typeof reserveKey !== 'string' || reserveKey.length === 0) {
          throw new TypeError(`adjust-reserve: bad reserveKey`);
        }
        if (!Number.isFinite(delta)) {
          throw new TypeError(`adjust-reserve: bad delta '${String(e.delta)}'`);
        }
        // The two coupled reserves are not fillable by fiat, and the
        // refusal lands at AUTHORING so the catalogue drops the row:
        // mana is recovered through metabolism, never given
        // (arcane-science — no amount of fuel becomes mana; a potion
        // feeds satiation instead); charge crosses from a payer through
        // the coupling loss (`transferCharge`), never appears.
        if (delta > 0 && reserveKey === MANA_RESERVE_KEY) {
          throw new TypeError(
            `adjust-reserve: a positive delta on '${MANA_RESERVE_KEY}' is a mana ` +
              `generator — arcane-science forbids it; feed satiation instead`,
          );
        }
        if (delta > 0 && reserveKey === CHARGE_RESERVE_KEY) {
          throw new TypeError(
            `adjust-reserve: a positive delta on '${CHARGE_RESERVE_KEY}' mints ` +
              `joules — charge is transferred from a payer (transfer), never generated`,
          );
        }
        return { kind: 'adjust-reserve', reserveKey, delta };
      }
      case 'adjust-blessing': {
        const steps = Number(e.steps);
        if (!Number.isFinite(steps) || !Number.isInteger(steps)) {
          throw new TypeError(
            `adjust-blessing: bad steps '${String(e.steps)}'`,
          );
        }
        if (steps === 0) {
          // A zero displacement is a working that costs mana to do
          // nothing. Almost certainly an authoring slip, and cheap to
          // refuse at parse time.
          throw new TypeError('adjust-blessing: steps must be non-zero');
        }
        const scope = typeof e.scope === 'string' ? e.scope : undefined;
        const limit = e.limit;
        if (limit === undefined) {
          return { kind: 'adjust-blessing', steps, scope };
        }
        if (typeof limit !== 'string' || !Blessing.isBand(limit)) {
          throw new TypeError(
            `adjust-blessing: unknown limit band '${String(limit)}'`,
          );
        }
        return { kind: 'adjust-blessing', steps, limit, scope };
      }
      case 'move': {
        const move = e.move;
        if (move !== 'shove' && move !== 'pin') {
          throw new TypeError(`move: unknown move '${String(move)}'`);
        }
        return {
          kind: 'move',
          move,
          resist,
          self: e.self === true ? true : undefined,
        };
      }
      case 'conjure': {
        const templatePath = MagicEffects.optString(
          e.templatePath,
          'templatePath',
        );
        const bulkMaterial = MagicEffects.optString(
          e.bulkMaterial,
          'bulkMaterial',
        );
        if (!templatePath && !bulkMaterial) {
          throw new TypeError(
            'conjure: needs templatePath or bulkMaterial',
          );
        }
        return {
          kind: 'conjure',
          templatePath,
          bulkMaterial,
          litres: MagicEffects.optNumber(e.litres, 'litres'),
        };
      }
      case 'sense': {
        if (
          e.sense !== 'detect-magic' &&
          e.sense !== 'identify-item' &&
          e.sense !== 'misidentify'
        ) {
          throw new TypeError(`sense: unknown sense '${String(e.sense)}'`);
        }
        return {
          kind: 'sense',
          sense: e.sense,
          scope: typeof e.scope === 'string' ? e.scope : undefined,
        };
      }
      case 'cloak': {
        const disguise = e.disguise;
        if (typeof disguise !== 'string' || disguise.length === 0) {
          throw new TypeError('cloak: needs a disguise');
        }
        return { kind: 'cloak', disguise };
      }
      case 'emit-field': {
        if (e.field !== 'light') {
          throw new TypeError(`emit-field: unknown field '${String(e.field)}'`);
        }
        return { kind: 'emit-field', field: 'light' };
      }
      case 'script': {
        const source = e.source;
        if (typeof source !== 'string' || source.length === 0) {
          throw new TypeError('script: needs source');
        }
        return { kind: 'script', source };
      }
    }
  }

  private static optNumber(v: unknown, field: string): number | undefined {
    if (v === undefined || v === null) return undefined;
    const n = Number(v);
    if (!Number.isFinite(n)) {
      throw new TypeError(`effect: bad ${field} '${String(v)}'`);
    }
    return n;
  }

  private static optString(v: unknown, field: string): string | undefined {
    if (v === undefined || v === null) return undefined;
    if (typeof v !== 'string' || v.length === 0) {
      throw new TypeError(`effect: bad ${field}`);
    }
    return v;
  }
}
