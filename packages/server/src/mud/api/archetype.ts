// ArchetypeApi — the thin, gated forwarding shell over ArchetypeLogic:
// the venue archetype (content-packs A13/A14, libations D11). The floor an
// industry states in CAPABILITIES, most of it DERIVED from its recipes;
// consumed only at cold paths (install validation, a status read, the
// derived test venue). Nothing at runtime gates on it.

import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { ArchetypeLogic } from '../platform/idea/api/ArchetypeLogic';
import { fileURLToPath } from 'url';
import { SecurityApi } from './security';
import type { Stuff } from '../lib/stuff/Stuff';
import type { Container } from '../lib/spatial/Container';
import type { Archetype, CapabilityNeed, CapabilitySlot } from '../lib/archetype/Archetype';
import type {
  ArchetypeDescription,
  ChecklistRow,
  EffectiveRow,
} from '../platform/idea/api/ArchetypeLogic';

export type { Archetype, CapabilityNeed, CapabilitySlot, ArchetypeDescription, ChecklistRow, EffectiveRow };

const LOGIC_PATH = '/platform/idea/api/archetype';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../platform/idea/api/ArchetypeLogic', import.meta.url),
);

/** Resolve the HMR-able ArchetypeLogic singleton (sync). */
function logic(): ArchetypeLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'ArchetypeLogic',
      ) as typeof ArchetypeLogic | null) ?? ArchetypeLogic)(),
  );
}

export class ArchetypeApi {
  /**
   * The EFFECTIVE floor of an archetype: the authored residue plus every
   * tool capability and heat requirement across the industry's recipes
   * (merged into the authored slot that states the same need, else a
   * row of its own with no default). `null` for an unknown id.
   */
  public static describe(archetypeId: string): ArchetypeDescription | null {
    return logic().describe(archetypeId);
  }

  /**
   * Which of the effective rows a venue satisfies, read over its
   * contents (one level, plus open containers). **Reported, never
   * enforced** — a bar with no ice bin is a legal, visible state.
   */
  public static checklist(archetypeId: string, venue: Stuff): ChecklistRow[] | null {
    return logic().checklist(archetypeId, venue);
  }

  /**
   * The derived venue (A13.5): a bare venue room with each authored
   * slot's default binding cloned into it. The pack's own test builds
   * its venue from this, so the archetype is checked for completeness
   * by the menu it has to serve.
   */
  public static materialize(archetypeId: string): Promise<Stuff & Container> {
    return logic().materialize(archetypeId);
  }

  /** Every installed archetype. */
  public static all(): readonly Archetype[] {
    return logic().all();
  }
}

SecurityApi.decorateApiClass(ArchetypeApi);
