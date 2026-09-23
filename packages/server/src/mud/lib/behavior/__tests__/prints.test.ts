/**
 * The `prints` beat (economic bootstrap D20): the editor puts the price
 * index in print as the paper, once an edition window of GAME time, in
 * words, through the literal `press post` — and not again until the
 * window has passed, whatever the real cadence does.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { brain as prints } from '../prints';
import type { BrainContext } from '../brain';
import { Idea } from '../../stuff/Idea';
import { CommandGiverMixin } from '../../command/CommandGiver';
import { SensorMixin } from '../../message/Sensor';
import { ContainerMixin } from '../../spatial/Container';
import { ContainableMixin } from '../../spatial/Containable';
import { BankingApi } from '../../../api/banking';
import { AppApi } from '../../../api/app';
import { WorldClockApi } from '../../../api/worldclock';
import { StuffApi } from '../../../api/stuff';
import { makeStuffAtPath } from '../../security/__tests__/test-setup';

class TestEditor extends CommandGiverMixin(SensorMixin(ContainerMixin(ContainableMixin(Idea)))) {
  static _mixinName = 'TestEditorPrints';
  typed: string[] = [];
  protected handleMessage(): void {}
  protected handleEnvelope(): void {}
  // The print is the editor's OWN act (non-forced — a forced frame is
  // unattributable, and a release derives its author from the frame).
  async executeCommand(line: string): Promise<void> {
    this.typed.push(line);
  }
  async forceCommand(): Promise<void> {
    throw new Error('the print must not be a forced frame');
  }
}

let editor: TestEditor;
let now = 0;

/** Set the clock to `gameSeconds` — the provider gives REAL ms, the clock scales them. */
function atGameSeconds(gameSeconds: number): void {
  now = (gameSeconds * 1000) / WorldClockApi.getScale();
}

function ctxFor(state: Record<string, unknown>): BrainContext {
  return {
    host: editor as never,
    config: { publisher: '/test/gazette' },
    state,
    trigger: { source: 'cadence', raw: 'cadence:2m' },
    say: () => {},
    emote: async () => {},
    emoteFree: () => {},
  };
}

beforeEach(() => {
  StuffApi.clearAll();
  WorldClockApi._resetForTesting();
  now = 0;
  WorldClockApi._setNowProviderForTesting(() => now);
  vi.spyOn(AppApi, 'setting').mockImplementation(((key: string) =>
    key === 'press.indexEditionGameHours' ? '6' : '') as never);
  vi.spyOn(BankingApi, 'priceIndex').mockReturnValue({
    counters: ['/test/counter'],
    percent: 104,
    lines: [{ counter: '/test/counter', key: '/test/thing', ask: 13, base: 12 }],
  });
  editor = makeStuffAtPath(() => new TestEditor(), '/test/gazette/agent/editor');
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
});

describe('the Gazette prints the index', () => {
  it('⭐ once an edition window, in words, as the paper — and not again until the window has passed', async () => {
    const state: Record<string, unknown> = {};
    await prints.act(ctxFor(state));
    expect(editor.typed).toEqual([
      'press post "Prices: the basket stands at one hundred and four against a base of one hundred" --as /test/gazette --kind notice',
    ]);
    // Two game hours on: the same edition.
    atGameSeconds(2 * 3600);
    await prints.act(ctxFor(state));
    expect(editor.typed).toHaveLength(1);
    // Six: the next.
    atGameSeconds(6 * 3600);
    await prints.act(ctxFor(state));
    expect(editor.typed).toHaveLength(2);
  });

  it('prints nothing when no basket counter answers', async () => {
    vi.spyOn(BankingApi, 'priceIndex').mockReturnValue({ counters: [], percent: 100, lines: [] });
    await prints.act(ctxFor({}));
    expect(editor.typed).toEqual([]);
  });

  it('the window is the Schedule\'s', async () => {
    vi.spyOn(AppApi, 'setting').mockImplementation(((key: string) =>
      key === 'press.indexEditionGameHours' ? '1' : '') as never);
    const state: Record<string, unknown> = {};
    await prints.act(ctxFor(state));
    atGameSeconds(3600);
    await prints.act(ctxFor(state));
    expect(editor.typed).toHaveLength(2);
  });
});
