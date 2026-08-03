/**
 * SpellCatalogue — singleton Idea owning the warmed spell roster: the
 * authored casts the magic substrate executes.
 *
 * Lives at `/obj/SpellCatalogue` (the `DisciplineCatalogue` /
 * `CorpoCatalogue` recipe verbatim): the cache is transient instance
 * state; the source of truth is the per-Spell leaf templates under
 * `/obj/magic/Spell/` in the `domain` collection, read directly from
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
 * `{ class: /obj/SpellCatalogue, data: {} }`.
 */

import { Idea } from '../lib/stuff/Idea';
import { PostRegistrationMixin } from '../lib/stuff/PostRegistration';
import { Template } from '../lib/stuff/Template';
import Spell, {
  SPELL_TARGETINGS,
  type SpellDescriptor,
  type SpellTargeting,
} from './magic/Spell';
import { MagicEffects, type Effect } from '../lib/magic/Effect';
import { MagicGrid } from '../lib/magic/Grid';
import { CompetenceBand } from '../lib/advancement/CompetenceBand';
import type { CompetenceBandName } from '../lib/advancement/CompetenceBand';
import type { VetoResult } from '../lib/errors';
import type { EvictionContext } from '../lib/stuff/Stuff';

const SpellCatalogueBase = PostRegistrationMixin(Idea);

export default class SpellCatalogue extends SpellCatalogueBase {
  /** Residency veto — a load-bearing process-lifetime singleton. */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }

  /** Transient cache keyed by `spellId`; `null` = not built yet. */
  private cache: Map<string, SpellDescriptor> | null = null;

  /** The authored descriptor for `spellId`, or `null`. */
  public getSpell(spellId: string): SpellDescriptor | null {
    this.ensureCache();
    return this.cache!.get(spellId) ?? null;
  }

  /** Whether `spellId` names a cataloged spell. */
  public has(spellId: string): boolean {
    this.ensureCache();
    return this.cache!.has(spellId);
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

  /** Warm the cache from the `domain` collection (one query at boot). */
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
  }

  private async loadCacheFromTemplates(): Promise<void> {
    const templates = await Template.findDescendants(
      Spell.TEMPLATE_PATH_PREFIX,
    );
    const map = new Map<string, SpellDescriptor>();
    for (const tpl of templates) {
      const descriptor = buildDescriptor(tpl.data);
      if (descriptor) map.set(descriptor.spellId, descriptor);
    }
    this.cache = map;
  }
}

/**
 * Build a {@link SpellDescriptor} from a template's `data`, or `null`
 * when it lacks the minimum (spellId, a real grid address, parseable
 * effects). Effect validation throwing → the spell is dropped; the
 * roster seeds test asserts every authored seed survives this.
 */
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
  const requiredBand: CompetenceBandName = CompetenceBand.isBand(
    d.requiredBand,
  )
    ? d.requiredBand
    : 'novice';
  if (!Array.isArray(d.effects) || d.effects.length === 0) return null;
  let effects: Effect[];
  try {
    effects = d.effects.map((e) => MagicEffects.validate(e));
  } catch {
    return null;
  }
  const family = effects.some((e) => MagicEffects.familyOf(e) === 'modifier')
    ? 'modifier'
    : 'impulse';
  return {
    spellId: d.spellId,
    name:
      typeof d.name === 'string' && d.name.length > 0 ? d.name : d.spellId,
    verb: d.verb,
    noun: d.noun,
    requiredBand,
    cost: numberOr(d.cost, 0),
    castSeconds: numberOr(d.castSeconds, 0),
    targeting,
    effects,
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
  return { ...d, effects: d.effects.map((e) => ({ ...e })) };
}
