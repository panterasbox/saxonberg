/**
 * The `appoint` verb (AC 6) — the surface without which **no position can
 * ever be filled by a human**, which is the same defect as the broken
 * `office assign`, and which every downstream wave depends on.
 *
 * Two halves, tested apart because they run in different phases:
 *
 *   - **The gate** — `mustHoldAppointingAuthority`, a *field* validator on
 *     the organization argument, run by the dispatcher before `execute`.
 *     Driven directly here (preload + body), the way validator suites do.
 *   - **The controller** — driven as the dispatcher would, on the
 *     already-authorized path: the position is filled and the `Employment`
 *     carries the right `organizationPath` and `positionKey`.
 */

import "../../../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import AppointController from '../AppointController';
import mustHoldAppointingAuthority from '../../../../../lib/command/validators/mustHoldAppointingAuthority';
import { OrganizationMixin } from '../../../../../lib/employment/Organization';
import { Idea } from '../../../../../lib/stuff/Idea';
import Avatar from '../../../../agent/Avatar';
import { StuffApi } from '../../../../../api/stuff';
import { EmploymentApi } from '../../../../../api/employment';
import { ExecutionContextApi } from '../../../../../api/execution-context';
import {
  CommandApi,
  type CommandContext,
  type CommandModel,
} from '../../../../../api/command';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import Location from '../../../../../lib/stuff/Location';
import {
  makeStuff,
  makeStuffAtPath,
  withRootContext,
} from '../../../../../lib/security/__tests__/test-setup';
import type { Stuff } from '../../../../../lib/stuff/Stuff';

class OrganizationEntity extends OrganizationMixin(Idea) {
  static _mixinName = 'OrganizationEntity';
}

const ORG = '/compact/press';
const HOLDER = '/platform/agent/Avatar/dave';
const APPOINTEE = '/platform/agent/Avatar/alice';
const POSITION = 'communications-director';

/** A player, which is both a Sensor (so the controller can speak to it)
 *  and Employed (so it can hold a position). */
function makeAvatar(playerId: string): Avatar {
  const av = makeStuffAtPath(() => new Avatar(), `/platform/agent/Avatar/${playerId}`);
  av.setPlayerId(playerId);
  return av;
}

function makeOrg(): OrganizationEntity {
  const org = makeStuffAtPath(() => new OrganizationEntity(), ORG);
  org.appointingAuthority = { kind: 'entity', path: HOLDER };
  org.positions = [
    {
      key: POSITION,
      label: 'speaking for the Compact',
      wageRate: 0,
      confers: [],
    },
  ];
  return org;
}

function makeContext(giver: Stuff): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: giver as never,
    location: makeStuff(() => new Location()) as never,
    commandText: 'appoint',
    executionId: 'test',
    commandId: 'test',
    verb: 'appoint',
    command: CommandDefinition.fromYaml(
      'verbs: [appoint]\ncontroller: NoopController\ndescription: stub\n',
      '<test>',
    ),
  });
}

async function run(
  giver: Stuff,
  model: CommandModel,
  ctx: CommandContext,
): Promise<void> {
  await withRootContext(null, 'appoint.test', () => {
    ExecutionContextApi.tagActingAuthor(giver);
    return makeStuff(() => new AppointController()).execute(
      model as never,
      ctx,
    );
  });
}

/** Run the field validator end to end (preload → sync body). */
async function gate(
  giver: Stuff,
  organizationPath: unknown,
): Promise<string | undefined> {
  const ctx = makeContext(giver);
  const allowed = await mustHoldAppointingAuthority.preload!(
    organizationPath,
    'organization',
    ctx,
  );
  return mustHoldAppointingAuthority(
    organizationPath,
    'organization',
    ctx,
    allowed,
  );
}

describe('mustHoldAppointingAuthority', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  it('admits the holder of the organization’s appointing authority', async () => {
    makeOrg();
    const dave = makeAvatar('dave');
    await expect(gate(dave as unknown as Stuff, ORG)).resolves.toBeUndefined();
  });

  it('refuses somebody who does not hold it', async () => {
    makeOrg();
    const stranger = makeAvatar('stranger');
    await expect(
      gate(stranger as unknown as Stuff, ORG),
    ).resolves.toMatch(/authority/);
  });

  it('fails closed on a path that is not an organization, or is nothing', async () => {
    makeOrg();
    const dave = makeAvatar('dave');
    await expect(
      gate(dave as unknown as Stuff, '/compact/nothing-here'),
    ).resolves.toMatch(/authority/);
    await expect(gate(dave as unknown as Stuff, '')).resolves.toMatch(
      /authority/,
    );
    await expect(gate(dave as unknown as Stuff, undefined)).resolves.toMatch(
      /authority/,
    );
  });

  it('fails closed on an organization with no authored authority', async () => {
    const org = makeStuffAtPath(() => new OrganizationEntity(), ORG);
    org.positions = [
      { key: POSITION, label: 'x', wageRate: 0, confers: [] },
    ];
    const anyone = makeAvatar('dave');
    await expect(gate(anyone as unknown as Stuff, ORG)).resolves.toMatch(
      /authority/,
    );
  });
});

describe('AppointController', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  it('fills the position, with the right organizationPath and positionKey (AC 6)', async () => {
    const org = makeOrg();
    const dave = makeAvatar('dave');
    const alice = makeAvatar('alice');
    const ctx = makeContext(dave as unknown as Stuff);

    await run(
      dave as unknown as Stuff,
      {
        target: { stuff: alice },
        position: POSITION,
        organization: ORG,
      } as unknown as CommandModel,
      ctx,
    );

    const record = alice.getEmployment(ORG);
    expect(record).toBeDefined();
    expect(record!.organizationPath).toBe(ORG);
    expect(record!.positionKey).toBe(POSITION);
    expect(record!.status).toBe('employed');
    // ...and the chart now answers who holds it.
    expect(org.holdersOf(POSITION)).toEqual([APPOINTEE]);
    expect(ctx.getNotes().some((n) => n.kind === 'controller-rejected')).toBe(
      false,
    );
  });

  it('rejects an unknown position rather than inventing one', async () => {
    makeOrg();
    const dave = makeAvatar('dave');
    const alice = makeAvatar('alice');
    const ctx = makeContext(dave as unknown as Stuff);

    await run(
      dave as unknown as Stuff,
      {
        target: { stuff: alice },
        position: 'chief-astrologer',
        organization: ORG,
      } as unknown as CommandModel,
      ctx,
    );

    expect(alice.getEmployment(ORG)).toBeUndefined();
    expect(
      ctx.getNotes().some((n) => n.kind === 'controller-rejected'),
    ).toBe(true);
  });

  it('rejects an organization that is not standing', async () => {
    const dave = makeAvatar('dave');
    const alice = makeAvatar('alice');
    const ctx = makeContext(dave as unknown as Stuff);

    await run(
      dave as unknown as Stuff,
      {
        target: { stuff: alice },
        position: POSITION,
        organization: '/compact/nothing-here',
      } as unknown as CommandModel,
      ctx,
    );

    expect(
      ctx.getNotes().some((n) => n.kind === 'controller-rejected'),
    ).toBe(true);
  });
});
