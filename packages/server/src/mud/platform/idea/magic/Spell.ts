/**
 * Spell — one authored cast as a pure-data leaf Idea.
 *
 * A spell is **data, never a bespoke class** (the `Discipline`/`Topic`
 * recipe): a leaf template under `/stuff/idea/magic/Spell/<spellId>`, read by
 * the `SpellCatalogue` directly from `template.data` at boot (never
 * cloned as live Stuff), keyed on the durable `spellId`.
 *
 * The shape is the trigger-agnostic envelope from the magic slate:
 * `{ cost, castSeconds, targeting, effects[] }` under a **grid address**
 * (`verb` × `noun` — the two advancement Disciplines the cast draws on
 * and credits). What a spell *does* is its `effects` — members of the
 * closed `Effect` union, each a thin wrapper over a shipped gated Api
 * (the governing invariant; `MagicEffects.validate` makes anything else
 * unrepresentable). Access is a **band gate at cast time** on BOTH axes
 * (`requiredBand` vs `AdvancementApi.bandFor` — competence IS access;
 * conferral-of-verbs is deliberately not used; see magic.md).
 *
 * Deliberately NOT a Mongo collection (the Atlas 500-collection ceiling
 * + no per-row mutation): authored seeds ride the `content` collection as
 * templates like every other leaf roster.
 */

import { Idea } from '../../../lib/stuff/Idea';
import type { CastingProfile } from '../../../lib/magic/CastingProfile';
import type { Effect, EffectFamily } from '../../../lib/magic/Effect';
import type { MagicNoun, MagicVerb } from '../../../lib/magic/Grid';
import type { FieldMeta } from '../../../lib/mixin';

/** What a cast aims at (`any` = object or creature, target optional). */
export const SPELL_TARGETINGS = [
  'none',
  'self',
  'object',
  'creature',
  'any',
] as const;

/** A targeting mode — one of {@link SPELL_TARGETINGS}. */
export type SpellTargeting = (typeof SPELL_TARGETINGS)[number];

/**
 * The runtime descriptor the catalogue caches — a validated projection of
 * a Spell template's `data` (never the Stuff instance). `effects` have
 * passed `MagicEffects.validate`; `family` is derived from them
 * (modifier iff any effect installs a sustained hold).
 */
export interface SpellDescriptor {
  /**
   * **The durable key** — this spell's template path
   * (`/stuff/idea/magic/Spell/<id>`, or a pack's own extent). Every stored
   * reference to a working uses THIS, never {@link spellId}: the path is
   * namespaced and packs claim path extents, so two packs shipping a
   * `firebolt` stay distinct by construction.
   */
  path: string;
  /**
   * The **short name**, for players to type and for display. Deliberately
   * NOT unique across packs — ambiguity here is a disambiguation problem,
   * exactly as two items sharing a keyword is.
   */
  spellId: string;
  name: string;
  verb: MagicVerb;
  noun: MagicNoun;
  /**
   * The **caster-assuming** half — competence gate + shaping time. An
   * item path reads `cost`, `targeting`, `effects` and `durationSeconds`
   * and **ignores this whole object**, rather than silently ignoring two
   * fields that happened not to apply. See requirements D3.
   */
  castingProfile: CastingProfile;
  /** Energy required, absolute pt. Trigger-neutral — an item pays it too. */
  cost: number;
  targeting: SpellTargeting;
  effects: Effect[];
  /**
   * **What this working does at the low and high ends of its own axis.**
   *
   * Built from the SAME authored blobs as {@link effects} — an author
   * writes band-varying fields inline (`energy: [1, 2, 4]`,
   * `steps: [-1, 1, 1]`) and validation resolves one list per band. So
   * there is no duplicated effect data and no second catalogue entry;
   * see `MagicEffects.validateForBand`.
   *
   * Read only through the ITEM door: a caster has no BUC, so a cast
   * always fires {@link effects}. That is the honest reading of "spells
   * are spells and items are items" — potency is an instrument fact.
   */
  cursedEffects: Effect[];
  blessedEffects: Effect[];
  family: EffectFamily;
  /** Sustained (modifier) lifetime, game-seconds; 0 = until dispelled. */
  durationSeconds: number;
  description: string;
}

export default class Spell extends Idea {
  /** Per-instance template path prefix: `/stuff/idea/magic/Spell/<spellId>`. */
  /** The class every Spell row names — what the catalogue warms by. */
  static readonly CLASS_PATH = '/platform/idea/magic/Spell';

  /** Durable join key (e.g. `'firebolt'`). Non-empty. */
  public spellId: string = '';
  /** Friendly display name. */
  public name: string = '';
  /** The grid verb axis (an advancement Discipline `magic-<verb>`). */
  public verb: string = '';
  /** The grid noun axis (an advancement Discipline `magic-<noun>`). */
  public noun: string = '';
  /**
   * The caster-assuming half — `{requiredBand, castSeconds}`. An item
   * trigger ignores it wholesale (D3). Plain scalars → persists free.
   */
  public castingProfile: Record<string, unknown> = {};
  /** Energy required (absolute pt; the `magic.costDefault` dial when 0). */
  public cost: number = 0;
  /** Targeting mode. */
  public targeting: string = 'none';
  /** The declarative effect list (validated by the catalogue on warm). */
  public effects: unknown[] = [];
  /** Sustained lifetime (game-seconds; 0 = until dispelled). */
  public durationSeconds: number = 0;
  /** Authored prose. */
  public description: string = '';

  /**
   * ⚠ **Deliberately untagged — every field here is level 0.**
   *
   * Recorded rather than left blank, because a spell's cost and
   * duration look exactly like the kind of number that got collapsed
   * on `Material` and `Biome`, and the next person to sweep will
   * reach for it.
   *
   * Magic in this world is a **published science**: one postulate, the
   * laws, and *the price list* (see docs/arcane-science.md). The price
   * being knowable is the premise. Collapsing what a spell costs would
   * not make casting more discoverable — it would contradict the
   * fiction that a caster can reason about the cost before paying it.
   *
   * If a particular spell's effect is a plot spoiler, that belongs on
   * the wiki PAGE (a `<spoiler>` in authored prose), not on the field
   * — the field level applies to every spell at once.
   */
  static fieldMeta: FieldMeta = {
    spellId: { persistent: true },
    name: { persistent: true },
    verb: { persistent: true },
    noun: { persistent: true },
    castingProfile: { persistent: true },
    cost: { persistent: true },
    targeting: { persistent: true },
    effects: { persistent: true },
    durationSeconds: { persistent: true },
    description: { persistent: true },
  };
}
