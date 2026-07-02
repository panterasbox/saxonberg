import { Idea } from './Idea';
import type { VetoResult } from '../errors';

/**
 * Base class for the `*Logic` singletons behind the `*Api` facades
 * (`obj/api/*Logic.ts`). A thin specialization of {@link Idea} whose
 * sole job today is to make every logic singleton **residency-exempt**:
 * it vetoes {@link Stuff.canEvict} unconditionally.
 *
 * Logic singletons are a **finite, load-bearing set that underpins every
 * system**. They would technically self-heal if culled (they resolve via
 * `StuffApi.singletonSync`, which re-warms a fresh instance on next
 * access), so this veto is not a correctness fix — it's a "there is no
 * benefit to ever churning them" categorical exemption, applied once
 * here rather than as ~65 per-class overrides.
 *
 * This is the sanctioned home for any future shared logic-singleton
 * concern, so the population never has to be re-migrated. It is **not**
 * a new module category — just a framework base class in the Stuff-class
 * lineage (`ApiLogic extends Idea extends Stuff`), so `instanceof Idea`
 * still holds for every `*Logic`.
 *
 * @internal
 */
export class ApiLogic extends Idea {
  /**
   * Residency veto. See the class doc: logic singletons are never
   * culled. Terminal (does not chain `super`) — the exemption is
   * unconditional.
   */
  public canEvict(): VetoResult {
    return { ok: false, reason: 'load-bearing logic singleton' };
  }
}
