/**
 * PlacementCatalogue — the self-warming home of the authored **ways of
 * sitting** (the `ReadingCatalogue` shape).
 *
 * Every `Placement` row under any root's `idea/Placement/` subtree is
 * stood up as a live singleton and indexed twice: by the member's name,
 * and by every preposition it answers to. That is the whole
 * registration story for a new way of sitting: **install the pack, get
 * the relation**. No kernel list, no stanza in a platform view.
 *
 * ⚠⚠ **It warms lazily as well as at `postRegister`.** The
 * reference-Idea-inert-at-boot trap has bitten this repo three times —
 * a roster nothing stands up reads null forever on a fresh process and
 * every consumer silently answers "no such thing". `put`, `look` and
 * the thermal ambient read resolve a member **synchronously on every
 * dispatch**, so the dispatch path must not depend on boot order:
 * {@link peek} is the sync read and {@link warmed} warms on the first
 * miss.
 *
 * ⭐ Idempotent by construction — `StuffApi.singleton` no-ops a row that
 * is already live — so a pack go-live re-warms and picks up new members
 * without a restart.
 */

import { Idea } from '../../lib/stuff/Idea';
import { PostRegistrationMixin } from '../../lib/stuff/PostRegistration';
import Placement from './Placement';
import { StuffApi } from '../../api/stuff';
import { Template } from '../../lib/stuff/Template';
import type { VetoResult } from '../../lib/errors';
import type { EvictionContext } from '../../lib/stuff/Stuff';

/** Where this singleton lives. */
export const PLACEMENT_CATALOGUE_PATH = '/platform/idea/PlacementCatalogue';

const PlacementCatalogueBase = PostRegistrationMixin(Idea);

export default class PlacementCatalogue extends PlacementCatalogueBase {
  /** member name → the live Placement. Rebuilt by {@link warm}. */
  private byName = new Map<string, Placement>();

  /** every preposition (primary and secondary) → the live Placement. */
  private byWord = new Map<string, Placement>();

  /** Whether {@link warm} has completed at least once. */
  private warmedOnce = false;

  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }

  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason: 'PlacementCatalogue is a system singleton; never destructed',
    };
  }

  public override async postRegister(_context?: unknown): Promise<void> {
    await this.warm();
  }

  /**
   * The member as the index stands, with no warm. Cold reads null,
   * honestly — and every sync caller is written so that null is the
   * shipped default rather than a broken verb.
   */
  public peek(name: string): Placement | null {
    return this.byName.get(PlacementCatalogue.key(name)) ?? null;
  }

  /** The member a preposition names, with no warm. */
  public peekWord(word: string): Placement | null {
    return this.byWord.get(PlacementCatalogue.key(word)) ?? null;
  }

  /** The member, warming the roster if nothing has yet. */
  public async warmed(name: string): Promise<Placement | null> {
    const key = PlacementCatalogue.key(name);
    if (key === '') return null;
    if (!this.warmedOnce) await this.warm();
    return this.byName.get(key) ?? null;
  }

  /** Every member installed, warming first. Alphabetical by name. */
  public async allWarmed(): Promise<Placement[]> {
    if (!this.warmedOnce) await this.warm();
    return [...this.byName.values()].sort((a, b) =>
      a.getName().localeCompare(b.getName()),
    );
  }

  /** The one normalization of a member name or a typed word. */
  private static key(token: string): string {
    return token.trim().toLowerCase();
  }

  /**
   * Stand up every authored `Placement` row as a live singleton and
   * index it by name and by word. Public so a pack go-live can re-warm.
   * Returns the count indexed.
   */
  public async warm(): Promise<number> {
    const templates = await Template.findByPathInfix(Placement.PATH_INFIX);
    const byName = new Map<string, Placement>();
    const byWord = new Map<string, Placement>();
    const isPlacement = new Map<string, boolean>();
    for (const tpl of templates) {
      if (!isPlacement.has(tpl.class)) {
        isPlacement.set(tpl.class, await isPlacementClass(tpl.class));
      }
      if (!isPlacement.get(tpl.class)) continue;
      try {
        const member = await StuffApi.singleton<Placement>(tpl.path);
        const name = PlacementCatalogue.key(member.getName());
        if (name === '') {
          console.warn(`PlacementCatalogue: '${tpl.path}' names no member`);
          continue;
        }
        // ⚠ Two packs claiming one member name is an authoring
        // collision, not a merge. First warmed wins and the second is
        // named — a silent overwrite is how a trade's way of sitting
        // disappears without anybody typing anything different.
        const prior = byName.get(name);
        if (prior && prior !== member) {
          console.warn(
            `PlacementCatalogue: member '${name}' claimed twice — ` +
              `'${prior.getTemplatePath()}' keeps it, '${tpl.path}' ignored`,
          );
          continue;
        }
        byName.set(name, member);
        // Primary words are exclusive (`lint:placement-words` gates it);
        // a secondary word is first-come, because `on` is `from`'s
        // second word and must not steal `on`'s own.
        for (const word of member.getPrepositions()) {
          const key = PlacementCatalogue.key(word);
          if (key === '') continue;
          if (!byWord.has(key)) byWord.set(key, member);
        }
      } catch (err) {
        console.warn(
          `PlacementCatalogue: '${tpl.path}' failed to stand up:`,
          err,
        );
      }
    }
    // A member's PRIMARY word always wins its own key, whatever order
    // the rows warmed in.
    for (const member of byName.values()) {
      const primary = PlacementCatalogue.key(member.getPrimaryWord());
      if (primary !== '') byWord.set(primary, member);
    }
    this.byName = byName;
    this.byWord = byWord;
    this.warmedOnce = true;
    console.info(`PlacementCatalogue: ${byName.size} placement member(s) live`);
    return byName.size;
  }

  /** Drop the index so the next read re-warms (a pack install / go-live). */
  public invalidateCache(): void {
    this.byName = new Map();
    this.byWord = new Map();
    this.warmedOnce = false;
  }
}

/** Does `classPath` resolve to a class extending `Placement`? */
async function isPlacementClass(classPath: string): Promise<boolean> {
  try {
    const cls = (await StuffApi.loadClassByPath(classPath)) as {
      prototype?: unknown;
    };
    return (
      typeof cls === 'function' &&
      (cls === (Placement as unknown) || cls.prototype instanceof Placement)
    );
  } catch {
    return false;
  }
}
