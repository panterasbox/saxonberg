/**
 * ⭐⭐ Hydration guard for the injury MR's new material rows.
 *
 * `lead.yaml` shipped `toxicity: [lead]` — a bare string, not a
 * `ToxinTag` — and travelled the whole build undetected. The reason is a
 * real coverage gap: the server suite hydrates **synthetic** materials
 * (`new Material()`), never real content rows, and `PackLogic` checks
 * class resolution, not field hydration. The one test that strictly
 * hydrates every material row is a *sibling pack's* roster test, which is
 * where the bare-string toxicity finally threw.
 *
 * This is the guard the MR lacked: it runs the SAME
 * `PersistentHydrator.hydrate` field-setter path the live clone pipeline
 * runs, over each material row this MR introduces — so a malformed field
 * throws here, in the build's own suite, instead of in another pack's.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join } from 'path';
import YAML from 'yaml';
import Material from '../Material';
import PersistentHydrator from '../../../platform/idea/persistence/PersistentHydrator';
import { QuantityMarshaller } from '../../../platform/idea/persistence/QuantityMarshaller';
import type { Unit } from '../../quantity';
import {
  makeStuff,
  registerMarshallerForTest,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

/**
 * Material fields the shared v1 helper does not cover — a real material
 * row uses more quantity units than any synthetic-fixture test needed, so
 * the hydrator's per-field marshaller lookup would otherwise try to clone
 * one from Mongo. `latentHeatOfFusion`/`latentHeatOfVaporization` are
 * `J/kg`; `heatOfCombustion` is `MJ/kg`.
 */
const EXTRA_MATERIAL_UNITS: ReadonlyArray<Unit> = ['J/kg', 'MJ/kg', 'S/m'];

function installMaterialMarshallers(): void {
  installV1QuantityMarshallers();
  for (const unit of EXTRA_MATERIAL_UNITS) {
    registerMarshallerForTest(() => {
      const m = new QuantityMarshaller<typeof unit>();
      (m as unknown as { unit: Unit }).unit = unit;
      return m;
    }, QuantityMarshaller.pathFor(unit));
  }
}

const CONTENT = fileURLToPath(new URL('../../../../../../content', import.meta.url));

/**
 * The material rows THIS MR introduced (`git diff --name-status
 * origin/master...HEAD -- '*​/idea/material/*.yaml'`). A new material row
 * added by a later wave belongs on this list.
 */
const INJURY_MATERIAL_ROWS = [
  'base-library/content/stuff/idea/material/bulk/vitriol.yaml',
  'base-library/content/stuff/idea/material/caustic/quicklime.yaml',
  'base-library/content/stuff/idea/material/element/lead.yaml',
];

function rowData(rel: string): Record<string, unknown> {
  const parsed = YAML.parse(readFileSync(join(CONTENT, rel), 'utf8')) as {
    data?: Record<string, unknown>;
  };
  return parsed.data ?? {};
}

async function hydrate(rel: string): Promise<Material> {
  const material = makeStuff(() => new Material());
  const hydrator = makeStuff(() => new PersistentHydrator());
  await hydrator.hydrate(material as never, rowData(rel));
  return material;
}

describe("the injury MR's material rows hydrate cleanly", () => {
  beforeAll(() => installMaterialMarshallers());

  for (const rel of INJURY_MATERIAL_ROWS) {
    const name = rel.split('/').pop();
    it(`hydrates ${name} through the real field-setter path`, async () => {
      // If any authored field is malformed for its setter (the bare-string
      // toxicity that shipped in lead), this rejects — the whole point.
      await expect(hydrate(rel)).resolves.toBeInstanceOf(Material);
    });
  }

  it('⭐ lead names a well-formed ToxinTag — the exact bug this guards', async () => {
    const lead = await hydrate(
      'base-library/content/stuff/idea/material/element/lead.yaml',
    );
    const tox = lead.getToxicity();
    expect(tox.length).toBeGreaterThan(0);
    // A `{type, amount}` object, never a bare string.
    expect(tox[0]).toMatchObject({
      type: expect.any(String),
      amount: expect.any(Number),
    });
  });

  it('⭐ vitriol carries its corrosive chemistry — the acid eats metal', async () => {
    const vitriol = await hydrate(
      'base-library/content/stuff/idea/material/bulk/vitriol.yaml',
    );
    expect(vitriol.getCorrosiveTo()).toContain('metal');
  });
});
