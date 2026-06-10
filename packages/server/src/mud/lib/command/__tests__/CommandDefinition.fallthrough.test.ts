/**
 * Subcommand-fallthrough tests — Phase 1 of the social cluster build.
 *
 * Covers both the load-time invariant change (opt-in via
 * `fallthrough: true`) and the runtime matcher behavior (Phase 3a
 * fallthrough when the first word isn't a known subcommand). The
 * load-time regression that's NOT covered here lives in
 * `command.unknown-subcommand.test.ts` — every existing subcommanded
 * verb (without the flag) still returns `unknown-subcommand` on a
 * bad first token.
 */

import { describe, it, expect } from 'vitest';
import { CommandApi } from '../../../api/command';
import { CommandLineApi } from '../../../api/command-line';
import { CommandDefinition } from '../CommandDefinition';
import type { Stuff } from '../../stuff/Stuff';
import type Location from '../../stuff/Location';
import type { CommandGiver } from '../CommandGiver';

const ctx = {
  commandGiver: {} as Stuff & CommandGiver,
  location: {} as Location,
};

function defOf(yaml: string): CommandDefinition {
  return CommandDefinition.fromYaml(yaml, '<test>');
}

function assembleText(text: string, def: CommandDefinition) {
  const parsed = CommandLineApi.parsePipeline(text).commands[0]!;
  return CommandApi.assemble(parsed, def, ctx);
}

const CHAT_LIKE_YAML = `
verbs: [chat]
controller: ChatPostController
description: chat-like fallthrough fixture
fallthrough: true
subcommands:
  list:
    controller: ChatListController
    description: list channels
  join:
    controller: ChatJoinController
    description: join a channel
    args:
      - name: channel
        type: string
        required: true
  mute:
    controller: ChatMuteController
    description: mute a channel
    args:
      - name: channel
        type: string
        required: true
args:
  - name: channel
    type: string
    required: true
  - name: message
    type: string
    required: true
    greedy: true
`;

describe('CommandDefinition — fallthrough flag load-time validation', () => {
  it('LOADS a YAML with subcommands + top-level args + fallthrough: true', () => {
    expect(() => defOf(CHAT_LIKE_YAML)).not.toThrow();
  });

  it('exposes `fallthrough = true` on the parsed definition', () => {
    const def = defOf(CHAT_LIKE_YAML);
    expect(def.fallthrough).toBe(true);
    expect(def.hasSubcommands()).toBe(true);
    expect(def.args.length).toBeGreaterThan(0);
  });

  it('REJECTS the same YAML without the `fallthrough` flag', () => {
    const bad = `
verbs: [chat]
controller: ChatPostController
description: missing flag
subcommands:
  list:
    controller: ChatListController
    description: list channels
args:
  - name: channel
    type: string
    required: true
`;
    expect(() => defOf(bad)).toThrow(/Schema validation failed/);
  });

  it('REJECTS `fallthrough: true` when `args:` is missing', () => {
    const bad = `
verbs: [chat]
controller: ChatPostController
description: missing args
fallthrough: true
subcommands:
  list:
    controller: ChatListController
    description: list channels
`;
    expect(() => defOf(bad)).toThrow(/Schema validation failed/);
  });

  it('REJECTS `fallthrough: true` when `subcommands:` is missing', () => {
    const bad = `
verbs: [chat]
controller: ChatPostController
description: missing subcommands
fallthrough: true
args:
  - name: channel
    type: string
    required: true
`;
    expect(() => defOf(bad)).toThrow(/Schema validation failed/);
  });

  it('REJECTS a YAML where the first positional name collides with a subcommand name', () => {
    const collide = `
verbs: [chat]
controller: ChatPostController
description: collision
fallthrough: true
subcommands:
  channel:
    controller: ChatChannelController
    description: channel
args:
  - name: channel
    type: string
    required: true
  - name: message
    type: string
    required: true
    greedy: true
`;
    expect(() => defOf(collide)).toThrow(/collides with subcommand/);
  });

  it('still rejects args + subcommands without fallthrough — preserves the old guard', () => {
    const bad = `
verbs: [foo]
controller: FooController
description: both fields, no flag
args:
  - name: x
    type: string
subcommands:
  list:
    controller: FooListController
    description: list
`;
    expect(() => defOf(bad)).toThrow(/Schema validation failed/);
  });
});

describe('CommandApi.assemble — fallthrough matcher behavior (Phase 3a)', () => {
  const def = defOf(CHAT_LIKE_YAML);

  it('a known subcommand always wins (precedence)', () => {
    const r = assembleText('chat list', def);
    expect('model' in r).toBe(true);
    if ('model' in r) {
      expect(r.model.subcommand).toBe('list');
    }
  });

  it('a known subcommand with its own args binds those args', () => {
    const r = assembleText('chat join gossip', def);
    expect('model' in r).toBe(true);
    if ('model' in r) {
      expect(r.model.subcommand).toBe('join');
      expect(r.model.channel).toBe('gossip');
    }
  });

  it('an unknown first word falls through and binds against top-level args', () => {
    const r = assembleText('chat gossip hi there', def);
    expect('model' in r).toBe(true);
    if ('model' in r) {
      expect(r.model.subcommand).toBeUndefined();
      expect(r.model.channel).toBe('gossip');
      expect(r.model.message).toBe('hi there');
    }
  });

  it('fallthrough bind FAILURE surfaces the original unknown-subcommand error', () => {
    // No second token → the greedy `message` arg can't bind → fall back
    // to unknown-subcommand pointing at the candidate.
    const r = assembleText('chat gossip', def);
    expect('error' in r).toBe(true);
    if ('error' in r) {
      expect(r.error).toBe('unknown-subcommand');
      if (r.error === 'unknown-subcommand') {
        expect(r.subcommand).toBe('gossip');
        expect(r.available).toEqual(expect.arrayContaining(['list', 'join', 'mute']));
      }
    }
  });
});

describe('CommandApi.assemble — non-fallthrough verbs unchanged', () => {
  // Defense-in-depth: an existing pure-subcommand verb still errors on
  // unknown first token. Mirrors `measure / analyze / alias / etc`.
  const pureSubsYaml = `
verbs: [measure]
controller: MeasureController
description: pure subcommands
subcommands:
  light:
    controller: MeasureLightController
    description: light
  temp:
    controller: MeasureTempController
    description: temp
`;

  it('unknown subcommand on a non-fallthrough verb returns unknown-subcommand', () => {
    const def = defOf(pureSubsYaml);
    const r = assembleText('measure bogus', def);
    expect('error' in r).toBe(true);
    if ('error' in r) {
      expect(r.error).toBe('unknown-subcommand');
    }
  });
});
