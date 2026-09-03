/**
 * SpellCatalogue — singleton Idea owning the warmed spell roster: the
 * authored casts the magic substrate executes.
 *
 * Lives at `/platform/idea/SpellCatalogue` (the `DisciplineCatalogue` /
 * `CorpoCatalogue` recipe verbatim): the cache is transient instance
 * state; the source of truth is the per-Spell leaf templates under
 * `/stuff/idea/magic/Spell/` in the `content` collection, read directly from
 * `template.data` at boot — never cloned as live Stuff.
 *
 * Warm-time validation is the **structural half of the governing
 * invariant**: every authored effect must parse against the closed
 * `Effect` union (`MagicEffects.validate`) and every grid address must
 * be a real verb × noun — a spell that fails is dropped (and the seeds
 * test fails loudly at authoring time), so an unbacked effect never
 * reaches the executor.
 *
 * Keyed on the durable `spellId`; `byCell` is a secondary index for the
 * `spells` self-view. Not a persisted record. The seed YAML is
 * `{ class: /platform/idea/SpellCatalogue, data: {} }`.
 */

import { Idea } from '../../lib/stuff/Idea';
import { PostRegistrationMixin } from '../../lib/stuff/PostRegistration';
import { Template } from '../../lib/stuff/Template';
import Spell, {
  SPELL_COST_MODELS,
  SPELL_TARGETINGS,
  type SpellCostModel,
  type SpellDescriptor,
  type SpellTargeting,
} from './magic/Spell';
import { MagicEffects, type Effect } from '../../lib/magic/Effect';
import type { BlessingBand } from '../../lib/magic/Blessing';
import { MagicGrid } from '../../lib/magic/Grid';
import { CastingProfiles } from '../../lib/magic/CastingProfile';
import type { CastingProfile } from '../../lib/magic/CastingProfile';
import type { VetoResult } from '../../lib/errors';
import type { EvictionContext } from '../../lib/stuff/Stuff';

const SpellCatalogueBase = PostRegistrationMixin(Idea);

export default class SpellCatalogue extends SpellCatalogueBase {
  /** Residency veto — a load-bearing process-lifetime singleton. */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }

  /**
   * **The durable index: template PATH → descriptor.**
   *
   * Keyed on the path rather than the `spellId` field because the path
   * is the namespaced key and the id is not. Spell templates already
   * live at `/stuff/idea/magic/Spell/<id>`, and packs claim path *extents* — so
   * two packs shipping a `firebolt` are `/pack-a/…/firebolt` and
   * `/pack-b/…/firebolt`, distinct by construction. Collapsing both into
   * `'firebolt'` made the last loader win and silently repointed every
   * item in the world that named it.
   *
   * `null` = not built yet.
   */
  private cache: Map<string, SpellDescriptor> | null = null;

  /**
   * **The player-input index: short name → paths.**
   *
   * Deliberately separate, and deliberately allowed to be ambiguous.
   * Typing `cast firebolt` is *name resolution* — the same kind of act
   * as naming an item by keyword — so a collision there is a
   * disambiguation problem, not a corruption. A durable reference is a
   * different thing and must never come through here.
   */
  private byName: Map<string, string[]> | null = null;

  /** The authored descriptor at `path`, or `null`. The durable read. */
  public getSpellAt(path: string): SpellDescriptor | null {
    this.ensureCache();
    return this.cache!.get(path) ?? null;
  }

  /**
   * The descriptor a player MEANT by a short name, or `null`.
   *
   * First match when a name is ambiguous — the honest v1 answer, and the
   * seam where a disambiguation prompt goes. Never use this to resolve a
   * stored reference: see {@link getSpellAt}.
   */
  public getSpellNamed(name: string): SpellDescriptor | null {
    this.ensureCache();
    const paths = this.byName!.get(name.trim().toLowerCase()) ?? [];
    const first = paths[0];
    return first ? (this.cache!.get(first) ?? null) : null;
  }

  /** Every path a short name resolves to — the ambiguity, made visible. */
  public pathsNamed(name: string): readonly string[] {
    this.ensureCache();
    return this.byName!.get(name.trim().toLowerCase()) ?? [];
  }

  /** Whether `path` names a cataloged spell. */
  public has(path: string): boolean {
    this.ensureCache();
    return this.cache!.has(path);
  }

  /** Every authored descriptor (defensive copies). */
  public allSpells(): SpellDescriptor[] {
    this.ensureCache();
    return [...this.cache!.values()].map(cloneDescriptor);
  }

  /** The spells at one grid cell (`verb`, `noun`). */
  public spellsAtCell(verb: string, noun: string): SpellDescriptor[] {
    return this.allSpells().filter(
      (s) => s.verb === verb && s.noun === noun,
    );
  }

  /** Warm the cache from the `content` collection (one query at boot). */
  public override async postRegister(_context?: unknown): Promise<void> {
    await this.loadCacheFromTemplates();
  }

  /** Drop the cache; next access rebuilds. Fired by HMR on template churn. */
  public invalidateCache(): void {
    this.cache = null;
  }

  /** Singleton refusal — mirrors `DisciplineCatalogue.canDestruct`. */
  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason:
        'SpellCatalogue is a system singleton and cannot be destructed; ' +
        'use forceDestruct (admin-gated) if you really mean it',
    };
  }

  private ensureCache(): void {
    if (this.cache !== null) return;
    this.cache = new Map();
    this.byName = new Map();
  }

  private async loadCacheFromTemplates(): Promise<void> {
    // By class, not by root: a pack ships its spells under whatever
    // root it holds, and the catalogue must not need a kernel edit.
    const templates = await Template.findByClass(Spell.CLASS_PATH);
    const map = new Map<string, SpellDescriptor>();
    const names = new Map<string, string[]>();
    for (const tpl of templates) {
      const descriptor = buildDescriptor(tpl.data);
      if (!descriptor) continue;
      // The descriptor learns its own durable key here — the one place
      // that knows both the row and its path.
      descriptor.path = tpl.path;
      // The PATH is the key. The id is a short name, indexed separately
      // and allowed to collide.
      map.set(tpl.path, descriptor);
      const key = descriptor.spellId.trim().toLowerCase();
      const bucket = names.get(key);
      if (bucket) bucket.push(tpl.path);
      else names.set(key, [tpl.path]);
    }
    this.cache = map;
    this.byName = names;
  }
}

/**
 * Build a {@link SpellDescriptor} from a template's `data`, or `null`
 * when it lacks the minimum (spellId, a real grid address, parseable
 * effects). Effect validation throwing → the spell is dropped; the
 * roster seeds test asserts every authored seed survives this.
 */
/**
 * One band's effect list: **membership first, then fields.**
 *
 * `bands: [cursed]` on an authored effect means it exists ONLY at those
 * bands — the piece field-variation cannot express, because "a cursed
 * wand also burns your hand" is an extra effect rather than a different
 * number. It is an authoring directive, consumed here and never seen by
 * an executor.
 *
 * Absent ⇒ every band, which is the overwhelming default.
 */
function forBand(raw: unknown[], band: BlessingBand): Effect[] {
  return raw
    .filter((e) => {
      const bands = (e as { bands?: unknown }).bands;
      if (!Array.isArray(bands)) return true;
      return bands.includes(band);
    })
    .map((e) => MagicEffects.validateForBand(e, band));
}

function buildDescriptor(data: unknown): SpellDescriptor | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  if (typeof d.spellId !== 'string' || d.spellId.length === 0) return null;
  if (!MagicGrid.isVerb(d.verb) || !MagicGrid.isNoun(d.noun)) return null;
  const targeting: SpellTargeting = (
    SPELL_TARGETINGS as readonly string[]
  ).includes(d.targeting as string)
    ? (d.targeting as SpellTargeting)
    : 'none';
  // The caster-assuming half, validated as a unit (D3). A malformed
  // profile drops the spell exactly as a malformed effect does — the
  // seeds test is what catches it at authoring time.
  let castingProfile: CastingProfile;
  try {
    castingProfile = CastingProfiles.validate(d.castingProfile);
  } catch {
    return null;
  }
  if (!Array.isArray(d.effects) || d.effects.length === 0) return null;
  let effects: Effect[];
  let cursedEffects: Effect[];
  let blessedEffects: Effect[];
  try {
    effects = forBand(d.effects, 'uncursed');
    // One list per band, from the same authored blobs. A working with no
    // band-varying field simply yields three identical lists, which is
    // the honest "this working does not care about potency".
    cursedEffects = forBand(d.effects, 'cursed');
    blessedEffects = forBand(d.effects, 'blessed');
  } catch {
    return null;
  }
  // The cost model is a CLOSED union, validated here exactly as the
  // effects are: a row naming a model nobody implements drops the spell
  // rather than silently pricing it flat. Absent ⇒ the flat authored
  // cost, which is every shipped spell but one.
  let costModel: SpellCostModel | undefined;
  const rawModel = d.costModel as { kind?: unknown } | undefined;
  if (rawModel && typeof rawModel === 'object' && rawModel.kind !== undefined) {
    if (!(SPELL_COST_MODELS as readonly unknown[]).includes(rawModel.kind)) {
      return null;
    }
    costModel = { kind: rawModel.kind as 'potential' };
  }

  const family = effects.some((e) => MagicEffects.familyOf(e) === 'modifier')
    ? 'modifier'
    : 'impulse';
  return {
    // Filled by the loader, which is the only caller that knows the row's
    // path. Empty here means "built from a bare data blob" — a test
    // fixture, never a catalogued spell.
    path: '',
    spellId: d.spellId,
    name:
      typeof d.name === 'string' && d.name.length > 0 ? d.name : d.spellId,
    verb: d.verb,
    noun: d.noun,
    castingProfile,
    cost: numberOr(d.cost, 0),
    costModel,
    targeting,
    effects,
    cursedEffects,
    blessedEffects,
    family,
    durationSeconds: numberOr(d.durationSeconds, 0),
    description: typeof d.description === 'string' ? d.description : '',
  };
}

function numberOr(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** Defensive copy so callers can't mutate the cached descriptor. */
function cloneDescriptor(d: SpellDescriptor): SpellDescriptor {
  return {
    ...d,
    costModel: d.costModel ? { ...d.costModel } : undefined,
    effects: d.effects.map((e) => ({ ...e })),
    cursedEffects: d.cursedEffects.map((e) => ({ ...e })),
    blessedEffects: d.blessedEffects.map((e) => ({ ...e })),
  };
}
