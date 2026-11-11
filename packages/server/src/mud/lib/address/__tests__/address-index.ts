/**
 * The address index, stood in for a suite with no document store
 * (load-on-use W5). In a running world the index builds on the first
 * address question (`AddressApi.needs` clones the registry, whose
 * `onCreate` indexes every locality); a unit suite has no rows to clone, so
 * it stands an EMPTY index in — "no locality covers this" — and any
 * locality the suite makes registers itself into it as it stands.
 */

import AddressRegistry from '../../../platform/idea/AddressRegistry';
import { AddressApi } from '../../../api/address';
import { StuffApi } from '../../../api/stuff';
import { TemplatePaths } from '../../paths';
import { makeStuffAtPath } from '../../security/__tests__/test-setup';

/** Stand an empty address index in at its path, unless one is live. */
export function standAddressIndex(): void {
  if (StuffApi.findByTemplatePath(TemplatePaths.addressRegistry)) return;
  AddressApi._resetRegistryRefForReload();
  makeStuffAtPath(() => new AddressRegistry(), TemplatePaths.addressRegistry);
}
