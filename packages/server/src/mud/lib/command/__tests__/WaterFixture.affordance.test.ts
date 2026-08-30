/**
 * ⭐ **A person standing at a basin can see `wash`.** No test asserted
 * that, and it was false everywhere `wash` shipped.
 *
 * `wash` was declared on `UnboundedReceptacle` in the `environment`
 * bucket. `environment` grants OUTWARD, to the containers ABOVE a thing
 * — the rule that makes a rock in a bag in your pack still hand you
 * `throw`. A basin stands in the room as the player's SIBLING, and
 * nobody carries a basin, so the verb reached nobody: not at the bar
 * basin, the water tap, the dorm tap, the standpipe, or the generic
 * basin. Every other `environment`-only contributor in the tree
 * (Wieldable, PaymentCard, WateringCan, the Whistle) is a CARRIED thing,
 * which is exactly what that bucket means; this was the one fixture
 * among them.
 *
 * The controller tests passed the whole time, because they call the
 * controller. **Affordance is wiring, and wiring needs its own
 * assertion.**
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import { makeStuff } from '../../security/__tests__/test-setup';
import { Idea } from '../../stuff/Idea';
import { ContainerMixin } from '../../spatial/Container';
import { ContainableMixin } from '../../spatial/Containable';
import { CommandGiverMixin } from '../CommandGiver';
import { ContainmentApi } from '../../../api/containment';
import { CommandApi } from '../../../api/command';
import { StuffApi } from '../../../api/stuff';
import WaterFixture from '../../../platform/thing/WaterFixture';
import UnboundedReceptacle from '../../../platform/thing/UnboundedReceptacle';

class Room extends ContainerMixin(Idea) {}
class Player extends ContainerMixin(
  CommandGiverMixin(ContainableMixin(Idea)),
) {}

function verbs(p: Player): string[] {
  return p.getAvailableCommands().flatMap((c) => c.verbs);
}

beforeEach(() => {
  StuffApi.clearAll();
  CommandApi.getCommand('platform/cmd/crafting/wash.yaml');
});

describe('the water fixture affords wash where a person can reach it', () => {
  it('a basin standing in the room hands `wash` to whoever is in it', () => {
    const room = makeStuff(() => new Room());
    const player = makeStuff(() => new Player());
    const basin = makeStuff(() => new WaterFixture());
    ContainmentApi.move(basin, room);
    ContainmentApi.move(player, room);
    expect(verbs(player)).toContain('wash');
  });

  it('and to someone who walks in afterwards', () => {
    const room = makeStuff(() => new Room());
    const player = makeStuff(() => new Player());
    const basin = makeStuff(() => new WaterFixture());
    ContainmentApi.move(player, room);
    ContainmentApi.move(basin, room);
    expect(verbs(player)).toContain('wash');
  });

  it('and takes it away when the fixture is gone', () => {
    const room = makeStuff(() => new Room());
    const elsewhere = makeStuff(() => new Room());
    const player = makeStuff(() => new Player());
    const basin = makeStuff(() => new WaterFixture());
    ContainmentApi.move(basin, room);
    ContainmentApi.move(player, room);
    expect(verbs(player)).toContain('wash');
    ContainmentApi.move(basin, elsewhere);
    expect(verbs(player)).not.toContain('wash');
  });

  // ⭐ The coffee urn — the other shipped row over `UnboundedReceptacle`,
  // and the reason `wash` could not stay on that class. An inexhaustible
  // source is not a place to wash a glass, and this is NOT the "afford
  // statically, decline diegetically" case: that rule covers a thing
  // which legitimately affords a verb being temporarily unable (a broken
  // anvil hammers again when mended). An urn is not a degraded basin.
  it('a plain unbounded source — the coffee urn — affords nothing', () => {
    const room = makeStuff(() => new Room());
    const player = makeStuff(() => new Player());
    const urn = makeStuff(() => new UnboundedReceptacle());
    ContainmentApi.move(urn, room);
    ContainmentApi.move(player, room);
    expect(verbs(player)).not.toContain('wash');
  });
});
