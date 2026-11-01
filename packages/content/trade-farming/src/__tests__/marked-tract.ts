/**
 * A tract of ONE field over the whole of it, built by hand with no rows —
 * the shape every unit test of the grass, the seedbed and the grazing
 * ledger stands on since those moved onto the field (tracts build D24).
 * Test-only; lives under `__tests__/`.
 */

import Tract, { type FieldSpec } from '../location/Tract';
import Field from '../thing/Field';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';

export function markedField(area: number, key = 'sward'): Field {
  const tract = makeStuff(() => new Tract());
  tract.setAreaM2(area);
  const spec: FieldSpec = { key, name: `the ${key}`, share: 1 };
  tract.fields = [spec];
  const field = makeStuff(() => new Field());
  tract.addFixture(field, `field:${key}`);
  field.configureField(spec, area);
  field.installSward();
  return field;
}
