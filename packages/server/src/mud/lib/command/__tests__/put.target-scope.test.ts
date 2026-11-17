/**
 * ⭐ `put … in <target>`: your own gear, then what STANDS in the room, then
 * the room itself (size and carrying D17; finalize run 16). On `reachable`
 * alone the place came first — its surface precedes what stands there — so
 * on the rubber works floor `put boot-mould in oven` matched the floor's own
 * `oven` detail and set the mould on the floor, and `fire oven` found it
 * empty (the rubber drive, steps 14–17).
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { CommandApi } from '../../../api/command';
import { CommandDefinition } from '../CommandDefinition';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { makeBody, wornBag } from '../../slot/__tests__/carrying-fixture';
import { makeStuff } from '../../security/__tests__/test-setup';
import Location from '../../location/Location';
import Holder from '../../stuff/Holder';
import type { Stuff } from '../../stuff/Stuff';

const HERE = dirname(fileURLToPath(import.meta.url));
const PUT = join(
  HERE, '..', '..', '..', '..', '..', '..', 'content', 'platform', 'content', 'platform', 'cmd', 'inventory', 'put.yaml',
);

class Oven extends Holder {}

async function target(me: Stuff, room: Stuff, word: string): Promise<unknown> {
  const cmd = CommandDefinition.fromYaml(readFileSync(PUT, 'utf8'), 'put.yaml');
  const ctx = CommandApi.createCommandContext({
    commandGiver: me as never,
    location: room as never,
    commandText: `put x in ${word}`,
    executionId: 'test',
    commandId: 'test',
    verb: 'put',
    command: cmd,
  });
  const r = await CommandApi.resolveModel({ target: word }, ctx);
  if (!('resolved' in r) || r.resolved === undefined) throw new Error('did not resolve');
  return (r.resolved.target as { stuff: unknown }).stuff;
}

describe('put — the target is your gear, then what stands here, then the place', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('⭐ the oven standing on the floor, never the floor\'s own `oven` detail', async () => {
    const room = makeStuff(() => new Location());
    room.setShortDescription('the works floor');
    room.setDetail(['oven'], 'The vulcanizing oven squats at the far end.');
    const oven = makeStuff(() => new Oven());
    oven.setShortDescription('vulcanizing oven');
    oven.setKeywords(['oven', 'vulcanizing oven']);
    ContainmentApi.move(oven, room);
    const { me } = makeBody();
    ContainmentApi.move(me, room);
    expect(await target(me, room, 'oven')).toBe(oven);
  });

  it('your own pouch before a pouch lying on the floor', async () => {
    const room = makeStuff(() => new Location());
    const floorPouch = makeStuff(() => new Oven());
    floorPouch.setShortDescription('pouch');
    floorPouch.setKeywords(['pouch']);
    ContainmentApi.move(floorPouch, room);
    const { me, plan } = makeBody();
    ContainmentApi.move(me, room);
    const mine = wornBag(me, plan, 'pouch', 'waist');
    expect(await target(me, room, 'pouch')).toBe(mine);
  });
});
