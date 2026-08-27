/**
 * Locomotion test helpers. Lets tests build the nine v1 mode
 * singletons in-memory (matching the seed YAML values) without
 * spinning up the content installer / Mongo. Each helper registers the
 * mode at its canonical templatePath so `LocomotionApi.modeOf` /
 * `findByTemplatePath` resolves it.
 *
 * @internal — do not import from production code.
 */

import type { Stuff } from '../../stuff/Stuff';
import { StuffApi } from '../../../api/stuff';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';
import { LocomotionMode } from '../../../platform/idea/LocomotionMode';

function registerAtPath<T extends Stuff>(factory: () => T, path: string): T {
  // Tear down any prior instance at this path so repeated buildMode
  // calls across describe blocks don't accumulate duplicates in the
  // byTemplatePath index. findAllByTemplatePath returns every live
  // clone at the path (singleton enforcement happens at StuffApi.clone
  // — here we're below that layer).
  for (const prior of StuffApi.findAllByTemplatePath<Stuff>(path)) {
    StuffApi.unregister(prior);
  }
  // `makeStuff` flips the construction sentinel via test-setup (the
  // allowlisted helper). The seam-based stamp + re-register lands the
  // templatePath on the `#templatePath` slot and updates the index.
  const proxy = makeStuff(factory);
  stampTemplatePathForTest(proxy, path);
  return proxy;
}

interface ModeData {
  name: string;
  speed?: number;
  noiseLevel?: 'silent' | 'quiet' | 'normal' | 'loud';
  bodyProfile?: 'prone' | 'crouched' | 'upright' | 'horizontal' | 'varied';
  groundContact?: 'none' | 'partial' | 'full';
  requiresBodyPlanMode?: string[];
  requiresPosture?: string[];
  costMultiplier?: number;
  passthrough?: boolean;
  conveyanceMixin?: string | null;
  enablementMixin?: string | null;
  medium?: string | null;
}

const MODE_DEFAULTS: Record<string, ModeData> = {
  walk: {
    name: 'walk',
    speed: 1.0,
    noiseLevel: 'normal',
    bodyProfile: 'upright',
    groundContact: 'full',
    requiresBodyPlanMode: ['walk'],
    costMultiplier: 1.0,
    passthrough: false,
    enablementMixin: null,
    medium: 'ground',
  },
  climb: {
    name: 'climb',
    speed: 0.5,
    noiseLevel: 'normal',
    bodyProfile: 'varied',
    groundContact: 'partial',
    requiresBodyPlanMode: ['climb'],
    costMultiplier: 2.0,
    passthrough: false,
    enablementMixin: 'ClimbableMixin',
    medium: 'vertical',
  },
  swim: {
    name: 'swim',
    speed: 0.5,
    noiseLevel: 'quiet',
    bodyProfile: 'horizontal',
    groundContact: 'none',
    requiresBodyPlanMode: ['swim'],
    costMultiplier: 2.0,
    passthrough: false,
    enablementMixin: 'SwimmableMixin',
    medium: 'water',
  },
  fly: {
    name: 'fly',
    speed: 1.5,
    noiseLevel: 'quiet',
    bodyProfile: 'horizontal',
    groundContact: 'none',
    requiresBodyPlanMode: ['fly'],
    costMultiplier: 0.7,
    passthrough: false,
    enablementMixin: 'FlyableMixin',
    medium: 'air',
  },
  ride: {
    name: 'ride',
    requiresBodyPlanMode: [],
    costMultiplier: 1.0,
    passthrough: true,
    conveyanceMixin: 'MountableMixin',
    enablementMixin: null,
    medium: null,
  },
  drive: {
    name: 'drive',
    requiresBodyPlanMode: [],
    costMultiplier: 1.0,
    passthrough: true,
    conveyanceMixin: 'DrivableMixin',
    enablementMixin: null,
    medium: null,
  },
  wheeled: {
    name: 'wheeled',
    speed: 2.0,
    noiseLevel: 'loud',
    bodyProfile: 'upright',
    groundContact: 'full',
    costMultiplier: 0.5,
    passthrough: false,
    enablementMixin: null,
    medium: 'ground',
  },
  sailed: {
    name: 'sailed',
    speed: 1.5,
    noiseLevel: 'quiet',
    bodyProfile: 'upright',
    groundContact: 'partial',
    costMultiplier: 0.6,
    passthrough: false,
    enablementMixin: null,
    medium: 'water',
  },
  aerial: {
    name: 'aerial',
    speed: 3.0,
    noiseLevel: 'loud',
    bodyProfile: 'varied',
    groundContact: 'none',
    costMultiplier: 0.4,
    passthrough: false,
    enablementMixin: null,
    medium: 'air',
  },
};

/**
 * Build and register one LocomotionMode singleton at
 * `/platform/idea/LocomotionMode/<name>`. Hydrates from the matching v1 seed
 * data; pass `overrides` to tweak per-test.
 */
export function buildMode(
  name: keyof typeof MODE_DEFAULTS,
  overrides: Partial<ModeData> = {},
): LocomotionMode {
  const data = { ...MODE_DEFAULTS[name], ...overrides };
  const mode = registerAtPath(
    () => new LocomotionMode(),
    `/platform/idea/LocomotionMode/${name}`,
  );
  if (data.name !== undefined) mode.setName(data.name);
  if (data.speed !== undefined) mode.setSpeed(data.speed);
  if (data.noiseLevel !== undefined) mode.setNoiseLevel(data.noiseLevel);
  if (data.bodyProfile !== undefined) mode.setBodyProfile(data.bodyProfile);
  if (data.groundContact !== undefined) mode.setGroundContact(data.groundContact);
  if (data.requiresBodyPlanMode !== undefined) {
    mode.setRequiresBodyPlanMode(data.requiresBodyPlanMode);
  }
  if (data.requiresPosture !== undefined) {
    mode.setRequiresPosture(data.requiresPosture);
  }
  if (data.costMultiplier !== undefined) {
    mode.setCostMultiplier(data.costMultiplier);
  }
  if (data.passthrough !== undefined) mode.setPassthrough(data.passthrough);
  if (data.conveyanceMixin !== undefined) {
    mode.setConveyanceMixin(data.conveyanceMixin);
  }
  if (data.enablementMixin !== undefined) {
    mode.setEnablementMixin(data.enablementMixin);
  }
  if (data.medium !== undefined) {
    mode.setMedium(data.medium);
  }
  return mode;
}

/** Build all nine v1 modes; returns a name → singleton record. */
export function buildAllModes(): Record<string, LocomotionMode> {
  const out: Record<string, LocomotionMode> = {};
  for (const name of Object.keys(MODE_DEFAULTS)) {
    out[name] = buildMode(name as keyof typeof MODE_DEFAULTS);
  }
  return out;
}
