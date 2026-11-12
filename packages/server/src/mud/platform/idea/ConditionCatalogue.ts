/**
 * ConditionCatalogue — the home of the authored condition roster, reached as
 * `ConditionApi.conditions()`: the one door every condition read goes
 * through (load-on-use W6).
 *
 * ⭐ **Conditions load with the first body.** Every condition is read or
 * written on a `VitalsMixin` host or a `ContaminableMixin` host, through
 * sync seams that cannot wait (scheduler ticks, `afflict`), so both mixins'
 * `onCreate` await {@link ensureRoster} — the whole roster, once per
 * process. Nothing boots it. A read that finds a row cold throws naming the
 * path ({@link need}); a read that may honestly miss (a toxin key with no
 * condition row) asks {@link peek}.
 *
 * ⚠ **The gap the warm closes is the material gap, one subsystem over.**
 * Condition seeds are template ROWS and nothing cloned them into Ideas, so
 * every condition read answered `null` in a running world and failed
 * SILENTLY (`Metabolic.resolveToxinBehavior` returned `null`; its caller did
 * `if (!behavior) continue`), while the toxin suites hand-constructed their
 * own `Condition`. Loud cold reads are what make that unrepeatable.
 *
 * The roster is every root's `/idea/Condition/` subtree, filtered to rows
 * whose class extends `Condition` wherever it lives (the `MaterialCatalogue`
 * shape) — so a pack's condition under its own root needs no line here.
 * Reached by `singletonSync` with no `onCreate` (the document catalogues'
 * shape, D13): the roster state is the CLASS's, so a catalogue stood up
 * again (a suite's `clearAll`) reads the same roster.
 */

import { Idea } from '../../lib/stuff/Idea';
import { StuffApi } from '../../api/stuff';
import { Template } from '../../lib/stuff/Template';
import Condition from './Condition';
import { DocumentNotResidentError, type VetoResult } from '../../lib/errors';
import type { EvictionContext } from '../../lib/stuff/Stuff';
import type { BoundaryRole } from '../../lib/security/BoundaryRole';
import { CallSecurity } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';

/** Every root's condition subtree — the warm's infix (no list of roots). */
const CONDITION_INFIX = '/idea/Condition/';

const ConditionCatalogueBase = Idea;

export default class ConditionCatalogue extends ConditionCatalogueBase {
  /**
   * Shared vocabulary nobody holds title to: `look` at yourself, `assess`,
   * a sting or a dose read conditions inside a circle (load-on-use W0).
   */
  static boundaryRole: BoundaryRole = 'commons';

  /**
   * The one roster load, for the process — `#` (CLAUDE.md special case 3):
   * it is the class's, so it outlives any instance (a suite's `clearAll`,
   * an HMR swap), and nothing outside these methods may reset it.
   */
  static #rosterLoad: Promise<number> | null = null;
  /** Whether the roster has stood in this process — the roster read's guard. */
  static #stood = false;

  /**
   * ⭐ Load the condition at `path` — at once when it is live, else its row
   * stood up. The async door (load-on-use D7).
   */
  public async ensure(path: string): Promise<Condition> {
    const live = this.peek(path);
    if (live) return live;
    await StuffApi.ensureConstituent(path);
    if (!this.peek(path)) await StuffApi.singleton(path);
    return this.need(path);
  }

  /**
   * The live condition at `path` — throws `DocumentNotResidentError` when
   * nothing loaded it (cold means loud, load-on-use D1).
   */
  public need(path: string): Condition {
    const c = this.peek(path);
    if (!c) throw new DocumentNotResidentError('condition', path);
    return c;
  }

  /** The live condition at `path`, or `null` — a read that may honestly miss. */
  public peek(path: string): Condition | null {
    if (!path) return null;
    const c = StuffApi.findByTemplatePath<Condition>(path);
    return c instanceof Condition ? c : null;
  }

  /**
   * ⭐ Stand the whole roster up once per process — what a body's `onCreate`
   * awaits, so every sync condition read finds its row.
   */
  public ensureRoster(): Promise<number> {
    ConditionCatalogue.#rosterLoad ??= this.warm().catch((err: unknown) => {
      ConditionCatalogue.#rosterLoad = null;
      throw err;
    });
    return ConditionCatalogue.#rosterLoad;
  }

  /**
   * Every live condition row, in path order — the differential's question
   * ("everything that could present like this"). Read before the roster
   * stood, it throws rather than answering with whatever happened to load.
   */
  public roster(): Condition[] {
    if (!ConditionCatalogue.#stood) {
      throw new DocumentNotResidentError('condition roster', '/platform/idea/ConditionCatalogue');
    }
    return StuffApi.findByPathGlob<Condition>(`/**${CONDITION_INFIX}**`)
      .filter((c): c is Condition => c instanceof Condition)
      .sort((a, b) => (a.getTemplatePath() ?? '').localeCompare(b.getTemplatePath() ?? ''));
  }

  /**
   * Mark the roster stood with what is already live — a suite's harness,
   * which has no rows to read (`ConditionApi`'s `@TestOnly` seam is the
   * only caller).
   */
  @CallSecurity(SecurityPolicies.FromModule('/api/condition#ConditionApi'))
  public standRosterAsLive(): void {
    ConditionCatalogue.#stood = true;
    ConditionCatalogue.#rosterLoad = Promise.resolve(0);
  }

  /**
   * Stand up every authored Condition row as a live singleton — every
   * root's `/idea/Condition/` subtree, rows whose class extends
   * `Condition`. Public so a pack go-live can re-warm (idempotent —
   * `singleton` no-ops rows already live). Returns the count stood.
   */
  public async warm(): Promise<number> {
    const templates = await Template.findByPathInfix(CONDITION_INFIX);
    let stood = 0;
    const isCondition = new Map<string, boolean>();
    for (const tpl of templates) {
      if (!isCondition.has(tpl.class)) isCondition.set(tpl.class, await isConditionClass(tpl.class));
      // Leaf rows only — a folder row under the tree belongs to the zone
      // substrate, not to us.
      if (!isCondition.get(tpl.class)) continue;
      try {
        await StuffApi.singleton(tpl.path);
        stood++;
      } catch (err) {
        console.warn(`ConditionCatalogue: '${tpl.path}' failed to stand up:`, err);
      }
    }
    ConditionCatalogue.#stood = true;
    console.info(`ConditionCatalogue: ${stood} condition singleton(s) live`);
    return stood;
  }

  /** Residency veto — the roster's home; never culled. */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }

  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason: 'ConditionCatalogue is a system singleton; never destructed',
    };
  }
}

/** Does `classPath` resolve to `Condition` or a subclass of it? */
async function isConditionClass(classPath: string): Promise<boolean> {
  try {
    const cls = (await StuffApi.loadClassByPath(classPath)) as { prototype?: unknown };
    return typeof cls === 'function' && (cls === (Condition as unknown) || cls.prototype instanceof Condition);
  } catch {
    return false;
  }
}
