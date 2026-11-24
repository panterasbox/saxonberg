/**
 * The `apps` verb (aether-devices D3): list, install, uninstall on the
 * device you carry; the device decides. Plus the affordance: a carried
 * device hands `apps` to its bearer, and a person's own host does not
 * hand it to the person.
 */

import "../../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import AppsListController from '../AppsListController';
import AppsInstallController from '../AppsInstallController';
import AppsUninstallController from '../AppsUninstallController';
import App from '../../../App';
import AetherImplant from '../../../../thing/AetherImplant';
import Place from '../../../../../lib/stuff/Place';
import { CommandGiverMixin } from '../../../../../lib/command/CommandGiver';
import { SensorMixin } from '../../../../../lib/message/Sensor';
import { ContainableMixin } from '../../../../../lib/spatial/Containable';
import { ContainerMixin } from '../../../../../lib/spatial/Container';
import { NamedMixin } from '../../../../../lib/description/Named';
import { AetherHostMixin } from '../../../../../lib/augmentation/AetherHost';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import { Idea } from '../../../../../lib/stuff/Idea';
import { StuffApi } from '../../../../../api/stuff';
import { ContainmentApi } from '../../../../../api/containment';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../../../../lib/security/__tests__/test-setup';
import { CommandApi, type CommandContext } from '../../../../../api/command';
import type { MqlOneResult } from '../../../../../api/mql';
import type { MessageFrame } from '@saxonberg/types';
import type { Stuff } from '../../../../../lib/stuff/Stuff';
import { TestHarnessApi } from '../../../../../api/test-harness';
import { TemplateApi } from '../../../../../api/template';

/** The app store, as the rows would answer (stream arrival D21). */
const STORE = [
  { key: 'broadcast', path: '/platform/idea/app/broadcast' },
  { key: 'messages', path: App.MESSAGES_PATH },
];

class Person extends AetherHostMixin(
  CommandGiverMixin(NamedMixin(ContainerMixin(SensorMixin(ContainableMixin(Idea))))),
) {
  received: MessageFrame[] = [];
  protected override handleMessage(msg: unknown): void {
    this.received.push(msg as MessageFrame);
  }
}

function ctx(p: Person, source: Stuff | undefined, verb = 'apps'): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: p as unknown as CommandContext['commandGiver'],
    location: null,
    commandText: verb,
    executionId: 't',
    commandId: 'c',
    verb: 'apps',
    command: CommandDefinition.fromYaml(
      'verbs: [apps]\ncontroller: NoopController\ndescription: stub\n',
      '<test>',
    ),
    ...(source ? { commandSource: source } : {}),
  });
}

const said = (p: Person): string =>
  p.received.map((f) => String(f.body ?? '')).join('\n');

describe('apps', () => {
  let person: Person;
  let implant: AetherImplant;

  beforeEach(async () => {
    vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
      const a = makeStuff(() => new App());
      stampTemplatePathForTest(a, path);
      a.appName = 'Messages';
      return a;
    }) as never);
    const room = makeStuff(() => new Place());
    person = makeStuff(() => new Person());
    person.setName('Ana');
    ContainmentApi.move(person as never, room as never);
    implant = makeStuff(() => new AetherImplant());
    vi.spyOn(TemplateApi, 'appStore').mockReturnValue({
      published: async () => STORE,
      lookup: async (k: string) => {
        const found = STORE.find((a) => a.key === k);
        return found ? { found } : { missing: true };
      },
    } as never);
    await implant.installApp(App.MESSAGES_PATH);
    ContainmentApi.move(implant as never, person as never);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('a carried device affords `apps` to its bearer', () => {
    const verbs = person.getAffordances().map((a) => a.command.getPrimaryVerb());
    expect(verbs).toContain('apps');
    const aff = person.getAffordances().find((a) => a.command.getPrimaryVerb() === 'apps');
    expect(aff?.source).toBe(implant);
  });

  it('lists what the device runs, and what the store has that it does not', async () => {
    await ((ctx$) => TestHarnessApi.actAs(ctx$.commandGiver, () => makeStuff(() => new AppsListController()).execute({} as never, ctx$)))(ctx(person, implant));
    expect(said(person)).toMatch(/runs: Messages/);
    expect(said(person)).toMatch(/app store has: broadcast/);
    expect(said(person)).not.toMatch(/app store has:.*messages/);
  });

  it('uninstall then install round-trips', async () => {
    const c1 = ctx(person, implant);
    await TestHarnessApi.actAs(c1.commandGiver, () => makeStuff(() => new AppsUninstallController()).execute({ app: 'the messages' } as never, c1));
    expect(implant.hasApp('messages')).toBe(false);
    expect(said(person)).toMatch(/You uninstall Messages/);

    await ((ctx$) => TestHarnessApi.actAs(ctx$.commandGiver, () => makeStuff(() => new AppsInstallController()).execute({ app: 'messages' } as never, ctx$)))(ctx(person, implant));
    expect(implant.hasApp('messages')).toBe(true);
    expect(said(person)).toMatch(/You install Messages/);
  });

  it('an unknown app answers with what is offered', async () => {
    await implant.uninstallApp('messages');
    const c = ctx(person, implant);
    await TestHarnessApi.actAs(c.commandGiver, () => makeStuff(() => new AppsInstallController()).execute({ app: 'chess' } as never, c));
    // ⭐ Named by the one rule (naming overhaul D-C5): an unknown word is
    // `no-such-name`, listing what could have been named.
    const refused = c.getNotes().find((n) => n.kind === 'refused');
    expect(refused).toMatchObject({ reason: 'no-such-name' });
    expect(JSON.stringify(refused)).toMatch(/chess/);
    // …and what could have been named is the store's (stream arrival D21).
    expect(JSON.stringify(refused)).toMatch(/broadcast/);
    expect(JSON.stringify(refused)).toMatch(/messages/);
  });

  it('a non-device source (a person host) has nothing to act on', async () => {
    const c = ctx(person, person);
    await TestHarnessApi.actAs(c.commandGiver, () => makeStuff(() => new AppsListController()).execute({} as never, c));
    expect(c.getNotes().find((n) => n.kind === 'refused')).toMatchObject({ reason: 'no-device' });
  });

  it('`on <device>` picks the named device', async () => {
    const named = { stuff: implant, raw: 'implant' } as unknown as MqlOneResult;
    await ((ctx$) => TestHarnessApi.actAs(ctx$.commandGiver, () => makeStuff(() => new AppsListController()).execute({ device: named } as never, ctx$)))(ctx(person, undefined));
    expect(said(person)).toMatch(/runs: Messages/);
  });

  it('a key the store does not publish (the person\'s wallet) is refused, naming the store', async () => {
    const c = ctx(person, implant);
    await TestHarnessApi.actAs(c.commandGiver, () => makeStuff(() => new AppsInstallController()).execute({ app: 'wallet' } as never, c));
    expect(c.getNotes().find((n) => n.kind === 'refused')).toMatchObject({ reason: 'no-such-name' });
    expect(implant.hasApp('wallet')).toBe(false);
  });

  it('installs a published app the device did not ship with', async () => {
    const c = ctx(person, implant);
    await TestHarnessApi.actAs(c.commandGiver, () => makeStuff(() => new AppsInstallController()).execute({ app: 'broadcast' } as never, c));
    expect(implant.hasApp('broadcast')).toBe(true);
  });
});
