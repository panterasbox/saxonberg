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
import BodyPlanClass from '../../../platform/idea/species/BodyPlan';
import type Species from '../../../platform/idea/species/Species';
import type { TapSpec } from '../../../platform/idea/species/Species';
import { makeStuffAtPath } from '../../security/__tests__/test-setup';
import Material from '../../material/Material';
import type { BodyPart, BreathingSpec } from '../../../platform/idea/species/BodyPlan';
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
  // ⭐ W8 (D10): breathing derives from organs. A fixture's flat parts
  // authored none, and a plan used to breathe air by default — so the root
  // part breathes air, unless a part says otherwise or `setFlatBreathing`
  // has given the plan its own organ.
  const keepsBreath = plan.getModules().some((r) => r.module.endsWith('#breath'));
  const authored = parts.some((p) => (p.breathes?.length ?? 0) > 0);
  for (const part of parts) {
    const path = `${base}/${part.key}`;
    const breathes = part.breathes ?? (!keepsBreath && !authored && !part.parent ? [{ medium: 'air', apparatus: 'lungs', intake: 1 }] : undefined);
    const data: Record<string, unknown> = {
      parts: [
        {
          key: '',
          tissues: (part.tissues ?? []).map((t) => ({ tissue: t.tissuePath, weight: t.share })),
          ...(part.governs ? { governs: part.governs } : {}),
          ...(part.serves ? { serves: part.serves } : {}),
          ...(part.severable ? { severable: true } : {}),
          ...(part.sustains ? { sustains: part.sustains } : {}),
          ...(part.produces ? { produces: part.produces } : {}),
          ...(part.gait ? { gait: part.gait } : {}),
          ...(part.fill ? { fill: part.fill } : {}),
          ...(part.integument ? { integument: part.integument } : {}),
          ...(part.regrows ? { regrows: part.regrows } : {}),
          ...(breathes ? { breathes } : {}),
          ...(part.senses ? { senses: part.senses } : {}),
        },
      ],
      ...(part.comesOffAs ? { comesOffAs: part.comesOffAs } : {}),
    };
    SpeciesApi.modules().remember(path, new BodyModule(path, data));
    const ref: ModuleRef = { module: path, as: [part.key] };
    if (part.parent) ref.at = part.parent;
    if (part.innervatedBy?.length) ref.innervatedBy = [...part.innervatedBy];
    if (part.suppliedBy?.length) ref.suppliedBy = [...part.suppliedBy];
    refs.push(ref);
  }
  // ⭐ A gait-only instance a fixture gave the plan earlier survives.
  plan.applyModules([...plan.getModules().filter((r) => r.module.endsWith('#gait') || r.module.endsWith('#breath') || r.module.endsWith('#senses')), ...refs]);
}

/**
 * Give a plan the breathing a fixture used to author as `breathing` /
 * `respires` (organism-biology W8: breathing derives from organs). A
 * weightless part at its own root, `body.breath`, carries the specs; an
 * empty list means a body with parts and no breathing organ — it does not
 * respire.
 */
export function setFlatBreathing(plan: BodyPlan, breathes: readonly BreathingSpec[]): void {
  // A senses part breathed air on the plan's old default; this plan says how it breathes now.
  for (const r of plan.getModules().filter((m) => m.module.endsWith('#senses'))) {
    const senses = SpeciesApi.modules().need(r.module).parts[0]?.senses ?? [];
    SpeciesApi.modules().remember(r.module, new BodyModule(r.module, { parts: [{ key: '', tissues: [], senses: senses.map((o) => ({ ...o })) }] }));
  }
  fixtureSeq += 1;
  const path = `${plan.getTemplatePath() ?? '/test/body'}#${fixtureSeq}#breath`;
  SpeciesApi.modules().remember(path, new BodyModule(path, {
    parts: [{ key: '', tissues: [], ...(breathes.length > 0 ? { breathes: breathes.map((b) => ({ ...b })) } : {}) }],
  }));
  plan.applyModules([...plan.getModules().filter((r) => !r.module.endsWith('#breath')), { module: path, as: ['body.breath'] }]);
}

/**
 * Give a plan the senses a fixture used to author as `sensoryPorts`
 * (organism-biology W9: senses derive from organs). A weightless part,
 * `body.senses`, carries one organ per port (count and position are the
 * ports' and drop out). ⭐ It also breathes air — the plan default a
 * port-only fixture assumed — unless `setFlatBreathing` gave the plan its
 * own organ.
 */
export function setFlatSenses(plan: BodyPlan, ports: readonly { modality: string; media?: string[]; count?: number; position?: string }[]): void {
  fixtureSeq += 1;
  const path = `${plan.getTemplatePath() ?? '/test/body'}#${fixtureSeq}#senses`;
  const breathes = plan.getModules().some((r) => r.module.endsWith('#breath'))
    ? {}
    : { breathes: [{ medium: 'air', apparatus: 'lungs', intake: 1 }] };
  SpeciesApi.modules().remember(path, new BodyModule(path, {
    parts: [{ key: '', tissues: [], ...breathes, senses: ports.map((p) => ({ modality: p.modality, ...(p.media ? { media: [...p.media] } : {}) })) }],
  }));
  plan.applyModules([...plan.getModules().filter((r) => !r.module.endsWith('#senses')), { module: path, as: ['body.senses'] }]);
}

/**
 * Give a plan the gaits a fixture used to author as `locomotionModes`
 * (organism-biology W3: gaits derive from parts). A weightless part at its
 * own root, `body.gait`, carries them — no tissue, no surface, no slot.
 */
export function setFlatGaits(plan: BodyPlan, gaits: readonly string[]): void {
  fixtureSeq += 1;
  const path = `${plan.getTemplatePath() ?? '/test/body'}#${fixtureSeq}#gait`;
  SpeciesApi.modules().remember(path, new BodyModule(path, { parts: [{ key: '', tissues: [], gait: [...gaits] }] }));
  plan.applyModules([...plan.getModules().filter((r) => !r.module.endsWith('#gait')), { module: path, as: ['body.gait'] }]);
}

/**
 * Give a species the taps a fixture used to author as `production`
 * (organism-biology W3: a gland is a part). The glands hang on a weightless
 * part, `body.gland`, added for every form — or, with `sex`, for that sex
 * only (an udder). A species with no plan gets an empty one, so it has a
 * body to hang them on.
 */
export function setFlatTaps(species: Species, taps: readonly TapSpec[], opts: { sex?: string } = {}): void {
  fixtureSeq += 1;
  const base = `${species.getTemplatePath() ?? '/test/species'}#${fixtureSeq}`;
  if (!species.getBodyPlan()) {
    const plan = makeStuffAtPath(() => new BodyPlanClass(), `${base}/plan`);
    plan.applyModules([]);
    species.setBodyPlan(plan);
  }
  const path = `${base}/gland`;
  SpeciesApi.modules().remember(path, new BodyModule(path, { parts: [{ key: '', tissues: [], produces: taps.map((t) => ({ ...t })) }] }));
  const add = { add: [{ module: path, as: [`body.gland${fixtureSeq}`] }] };
  if (opts.sex) {
    species.applyVariants({ ...species.getVariants(), sex: { ...(species.getVariants().sex ?? {}), [opts.sex]: { body: add } } });
  } else {
    species.applyBody(add);
  }
}

/**
 * Give a species a carcass a fixture used to author as `butcheryYield`
 * (organism-biology W5: what comes off derives from the body). Each line is
 * a part carrying a tissue of its own that names the row, at `share` of the
 * body; a filler part carries the rest, naming nothing. An `unconditioned`
 * line's tissue is tagged `bone` (a hide and a skeleton are the size the
 * animal IS). A species with no plan gets one.
 */
export function setFlatCarcass(
  species: Species,
  lines: readonly { cut: string; share: number; unconditioned?: boolean }[],
): void {
  fixtureSeq += 1;
  const base = `${species.getTemplatePath() ?? '/test/species'}#${fixtureSeq}`;
  const used = lines.reduce((a, l) => a + l.share, 0);
  const parts: FlatPart[] = [
    { key: 'body.torso', parent: null, tissues: used < 1 ? [{ tissuePath: `${base}/filler`, share: 1 - used }] : [] },
  ];
  lines.forEach((l, i) => {
    const tissue = `${base}/t${i}`;
    const m = makeStuffAtPath(() => new Material(), tissue);
    if (l.unconditioned) m.setTags(['bone']);
    parts.push({ key: `body.torso.c${i}`, parent: 'body.torso', tissues: [{ tissuePath: tissue, share: l.share }], comesOffAs: [{ tissue, cut: l.cut }] });
  });
  const plan = makeStuffAtPath(() => new BodyPlanClass(), `${base}/plan`);
  setFlatParts(plan, parts);
  species.setBodyPlan(plan);
}
