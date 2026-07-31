/**
 * Escape battery — LOOKUP: MQL resolution hygiene + the proxy
 * backstop. Circle-context MQL (`reachable`) never resolves a field
 * object even when one is physically present in the pool's walk; the
 * omni/system mode sees everything; and even a leaked reference denies
 * at dispatch. Fails without the resolver's `filterScopeCompatible`
 * pass (and, independently, without the proxy check).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StuffApi } from '../../../../api/stuff';
import { MqlApi } from '../../../../api/mql';
import { ContainmentApi } from '../../../../api/containment';
import { ContainerMixin } from '../../../spatial/Container';
import { ContainableMixin } from '../../../spatial/Containable';
import Location from '../../../stuff/Location';
import {
  ExecutionContextApi,
  OMNI_SCOPE,
} from '../../../../api/execution-context';
import { SecurityError } from '../../../security/errors';
import { Idea } from '../../../stuff/Idea';
import type { Stuff } from '../../../stuff/Stuff';
import type { CommandGiver } from '../../../command/CommandGiver';

const SCOPE = '/home/escape-tester';

class TestActor extends ContainerMixin(ContainableMixin(Idea)) {}
class Contraband extends ContainableMixin(Idea) {
  public snatch(): void {}
}

function reachableFrom(actor: Stuff): Stuff[] {
  return MqlApi.resolveMany('reachable', {
    commandGiver: actor as unknown as Stuff & CommandGiver,
    scope: 'reachable',
  }).stuff;
}

describe('sandbox-escape: lookup', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  afterEach(() => {
    ExecutionContextApi._clearForTesting();
  });

  async function stageRoomWithContraband(): Promise<{
    actor: TestActor;
    circleItem: Contraband;
    fieldItem: Contraband;
  }> {
    // The circle's little world (room, actor, an in-scope item)…
    const staged = (await ExecutionContextApi.runRootGuarded(
      null,
      'stage',
      async () => {
        const room = await StuffApi.create(() => new Location());
        const actor = await StuffApi.create(() => new TestActor());
        const circleItem = await StuffApi.create(() => new Contraband());
        ContainmentApi.move(actor, room);
        ContainmentApi.move(circleItem, room);
        return { actor, circleItem, room };
      },
      'rethrow',
      { circleScope: SCOPE }
    ))!;
    // …with one FIELD object physically smuggled into the pool's walk
    // by system context (the adversarial setup).
    const fieldItem = await StuffApi.create(() => new Contraband());
    ExecutionContextApi.runRoot(
      null,
      'smuggle',
      () => {
        ContainmentApi.move(fieldItem, staged.room);
      },
      { circleScope: OMNI_SCOPE }
    );
    return { actor: staged.actor, circleItem: staged.circleItem, fieldItem };
  }

  it('circle-context reachable excludes the field object; omni sees it', async () => {
    const { actor, circleItem, fieldItem } = await stageRoomWithContraband();

    ExecutionContextApi.runRoot(
      null,
      'escape',
      () => {
        const ids = reachableFrom(actor).map((s) => s.stuffId);
        expect(ids).toContain(circleItem.stuffId);
        expect(ids).not.toContain(fieldItem.stuffId);
      },
      { circleScope: SCOPE }
    );

    ExecutionContextApi.runRoot(
      null,
      'maintenance',
      () => {
        const ids = reachableFrom(actor).map((s) => s.stuffId);
        expect(ids).toContain(fieldItem.stuffId);
      },
      { circleScope: OMNI_SCOPE }
    );
  });

  it('the backstop: a leaked reference still denies on dispatch', async () => {
    const { fieldItem } = await stageRoomWithContraband();
    ExecutionContextApi.runRoot(
      null,
      'escape',
      () => {
        expect(() => fieldItem.snatch()).toThrow(SecurityError);
      },
      { circleScope: SCOPE }
    );
  });
});
