/**
 * Modality test helpers. Lets tests build the seven v1 modality
 * singletons in-memory (matching the seed YAML values) without
 * spinning up the SeederManager / Mongo. Each helper registers the
 * modality at its canonical templatePath so
 * `PerceptionApi.modalityByName` / `findByTemplatePath` resolves it.
 *
 * @internal — do not import from production code.
 */

import type { Stuff } from '../../../stuff/Stuff';
import { StuffApi } from '../../../../api/stuff';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../../security/__tests__/test-setup';
import type { ModalityFamily } from '../../Modality';
import { Modality } from '../../Modality';
import { VisionModality } from '../VisionModality';
import { SmellModality } from '../SmellModality';
import { SoundModality } from '../SoundModality';
import { TouchModality } from '../TouchModality';
import { TasteModality } from '../TasteModality';
import { VerbalESPModality } from '../VerbalESPModality';
import { EmotiveESPModality } from '../EmotiveESPModality';
import { PerceptionApi } from '../../../../api/perception';

function registerAtPath<T extends Stuff>(factory: () => T, path: string): T {
  for (const prior of StuffApi.findAllByTemplatePath<Stuff>(path)) {
    StuffApi.unregister(prior);
  }
  const proxy = makeStuff(factory);
  stampTemplatePathForTest(proxy, path);
  return proxy;
}

interface ModalitySpec {
  name: string;
  family: ModalityFamily;
  modality: string;
  factory: () => Modality;
}

const MODALITY_SPECS: readonly ModalitySpec[] = [
  { name: 'vision', family: 'field', modality: 'vision', factory: () => new VisionModality() },
  { name: 'smell', family: 'field', modality: 'smell', factory: () => new SmellModality() },
  { name: 'sound', family: 'field', modality: 'hearing', factory: () => new SoundModality() },
  { name: 'touch', family: 'contact', modality: 'touch', factory: () => new TouchModality() },
  { name: 'taste', family: 'contact', modality: 'taste', factory: () => new TasteModality() },
  { name: 'verbal-esp', family: 'field', modality: 'verbal-esp', factory: () => new VerbalESPModality() },
  { name: 'emotive-esp', family: 'field', modality: 'emotive-esp', factory: () => new EmotiveESPModality() },
];

/**
 * Build one v1 modality singleton at `/lib/perception/modalities/<name>`.
 * Hydrates from the matching v1 seed data.
 */
export function buildModality(name: string): Modality {
  const spec = MODALITY_SPECS.find((m) => m.name === name);
  if (!spec) {
    throw new Error(`buildModality: unknown modality '${name}'`);
  }
  const path = `/lib/perception/modalities/${spec.name}`;
  const modality = registerAtPath(spec.factory, path);
  modality.setName(spec.name);
  modality.setFamily(spec.family);
  modality.setModality(spec.modality);
  PerceptionApi._resetModalityCacheForTest();
  return modality;
}

/** Build all seven v1 modalities; returns a name → singleton record. */
export function buildAllModalities(): Record<string, Modality> {
  const out: Record<string, Modality> = {};
  for (const spec of MODALITY_SPECS) {
    out[spec.name] = buildModality(spec.name);
  }
  return out;
}
