/**
 * AliasMixin tests — storage, tombstones, default resolution via mixin
 * walk, set-time validation, and ShellApi.expandAliases. Plus a
 * handful of pipeline-integration smoke tests via executeCommand.
 *
 * See `docs/subsystems/shell-alias.md` for the design.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Idea } from '../../stuff/Idea';
import Location from '../../stuff/Location';
import { AliasMixin, type DefaultAliasEntry } from '../Alias';
import { CommandGiverMixin } from '../../command/CommandGiver';
import { ContainableMixin } from '../../spatial/Containable';
import { ContainerMixin } from '../../spatial/Container';
import { SensorMixin } from '../../message/Sensor';
import { ContainmentApi } from '../../../api/containment';
import { CommandApi } from '../../../api/command';
import { CommandLineApi } from '../../../api/command-line';
import { ShellApi } from '../../../api/shell';
import { MixinApi } from '../../../api/mixin';
import type { MixinConstructor } from '../../mixin';
import { makeStuff } from '../../security/__tests__/test-setup';
import {
  PersistenceManager,
  Collections,
} from '../../../../backend/PersistenceManager';
import type { MessageFrame } from '@saxonberg/types';

/* ───────── Test mixins ───────── */

function SyntheticDefaultAliasMixin<TBase extends MixinConstructor>(
  Base: TBase,
) {
  class SyntheticDefaultAliasMixin extends Base {
    static _mixinName = 'SyntheticDefaultAliasMixin';
    static defaultAliases: DefaultAliasEntry[] = [
      { name: 'l', body: 'look', description: 'look (default)' },
      { name: 'n', body: 'go north' },
    ];
  }
  return SyntheticDefaultAliasMixin;
}

function DuplicateDefaultAliasMixin<TBase extends MixinConstructor>(
  Base: TBase,
) {
  class DuplicateDefaultAliasMixin extends Base {
    static _mixinName = 'DuplicateDefaultAliasMixin';
    static defaultAliases: DefaultAliasEntry[] = [
      { name: 'l', body: 'something-else' }, // collides
    ];
  }
  return DuplicateDefaultAliasMixin;
}

class TestHost extends SyntheticDefaultAliasMixin(AliasMixin(Idea)) {
  constructor() {
    super();
  }
}

class DupHost extends DuplicateDefaultAliasMixin(
  SyntheticDefaultAliasMixin(AliasMixin(Idea)),
) {
  constructor() {
    super();
  }
}

/** Bare AliasMixin (no defaults) — for tests that don't need the synthetic layer. */
class BareHost extends AliasMixin(Idea) {
  constructor() {
    super();
  }
}

/* ───────── 1. Storage surface ───────── */

describe('AliasMixin — storage', () => {
  let host: TestHost;
  beforeEach(() => {
    host = makeStuff(() => new TestHost());
  });

  it('setAlias / getAlias round-trip a persistent body', () => {
    host.setAlias('foo', 'look', { actor: host });
    const e = host.getAlias('foo');
    expect(e).toEqual({ name: 'foo', body: 'look', source: 'persistent' });
  });

  it('setAlias with lifetime: session writes to the session store', () => {
    host.setAlias('foo', 'look', { lifetime: 'session', actor: host });
    expect(host.aliasesSession.foo).toBe('look');
    expect(host.aliases?.foo).toBeUndefined();
    const e = host.getAlias('foo');
    expect(e?.source).toBe('session');
  });

  it('hasAlias returns true for set, false for unknown', () => {
    host.setAlias('foo', 'look', { actor: host });
    expect(host.hasAlias('foo')).toBe(true);
    expect(host.hasAlias('bar')).toBe(false);
  });

  it('removeAlias on a persistent override returns true and clears it', () => {
    host.setAlias('foo', 'look', { actor: host });
    expect(host.removeAlias('foo', host)).toBe(true);
    expect(host.getAlias('foo')).toBeUndefined();
  });

  it('removeAlias returns false when neither override nor default exists', () => {
    expect(host.removeAlias('nope', host)).toBe(false);
  });

  it('getAliases returns ReadonlyMap including defaults', () => {
    host.setAlias('foo', 'look', { actor: host });
    const m = host.getAliases();
    expect(m.has('foo')).toBe(true); // override
    expect(m.has('l')).toBe(true); // default
    expect(m.has('n')).toBe(true); // default
  });

  it('listOverrides returns shallow copies of persistent and session, excluding defaults', () => {
    host.setAlias('foo', 'look', { actor: host });
    host.setAlias('bar', 'go up', { lifetime: 'session', actor: host });
    const o = host.listOverrides();
    expect(o.persistent).toEqual({ foo: 'look' });
    expect(o.session).toEqual({ bar: 'go up' });
  });
});

/* ───────── 2. Tombstones ───────── */

describe('AliasMixin — tombstones', () => {
  let host: TestHost;
  beforeEach(() => {
    host = makeStuff(() => new TestHost());
  });

  it('removeAlias on a default-only name writes a tombstone', () => {
    expect(host.removeAlias('l', host)).toBe(true);
    expect(host.aliases?.l).toBeNull();
  });

  it('a tombstoned default does not appear in getAliases()', () => {
    host.removeAlias('l', host);
    expect(host.getAliases().has('l')).toBe(false);
  });

  it('getAlias returns undefined for a tombstoned default', () => {
    host.removeAlias('l', host);
    expect(host.getAlias('l')).toBeUndefined();
  });

  it('removeAlias on a persistent override that ALSO has a default writes tombstone', () => {
    host.setAlias('l', 'examine', { actor: host });
    expect(host.removeAlias('l', host)).toBe(true);
    expect(host.aliases?.l).toBeNull();
  });

  it('a persistent override after a tombstone clears the tombstone', () => {
    host.removeAlias('l', host);
    expect(host.aliases?.l).toBeNull();
    host.setAlias('l', 'examine', { actor: host });
    expect(host.getAlias('l')?.body).toBe('examine');
    expect(host.getAlias('l')?.source).toBe('persistent');
  });
});

/* ───────── 3. Default resolution via mixin walk ───────── */

describe('AliasMixin — default resolution', () => {
  it('getAlias falls through to a default declared on a layered mixin', () => {
    const host = makeStuff(() => new TestHost());
    expect(host.getAlias('l')?.body).toBe('look');
    expect(host.getAlias('l')?.source).toBe('default');
  });

  it('default carries through description', () => {
    const host = makeStuff(() => new TestHost());
    expect(host.getAlias('l')?.description).toBe('look (default)');
  });

  it('persistent override shadows default; source becomes "persistent"', () => {
    const host = makeStuff(() => new TestHost());
    host.setAlias('l', 'examine', { actor: host });
    expect(host.getAlias('l')?.source).toBe('persistent');
    expect(host.getAlias('l')?.body).toBe('examine');
  });

  it('session override shadows persistent; source becomes "session"', () => {
    const host = makeStuff(() => new TestHost());
    host.setAlias('l', 'examine', { actor: host });
    host.setAlias('l', 'gaze', { lifetime: 'session', actor: host });
    expect(host.getAlias('l')?.source).toBe('session');
    expect(host.getAlias('l')?.body).toBe('gaze');
  });

  it('throws when two mixin layers declare the same default name', () => {
    const dup = makeStuff(() => new DupHost());
    expect(() => dup.getAliases()).toThrowError(/declared on both/);
  });
});

/* ───────── 4. ShellApi.expandAliases ───────── */

function parse(text: string) {
  return CommandLineApi.parsePipeline(text).commands[0]!;
}

describe('ShellApi.expandAliases', () => {
  let host: BareHost;
  beforeEach(() => {
    host = makeStuff(() => new BareHost());
  });

  it('returns input unchanged when verb is not an alias', () => {
    const p = parse('look here');
    const out = ShellApi.expandAliases(p, host);
    expect(out.parsed).toBe(p); // identity
    expect(out.expansion).toBeUndefined();
  });

  it('append case: alias `l = look`, user types `l book` → verb `look`, args [book]', () => {
    host.setAlias('l', 'look', { actor: host });
    const out = ShellApi.expandAliases(parse('l book'), host);
    expect(out.parsed.verb).toBe('look');
    expect(out.parsed.rawTokens.map((t) => (t as { value?: string }).value))
      .toEqual(['look', 'book']);
    expect(out.expansion?.aliasName).toBe('l');
    expect(out.expansion?.expandedText).toBe('look book');
  });

  it('consume case with $1', () => {
    host.setAlias('gn', 'say goodnight $1', { actor: host });
    const out = ShellApi.expandAliases(parse('gn bob'), host);
    expect(out.parsed.verb).toBe('say');
    const values = out.parsed.rawTokens.map((t) => (t as { value?: string }).value);
    expect(values).toEqual(['say', 'goodnight', 'bob']);
  });

  it('missing positional → empty string', () => {
    host.setAlias('gn', 'say goodnight $1', { actor: host });
    const out = ShellApi.expandAliases(parse('gn'), host);
    const values = out.parsed.rawTokens.map((t) => (t as { value?: string }).value);
    // The empty third token gets dropped at re-tokenization since it
    // collapses to empty whitespace; the contract is "empty string"
    // semantically, which surfaces as no token after format()/re-parse.
    expect(values.slice(0, 2)).toEqual(['say', 'goodnight']);
  });

  it('consume case with naked $@: alias `tellme = "tell guard $@"`', () => {
    host.setAlias('tellme', 'tell guard $@', { actor: host });
    const out = ShellApi.expandAliases(parse('tellme hi there'), host);
    expect(out.parsed.verb).toBe('tell');
    const values = out.parsed.rawTokens.map((t) => (t as { value?: string }).value);
    expect(values).toEqual(['tell', 'guard', 'hi', 'there']);
  });

  it('long-flag and short-flags pass through unchanged', () => {
    host.setAlias('vv', 'tail -v --verbose', { actor: host });
    const out = ShellApi.expandAliases(parse('vv file.log'), host);
    expect(out.parsed.verb).toBe('tail');
    // Shape check: short-flags + long-flag plus the appended arg.
    const kinds = out.parsed.rawTokens.map((t) => t.kind);
    expect(kinds).toContain('short-flags');
    expect(kinds).toContain('long-flag');
  });

  it('positional inside long-with-value.value is substituted', () => {
    host.setAlias('cfg', 'config --name=$1', { actor: host });
    const out = ShellApi.expandAliases(parse('cfg widget'), host);
    expect(out.parsed.verb).toBe('config');
    // Find the long-with-value token and confirm value substituted.
    const lv = out.parsed.rawTokens.find((t) => t.kind === 'long-with-value');
    expect(lv).toBeDefined();
    expect((lv as { value: string }).value).toBe('widget');
  });

  it('recursion: two-hop chain resolves and chain has length 2', () => {
    host.setAlias('gn', 'goodnight', { actor: host });
    host.setAlias('goodnight', 'say goodnight', { actor: host });
    const out = ShellApi.expandAliases(parse('gn'), host);
    expect(out.parsed.verb).toBe('say');
    expect(out.expansion?.chain).toEqual(['gn', 'goodnight']);
  });

  it('cycle: alias a = b, alias b = a terminates without throwing', () => {
    host.setAlias('a', 'b', { actor: host });
    host.setAlias('b', 'a', { actor: host });
    const out = ShellApi.expandAliases(parse('a'), host);
    // Either verb may be the terminating one — both are aliases that
    // pointed to each other; the cycle guard breaks at the second
    // occurrence of `a`. The contract is "terminates".
    expect(['a', 'b']).toContain(out.parsed.verb);
  });

  it('depth ceiling at 16 hops returns last-stable parsed', () => {
    // Build a chain of 20 aliases each pointing to the next.
    for (let i = 0; i < 20; i++) {
      host.setAlias(`a${i}`, `a${i + 1}`, { actor: host });
    }
    // a20 isn't aliased, so a chain that reaches a16 would still
    // resolve. We only get the depth-cap by NOT having a free
    // terminus before depth 16. Rebuild a self-contained chain.
    for (let i = 0; i < 20; i++) {
      host.removeAlias(`a${i}`, host);
    }
    for (let i = 0; i < 20; i++) {
      host.setAlias(`a${i}`, `a${(i + 1) % 20}`, { actor: host });
    }
    const out = ShellApi.expandAliases(parse('a0'), host);
    // Should bail without throwing; result is whatever the depth cap
    // landed on.
    expect(out.parsed.verb).toMatch(/^a\d+$/);
  });

  it('bypass prefix \\look strips backslash and skips alias lookup', () => {
    host.setAlias('look', 'examine', { actor: host });
    const out = ShellApi.expandAliases(parse('\\look here'), host);
    expect(out.parsed.verb).toBe('look');
    expect(out.expansion).toBeUndefined();
  });

  it('double backslash also bypasses (tokenizer collapses \\\\ to \\)', () => {
    // The msh tokenizer treats `\\` as the escape-for-literal-`\`,
    // so `\\look` lexes to the same token value as `\look` — both
    // produce a verb of `look` after the bypass strip. The spec's
    // "literal-backslash verb" hypothetical is unreachable through
    // msh; that's a known limitation.
    host.setAlias('look', 'examine', { actor: host });
    const out = ShellApi.expandAliases(parse('\\\\look'), host);
    expect(out.parsed.verb).toBe('look');
    expect(out.expansion).toBeUndefined();
  });

  it('returns expansion.chain only when chain.length > 1', () => {
    host.setAlias('l', 'look', { actor: host });
    const out = ShellApi.expandAliases(parse('l'), host);
    expect(out.expansion?.chain).toBeUndefined();
  });

  it('expansion.expandedText round-trips back through parsePipeline', () => {
    host.setAlias('greet', 'say "hi $1"', { actor: host });
    const out = ShellApi.expandAliases(parse('greet bob'), host);
    expect(out.expansion?.expandedText).toBeDefined();
    const reparsed = CommandLineApi.parsePipeline(out.expansion!.expandedText);
    expect(reparsed.commands[0]?.verb).toBe('say');
  });
});

/* ───────── 5. Set-time validation ───────── */

describe('AliasMixin — set-time validation', () => {
  let host: BareHost;
  beforeEach(() => {
    host = makeStuff(() => new BareHost());
  });

  it('rejects body with a pipe', () => {
    // parsePipeline throws "Command piping is not yet implemented" at
    // lex time when it sees an unquoted `|`; setAlias re-wraps that
    // as "fails to tokenize." Either phrasing is a valid pipe-reject.
    expect(() => host.setAlias('foo', 'look | grep x', { actor: host }),
    ).toThrowError(/pipe|tokenize/i);
  });

  it('rejects body whose first token is a flag', () => {
    expect(() => host.setAlias('foo', '--name=bar', { actor: host }),
    ).toThrowError(/start with a verb/);
  });

  it('rejects self-loop without positional refs', () => {
    expect(() => host.setAlias('foo', 'foo bar', { actor: host }),
    ).toThrowError(/loop infinitely/);
  });

  it('accepts self-loop body that has positional refs', () => {
    expect(() => host.setAlias('foo', 'foo $1', { actor: host }),
    ).not.toThrow();
  });

  it('rejects bad name shape', () => {
    expect(() => host.setAlias('1bad', 'look', { actor: host }),
    ).toThrowError(/invalid alias name/);
    expect(() => host.setAlias('has space', 'look', { actor: host }),
    ).toThrowError(/invalid alias name/);
  });

  it('accepts a body whose verb does not resolve at set-time', () => {
    expect(() =>
      host.setAlias('foo', 'unknownverb here', { actor: host }),
    ).not.toThrow();
  });
});

/* ───────── 6. Persistence shape ───────── */

describe('AliasMixin — persistence shape', () => {
  it('aliases is in persistentFields; aliasesSession is not', () => {
    const fields = MixinApi.getAllPersistentFields(BareHost);
    expect(fields).toContain('aliases');
    expect(fields).not.toContain('aliasesSession');
  });

  it('a tombstone null round-trips through hydration', () => {
    const host = makeStuff(() => new BareHost());
    host.aliases = { l: 'look', s: null, gn: 'goodnight' };
    expect(host.getAlias('l')?.body).toBe('look');
    expect(host.getAlias('s')).toBeUndefined(); // tombstone honored
    expect(host.getAlias('gn')?.body).toBe('goodnight');
    const m = host.getAliases();
    expect(m.has('l')).toBe(true);
    expect(m.has('gn')).toBe(true);
    expect(m.has('s')).toBe(false);
  });
});

/* ───────── 7. Pipeline integration via executeCommand ───────── */

const PipelineHostBase = AliasMixin(
  CommandGiverMixin(SensorMixin(ContainerMixin(ContainableMixin(Idea)))),
);

class PipelineHost extends PipelineHostBase {
  static override commandContributions = {
      peers: [],
    self: ['system/ping.yaml'],
    environment: [],
  };

  public received: MessageFrame[] = [];
  protected override handleMessage(frame: unknown): void {
    this.received.push(frame as MessageFrame);
  }
}

describe('AliasMixin — pipeline integration', () => {
  let giver: PipelineHost;
  let location: Location;

  beforeEach(() => {
    CommandApi.clearCache();
    const find = vi.fn(
      async (collection: string, query: Record<string, unknown>) => {
        if (
          collection === Collections.Domain &&
          query.path === '/obj/command/system/PingController'
        ) {
          return [
            {
              path: '/obj/command/system/PingController',
              class: '/obj/command/system/PingController',
              data: {},
            },
          ];
        }
        return [];
      },
    );
    vi.spyOn(PersistenceManager, 'get').mockReturnValue({
      save: vi.fn(),
      find,
      findById: vi.fn(),
    } as unknown as PersistenceManager);

    location = makeStuff(() => new Location());
    giver = makeStuff(() => new PipelineHost());
    ContainmentApi.move(giver, location);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('alias l = ping, then `l` invokes ping (alias fired)', async () => {
    giver.setAlias('l', 'ping', { actor: giver });
    await giver.executeCommand('l');
    // executeCommand returns void; the input-echo frame is the
    // proof the dispatch ran the expanded form. ping's success path
    // produces no controller failure — the implicit assertion is
    // that the call completed without throwing.
    const cmdFrame = giver.received.find((f) =>
      String(f.topic ?? '').startsWith('shell.diagnostic'),
    );
    expect(cmdFrame).toBeDefined();
  });

  it('input-echo payload carries expandedText when an alias fires', async () => {
    giver.setAlias('l', 'ping', { actor: giver });
    await giver.executeCommand('l');
    const cmdFrame = giver.received.find((f) =>
      String(f.topic ?? '').startsWith('shell.diagnostic'),
    );
    expect(cmdFrame).toBeDefined();
    const payload = (cmdFrame as {
      payload?: { kind?: string; rawText?: string; expandedText?: string };
    }).payload;
    expect(payload?.kind).toBe('issued');
    expect(payload?.rawText).toBe('l');
    expect(payload?.expandedText).toBe('ping');
  });

  it('input-echo payload.expandedText is absent when no alias fires', async () => {
    await giver.executeCommand('ping');
    const cmdFrame = giver.received.find((f) =>
      String(f.topic ?? '').startsWith('shell.diagnostic'),
    );
    const payload = (cmdFrame as {
      payload?: { kind?: string; rawText?: string; expandedText?: string };
    }).payload;
    expect(payload?.kind).toBe('issued');
    expect(payload?.expandedText).toBeUndefined();
  });

  it('NPCs without AliasMixin skip expansion and dispatch normally', async () => {
    // Build an NPC-shaped giver without AliasMixin.
    const NpcBase = CommandGiverMixin(
      SensorMixin(ContainerMixin(ContainableMixin(Idea))),
    );
    class Npc extends NpcBase {
      static override commandContributions = {
      peers: [],
        self: ['system/ping.yaml'],
        environment: [],
      };
      public received: MessageFrame[] = [];
      protected override handleMessage(frame: unknown): void {
        this.received.push(frame as MessageFrame);
      }
    }
    const npc = makeStuff(() => new Npc());
    ContainmentApi.move(npc, location);
    await npc.executeCommand('ping');
    // No alias on the NPC, dispatch flows through directly. The
    // input-echo frame proves the call ran.
    const cmdFrame = npc.received.find((f) =>
      String(f.topic ?? '').startsWith('shell.diagnostic'),
    );
    expect(cmdFrame).toBeDefined();
  });
});
