/**
 * Shared setup for the card-substrate tests.
 *
 * ⚠ A harness, not an abstraction over the thing under test: it stands
 * up an Avatar behind an Interactive and captures envelopes. Nothing
 * here resolves, refreshes or drains a card — every test drives the
 * real entry points, because a helper that nudges the mechanism is how
 * eleven passing tests missed an immortal card.
 */

import { vi } from 'vitest';
import { StuffApi } from '../stuff';
import { EventApi } from '../event';
import { CommandApi } from '../command';
import { ConnectionApi } from '../connection';
import { stampTemplatePathForTest } from '../../lib/security/__tests__/test-setup';
import EventRegistry from '../../obj/EventRegistry';
import Interactive from '../../obj/Interactive';
import Avatar from '../../obj/Avatar';
import { CommandDefinition } from '../../lib/command/CommandDefinition';
import type { CommandContext } from '../command';
import type { CardId } from '@saxonberg/types';

export interface CapturedEnvelope {
  type: string;
  [k: string]: unknown;
}

export interface Harness {
  interactive: Interactive;
  avatar: Avatar;
  envelopes: CapturedEnvelope[];
  /** Envelopes of one type, in arrival order. */
  ofType(type: string): CapturedEnvelope[];
}

async function bootEventRegistry(): Promise<void> {
  const reg = await StuffApi.create(() => new EventRegistry());
  stampTemplatePathForTest(reg, '/obj/EventRegistry');
  EventApi._setRegistryForTesting(reg);
}

export async function makeHarness(name = 'Alice'): Promise<Harness> {
  await bootEventRegistry();
  const avatar = await StuffApi.create(() => new Avatar());
  avatar.setName(name);
  const interactive = await StuffApi.create(
    () => new Interactive('sock-1', 'sess-1', { _id: 'u1' } as never),
  );
  ConnectionApi.transfer(interactive, avatar);
  const envelopes: CapturedEnvelope[] = [];
  vi.spyOn(avatar, 'onEnvelope').mockImplementation((tpl) => {
    envelopes.push(tpl as unknown as CapturedEnvelope);
  });
  return {
    interactive,
    avatar,
    envelopes,
    ofType: (type) => envelopes.filter((e) => e.type === type),
  };
}

/**
 * A real `CommandContext` over a real `CommandDefinition`, so
 * `normalizeKey` runs against the actual parser and the actual verb
 * synonym list rather than against a hand-built stand-in.
 */
export function makeContext(
  h: Harness,
  opts: {
    commandText: string;
    verbs: string[];
    opensCard?: CardId;
  },
): CommandContext {
  const yaml =
    `verbs: [${opts.verbs.join(', ')}]\n` +
    `controller: /obj/command/perception/LookController\n` +
    `description: "harness verb"\n` +
    (opts.opensCard ? `opens_card: ${opts.opensCard}\n` : '') +
    `args:\n  - name: target\n    type: string\n    required: false\n`;
  const def = CommandDefinition.fromYaml(yaml, '/cmd/harness/x.yaml');
  return CommandApi.createCommandContext({
    commandGiver: h.avatar,
    location: null,
    commandText: opts.commandText,
    executionId: 'exec-1',
    commandId: 'cmd-1',
    verb: opts.commandText.split(' ')[0] ?? '',
    command: def,
    interactive: h.interactive,
  });
}
