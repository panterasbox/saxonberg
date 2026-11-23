/**
 * A test fixture: give a `BodyPlan` an explicit flat part list, the way
 * fixtures authored `setBodyParts([...])` before plans were composed of
 * modules (organism-biology W1).
 *
 * ⭐ Each part becomes its own single-part module, `remember`ed resident
 * (the catalogue's fixture door) and instanced at the part's own key and
 * parent — so the body expands to exactly the keys, parents, roles and
 * share RATIOS the list states. Shares are renormalized to sum to 1, the
 * shipped invariant (`lint:anatomy`); every ratio-only reader (surface
 * fractions, the depth ladder, butchery's resolved shares) is unchanged.
 */

import type BodyPlan from '../../../platform/idea/species/BodyPlan';
import type { BodyPart } from '../../../platform/idea/species/BodyPlan';
import type { ModuleRef } from '../Body';
import { BodyModule } from '../BodyModule';
import { SpeciesApi } from '../../../api/species';

/** A part as fixtures write it (the old flat `BodyPart` shape). */
export type FlatPart = Omit<BodyPart, 'parent'> & { parent?: string | null };

/**
 * ⚠ Each call's modules get paths of their own: the catalogue's memory is
 * per KIND and outlives `StuffApi.clearAll`, so two fixtures sharing a plan
 * path would otherwise overwrite each other's parts.
 */
let fixtureSeq = 0;

export function setFlatParts(plan: BodyPlan, parts: readonly FlatPart[]): void {
  fixtureSeq += 1;
  const base = `${plan.getTemplatePath() ?? '/test/body'}#${fixtureSeq}`;
  const refs: ModuleRef[] = [];
  for (const part of parts) {
    const path = `${base}/${part.key}`;
    const data: Record<string, unknown> = {
      parts: [
        {
          key: '',
          tissues: (part.tissues ?? []).map((t) => ({ tissue: t.tissuePath, weight: t.share })),
          ...(part.governs ? { governs: part.governs } : {}),
          ...(part.serves ? { serves: part.serves } : {}),
          ...(part.severable ? { severable: true } : {}),
        },
      ],
    };
    SpeciesApi.modules().remember(path, new BodyModule(path, data));
    const ref: ModuleRef = { module: path, as: [part.key] };
    if (part.parent) ref.at = part.parent;
    if (part.innervatedBy?.length) ref.innervatedBy = [...part.innervatedBy];
    if (part.suppliedBy?.length) ref.suppliedBy = [...part.suppliedBy];
    refs.push(ref);
  }
  plan.applyModules(refs);
}
