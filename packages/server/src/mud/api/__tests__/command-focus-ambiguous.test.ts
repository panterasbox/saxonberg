/**
 * Dispatcher × focus after a DISAMBIGUATION PROMPT.
 *
 * ⭐ The focus is an MQL fragment, and `$focus` RE-RESOLVES it on every
 * later command that defaults to it (`look` declares
 * `default: "$focus"`). So storing the keyword the player typed, after
 * they were asked to choose between eleven things that matched it,
 * stores the ambiguity itself: the next bare `look` re-resolves eleven
 * matches and asks again, and again.
 *
 * A live drive at a distributor's counter holding eleven bottles of gin
 * walked into exactly that and could not walk out — and because a
 * command sent while a prompt is open produces no response at all, the
 * session simply went silent.
 *
 * The rule: **a disambiguated pick anchors on the THING**
 * (`#<stuffId>`, a viewer-free seed that resolves to exactly one Stuff
 * and still chains for drilling). An UNambiguous match keeps the
 * player's own word — it still names one thing, and it is what `focus`
 * shows them.
 *
 * ⚠ Driven through the real prompt: the binder's `await` is left
 * in flight and settled with `PromptApi.handleResponse`, exactly as the
 * wire does. A test that resolved the ambiguity some cheaper way would
 * not be testing this.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import { CommandApi, type CommandContext } from '../command';
import { CommandDefinition } from '../../lib/command/CommandDefinition';
import { ContainmentApi } from '../containment';
import { EventApi } from '../event';
import { MqlApi } from '../mql';
import { PromptApi } from '../prompt';
import { ShadowApi } from '../shadow';
import { StuffApi } from '../stuff';
import Prop from '../../platform/thing/Prop';
import { makeHarness, type Harness } from './card-harness';

/** Mirrors the shipped `look.yaml`: drill-first scope, extend, prompt. */
function lookCommand(): CommandDefinition {
  return CommandDefinition.fromYaml(
    [
      'verbs: [look]',
      'controller: LookController',
      'description: examine',
      'args:',
      '  - name: target',
      '    type: object',
      '    required: false',
      '    scope: ["$focus", "reachable"]',
      '    updates_focus: extend',
      '    onExcess: prompt',
    ].join('\n'),
    '<test>'
  );
}

function makeContext(h: Harness, command: CommandDefinition, text: string): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: h.avatar as unknown as CommandContext['commandGiver'],
    interactive: h.interactive,
    location: h.room as unknown as Parameters<typeof CommandApi.createCommandContext>[0]['location'],
    commandText: text,
    executionId: 'test-exec',
    commandId: 'test-cmd',
    verb: command.getPrimaryVerb(),
    command,
  });
}

/** The promptId the server just minted, read off the prompt envelope. */
function latestPromptId(h: Harness): string {
  const prompts = h.ofType('prompt');
  return prompts[prompts.length - 1]!.promptId as string;
}

/**
 * The matches the server offered.
 *
 * ⚠ The FIRST prompt envelope carrying them, not the last: answering
 * ships a second `prompt` envelope (the dismissal), and it has no
 * matches — reading the last one reports zero and reads as "the server
 * offered nothing."
 */
function offeredMatches(h: Harness): { stuffId: string; displayName: string }[] {
  for (const e of h.ofType('prompt')) {
    const notes = (e as unknown as {
      outcome: { notes: { matches?: { stuffId: string; displayName: string }[] }[] };
    }).outcome.notes;
    const m = notes[0]?.matches;
    if (m && m.length > 0) return m;
  }
  return [];
}

describe('focus after a disambiguation prompt', () => {
  let h: Harness;
  let bottles: Prop[];

  beforeEach(async () => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    PromptApi._clearAllForTesting();
    h = await makeHarness('Keeper');

    // Three things that all answer to `gin`. The shipped counter has
    // eleven; three is the same fact.
    bottles = [];
    for (let i = 0; i < 3; i++) {
      const b = await StuffApi.create(() => new Prop());
      b.setShortDescription('a bottle of gin');
      b.addKeyword('gin');
      ContainmentApi.move(
        b as unknown as Parameters<typeof ContainmentApi.move>[0],
        h.room as unknown as Parameters<typeof ContainmentApi.move>[1]
      );
      bottles.push(b);
    }

    const lamp = await StuffApi.create(() => new Prop());
    lamp.setShortDescription('a brass lamp');
    lamp.addKeyword('lamp');
    ContainmentApi.move(
      lamp as unknown as Parameters<typeof ContainmentApi.move>[0],
      h.room as unknown as Parameters<typeof ContainmentApi.move>[1]
    );
  });

  /** Run `look <kw>`, answering any prompt with its first match. */
  async function lookAnswering(kw: string): Promise<void> {
    const ctx = makeContext(h, lookCommand(), `look ${kw}`);
    const inFlight = CommandApi.resolveAndValidate({ target: kw }, ctx);
    // Give the binder a turn to reach the prompt, then settle it.
    await new Promise((r) => setTimeout(r, 0));
    const prompts = h.ofType('prompt');
    if (prompts.length > 0) {
      const matches = offeredMatches(h);
      if (matches.length > 0) {
        PromptApi.handleResponse(h.interactive, {
          promptId: latestPromptId(h),
          response: matches[0]!.stuffId,
        });
      }
    }
    await inFlight;
  }

  it('offers every match, then anchors focus on the one picked', async () => {
    await lookAnswering('gin');

    expect(offeredMatches(h)).toHaveLength(3);
    const focus = h.avatar.getFocus();
    expect(focus).not.toBe('gin');
    expect(focus).toMatch(/^#/);
    expect(bottles.some((b) => focus === `#${b.stuffId}`)).toBe(true);
  });

  it('the stored focus resolves to exactly one thing — the loop is closed', async () => {
    await lookAnswering('gin');

    const focus = h.avatar.getFocus();
    const again = MqlApi.resolveMany(focus, {
      commandGiver: h.avatar as unknown as Parameters<
        typeof MqlApi.resolveMany
      >[1]['commandGiver'],
      scope: focus,
    });
    expect(again.stuff).toHaveLength(1);
  });

  it('an UNambiguous match keeps the word the player typed', async () => {
    await lookAnswering('lamp');

    expect(h.ofType('prompt')).toHaveLength(0);
    const focus = h.avatar.getFocus();
    expect(focus).not.toMatch(/^#/);
    expect(focus).toContain('lamp');
  });
});
