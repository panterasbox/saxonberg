/**
 * Wave 8: end-to-end disambiguation through PromptApi.mqlObject.
 *
 * Drives a real command spec (`onExcess: prompt`) through
 * CommandApi.resolveModel. When MQL returns 2+ matches, the
 * dispatcher pushes an `mqlObject` prompt. The synthetic client
 * responds with one of the stuffIds; the controller receives that
 * specific Stuff.
 *
 * Also exercises the cancellation path: a player who cancels the
 * disambiguation prompt rejects the await with PromptCancelledError;
 * the dispatcher catches and emits a cancelled-shape note.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommandApi, type CommandContext } from '../command';
import { PromptApi, PromptCancelledError } from '../prompt';
import { CommandDefinition } from '../../lib/command/CommandDefinition';
import { StuffApi } from '../stuff';
import { ShadowApi } from '../shadow';
import { EventApi } from '../event';
import { Stuff } from '../../lib/stuff/Stuff';
import EventRegistry from '../../platform/idea/EventRegistry';
import Interactive from '../../platform/idea/Interactive';
import Avatar from '../../platform/agent/Avatar';
import Thing from '../../lib/stuff/Thing';
import Location from '../../lib/stuff/Location';
import { ContainmentApi } from '../containment';
import { NamedMixin } from '../../lib/description/Named';

class TestSword extends NamedMixin(Thing) {
  static _mixinName = 'TestSword';
}

async function bootRegistry(): Promise<void> {
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    Stuff._stampTemplatePath(r, '/platform/idea/EventRegistry');
    return r;
  });
  StuffApi.unregister(reg);
  StuffApi.register(reg);
  EventApi._setRegistryForTesting(reg);
}

async function setup(): Promise<{
  avatar: Avatar;
  interactive: Interactive;
  location: Location;
  swords: Thing[];
  envelopes: Array<{ type: string; promptId?: string; outcome?: { notes: Array<{ kind: string; [k: string]: unknown }> } }>;
}> {
  await bootRegistry();
  const location = await StuffApi.create(() => new Location());
  const avatar = await StuffApi.create(() => new Avatar());
  avatar.setName('Alice');
  ContainmentApi.move(avatar, location);

  const rusty = await StuffApi.create(() => {
    const s = new TestSword();
    s.setName('rusty sword');
    return s;
  });
  const iron = await StuffApi.create(() => {
    const s = new TestSword();
    s.setName('iron sword');
    return s;
  });
  ContainmentApi.move(rusty, location);
  ContainmentApi.move(iron, location);

  const interactive = await StuffApi.create(
    () => new Interactive('sock-1', 'sess-1', { _id: 'u1' } as never),
  );
  interactive.transferTo(avatar);

  const envelopes: Array<{ type: string; promptId?: string; outcome?: { notes: Array<{ kind: string }> } }> = [];
  vi.spyOn(avatar, 'onEnvelope').mockImplementation((tpl) => {
    envelopes.push(tpl as unknown as { type: string });
  });
  return { avatar, interactive, location, swords: [rusty, iron], envelopes };
}

/**
 * Flush microtasks until `pred` holds (or a tick cap is hit). The
 * dispatcher pushes the disambiguation prompt after a chain of awaited
 * Api calls (object resolution, access gating, viewer-aware naming);
 * the exact number of microtask hops is an implementation detail, so we
 * yield until the envelope lands rather than guessing a fixed count.
 */
async function flushUntil(
  pred: () => boolean,
  maxTicks = 50,
): Promise<void> {
  for (let i = 0; i < maxTicks && !pred(); i++) {
    await Promise.resolve();
  }
}

function makeContext(args: {
  giver: Stuff;
  location: Stuff;
  interactive: Interactive;
  cmd: CommandDefinition;
  verb: string;
}): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: args.giver as never,
    location: args.location as never,
    commandText: `${args.verb} sword`,
    executionId: 'test',
    commandId: 'test',
    verb: args.verb,
    command: args.cmd,
    interactive: args.interactive,
  });
}

describe('Command disambiguation via PromptApi.mqlObject', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    PromptApi._clearAllForTesting();
  });

  it('object + onExcess: prompt + 2 matches → mqlObject pushed; pick resolves the field', async () => {
    const { avatar, interactive, location, swords, envelopes } = await setup();
    const cmd = CommandDefinition.fromYaml(
      `verbs: [take]
controller: TakeController
description: stub
args:
  - name: target
    type: object
    onExcess: prompt
    scope: "reachable"
`,
      '<test>',
    );

    const ctx = makeContext({
      giver: avatar,
      location,
      interactive,
      cmd,
      verb: 'take',
    });

    // Kick off resolveModel; it will push the prompt and await.
    const resolvePromise = CommandApi.resolveModel({ target: 'sword' }, ctx);

    // Let the prompt push land.
    await flushUntil(() => envelopes.some((e) => e.type === "prompt"));

    const promptEnvelope = envelopes.find((e) => e.type === "prompt");
    expect(promptEnvelope).toBeDefined();
    expect(promptEnvelope!.outcome!.notes[0]!.kind).toBe('prompt-mql-object');
    const promptId = promptEnvelope!.promptId!;

    // Player picks the iron sword (the second match).
    const ironId = swords[1]!.stuffId;
    interactive.handlePromptResponse({
      promptId,
      response: ironId,
    });

    const result = await resolvePromise;
    expect('resolved' in result).toBe(true);
    if ('resolved' in result) {
      const target = result.resolved.target as { stuff: Stuff | null };
      expect(target.stuff).toBe(swords[1]); // iron sword
    }
  });

  it('object + onExcess: prompt + cancel → PromptCancelledError thrown from resolveModel', async () => {
    const { avatar, interactive, location, envelopes } = await setup();
    const cmd = CommandDefinition.fromYaml(
      `verbs: [take]
controller: TakeController
description: stub
args:
  - name: target
    type: object
    onExcess: prompt
    scope: "reachable"
`,
      '<test>',
    );

    const ctx = makeContext({
      giver: avatar,
      location,
      interactive,
      cmd,
      verb: 'take',
    });

    const resolvePromise = CommandApi.resolveModel({ target: 'sword' }, ctx);
    await flushUntil(() => envelopes.some((e) => e.type === "prompt"));

    const promptEnvelope = envelopes.find((e) => e.type === "prompt");
    expect(promptEnvelope).toBeDefined();
    const promptId = promptEnvelope!.promptId!;

    interactive.handlePromptCancel({ promptId });
    await expect(resolvePromise).rejects.toBeInstanceOf(PromptCancelledError);
  });

  it('objects + cardinality: { max: 1 } + onExcess: prompt + 2 matches → mqlMany with bounds', async () => {
    const { avatar, interactive, location, swords, envelopes } = await setup();
    const cmd = CommandDefinition.fromYaml(
      `verbs: [pick]
controller: PickController
description: stub
args:
  - name: targets
    type: objects
    cardinality:
      max: 1
    onExcess: prompt
    scope: "reachable"
`,
      '<test>',
    );

    const ctx = makeContext({
      giver: avatar,
      location,
      interactive,
      cmd,
      verb: 'pick',
    });

    const resolvePromise = CommandApi.resolveModel({ targets: 'sword' }, ctx);
    await flushUntil(() =>
      envelopes.some((e) => e.outcome?.notes[0]?.kind === 'prompt-mql-many'),
    );

    const promptEnvelope = envelopes.find(
      (e) => e.outcome?.notes[0]?.kind === 'prompt-mql-many',
    );
    expect(promptEnvelope).toBeDefined();
    const promptId = promptEnvelope!.promptId!;

    interactive.handlePromptResponse({
      promptId,
      response: JSON.stringify([swords[0]!.stuffId]),
    });

    const result = await resolvePromise;
    expect('resolved' in result).toBe(true);
    if ('resolved' in result) {
      const targets = result.resolved.targets as { stuff: Stuff[] };
      expect(targets.stuff).toEqual([swords[0]]);
    }
  });
});
