/**
 * SoulController — the author face over the emote catalogue: `soul
 * search <term>` renders what `SoulApi.search` finds; `soul edit <verb>
 * searchTerms <list>` patches `searchTerms` (the field that replaced
 * `aliases`); `soul show` prints `search terms:`.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import SoulController from '../SoulController';
import { SoulApi } from '../../../../api/soul';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import { Emote } from '../../../../lib/social/Emote';
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { CommandContext } from '../../../../api/command';

let captured: string;

function captureBody(): void {
  captured = '';
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.meta = () => b;
    b.toSelf = (body: Mml) => {
      captured = body.toString();
      return b;
    };
    b.send = () => {};
    return b as never;
  });
}

function ctx(): CommandContext {
  return { commandGiver: {} as Stuff, note: vi.fn() } as unknown as CommandContext;
}

function emote(verb: string, searchTerms: string[] = []): Emote {
  const e = new Emote();
  e.verb = verb;
  e.searchTerms = searchTerms;
  e.grammar = { slots: {}, template: `${verb}s` };
  return e;
}

beforeEach(() => {
  captureBody();
  vi.spyOn(MixinApi, 'isAuthor').mockReturnValue(true as never);
});
afterEach(() => vi.restoreAllMocks());

describe('SoulController', () => {
  it('soul search <term> lists what the catalogue search finds', async () => {
    const search = vi.spyOn(SoulApi, 'search').mockResolvedValue([emote('greet', ['hi'])]);
    await makeStuff(() => new SoulController()).execute({ subcommand: 'search', verb: 'hi' } as never, ctx());
    expect(search).toHaveBeenCalledWith('hi');
    expect(captured).toContain("'hi' finds (1)");
    expect(captured).toContain('greet');
  });

  it('soul search reports an empty result honestly', async () => {
    vi.spyOn(SoulApi, 'search').mockResolvedValue([]);
    await makeStuff(() => new SoulController()).execute({ subcommand: 'search', verb: 'zzz' } as never, ctx());
    expect(captured).toContain("No emote matches 'zzz'");
  });

  it('soul edit <verb> searchTerms <list> patches searchTerms', async () => {
    const edit = vi.spyOn(SoulApi, 'edit').mockResolvedValue(emote('greet', ['hi', 'hello']));
    await makeStuff(() => new SoulController()).execute(
      { subcommand: 'edit', verb: 'greet', field: 'searchTerms', value: '[hi, hello]' } as never,
      ctx(),
    );
    expect(edit).toHaveBeenCalledWith('greet', { searchTerms: ['hi', 'hello'] });
    expect(captured).toContain("Updated emote 'greet'");
  });

  it('soul edit rejects the retired aliases field', async () => {
    const c = ctx();
    await makeStuff(() => new SoulController()).execute(
      { subcommand: 'edit', verb: 'greet', field: 'aliases', value: '[hi]' } as never,
      c,
    );
    expect(c.note).toHaveBeenCalledWith(expect.objectContaining({ reason: 'unknown-field' }));
  });

  it('soul show prints the search terms', async () => {
    vi.spyOn(SoulApi, 'resolve').mockResolvedValue(emote('greet', ['hi', 'hello']));
    await makeStuff(() => new SoulController()).execute({ subcommand: 'show', verb: 'greet' } as never, ctx());
    expect(captured).toContain('search terms: hi, hello');
    expect(captured).not.toContain('aliases');
  });
});
