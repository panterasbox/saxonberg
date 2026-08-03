/**
 * Spell — one authored cast as a pure-data leaf Idea.
 *
 * A spell is **data, never a bespoke class** (the `Discipline`/`Topic`
 * recipe): a leaf template under `/obj/magic/Spell/<spellId>`, read by
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
 * + no per-row mutation): authored seeds ride the `domain` collection as
 * templates like every other leaf roster.
 */

import { Idea } from '../../lib/stuff/Idea';
import { TemplatePathPrefixes } from '../../lib/paths';
import type { CastingProfile } from '../../lib/magic/CastingProfile';
import type { Effect, EffectFamily } from '../../lib/magic/Effect';
import type { MagicNoun, MagicVerb } from '../../lib/magic/Grid';
import type { FieldMeta } from '../../lib/mixin';

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
  family: EffectFamily;
  /** Sustained (modifier) lifetime, game-seconds; 0 = until dispelled. */
  durationSeconds: number;
  description: string;
}

export default class Spell extends Idea {
  /** Per-instance template path prefix: `/obj/magic/Spell/<spellId>`. */
  static readonly TEMPLATE_PATH_PREFIX = TemplatePathPrefixes.spell;

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
