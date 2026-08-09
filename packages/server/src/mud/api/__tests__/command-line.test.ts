/**
 * Tokenizer/parser unit tests — covers the lexical layer described in
 * the command-line requirements doc. Pure parser tests; YAML-binding
 * is exercised separately in command-assembly.test.ts.
 */

import "../../../test-bootstrap";
import { describe, it, expect } from 'vitest';
import { CommandLineApi, type RawToken } from '../command-line';

function tokens(input: string): RawToken[] {
  return CommandLineApi.parsePipeline(input).commands[0]?.rawTokens ?? [];
}

function verbOf(input: string): string {
  return CommandLineApi.parsePipeline(input).commands[0]?.verb ?? '';
}

describe('CommandLineApi.parsePipeline — whitespace', () => {
  it('returns an empty pipeline for empty input', () => {
    expect(CommandLineApi.parsePipeline('').commands).toEqual([]);
  });

  it('returns an empty pipeline for whitespace-only input', () => {
    expect(CommandLineApi.parsePipeline('   \t\n').commands).toEqual([]);
  });

  it('collapses runs of whitespace between tokens', () => {
    const t = tokens('look   at   sword');
    expect(t.map((x) => x.kind === 'word' ? x.value : '!')).toEqual(['look', 'at', 'sword']);
  });

  it('treats tab and newline as whitespace separators', () => {
    const t = tokens('say\thello\nworld');
    expect(t.map((x) => x.kind === 'word' ? x.value : '!')).toEqual(['say', 'hello', 'world']);
  });
});

describe('CommandLineApi.parsePipeline — quoting', () => {
  it('keeps whitespace inside double-quoted segments', () => {
    const t = tokens('say "hello world"');
    expect(t).toHaveLength(2);
    expect(t[1]).toMatchObject({ kind: 'word', value: 'hello world' });
  });

  it('treats single-quote as literal text (apostrophe)', () => {
    const t = tokens("say it's fine");
    expect(t).toHaveLength(3);
    expect(t.map((x) => x.kind === 'word' ? x.value : '')).toEqual([
      'say',
      "it's",
      'fine',
    ]);
  });

  it("doesn't treat single-quote `'` as a quoting form across whitespace", () => {
    // Apostrophe is literal; whitespace still splits. The single-
    // quote-as-`say`-alias case relies on the matcher accepting
    // `'` as a verb (see say.yaml verbs: [say, "'"]).
    const t = tokens("'hello world");
    expect(t).toHaveLength(2);
    expect(t.map((x) => (x.kind === 'word' ? x.value : ''))).toEqual([
      "'hello",
      'world',
    ]);
  });

  it('processes escape sequences inside double-quoted segments', () => {
    expect(tokens('say "hi\\nthere"')[1]).toMatchObject({
      kind: 'word',
      value: 'hi\nthere',
    });
    expect(tokens('say "tab\\there"')[1]).toMatchObject({
      kind: 'word',
      value: 'tab\there',
    });
    expect(tokens('say "cr\\rhere"')[1]).toMatchObject({
      kind: 'word',
      value: 'cr\rhere',
    });
  });

  it('lets \\" embed a double-quote inside a quoted segment', () => {
    expect(tokens('say "he said \\"hi\\""')[1]).toMatchObject({
      kind: 'word',
      value: 'he said "hi"',
    });
  });

  it('lets \\\\ embed a backslash inside a quoted segment', () => {
    expect(tokens('say "back\\\\slash"')[1]).toMatchObject({
      kind: 'word',
      value: 'back\\slash',
    });
  });

  it('keeps unknown escapes verbatim inside quoted segments', () => {
    expect(tokens('say "lit\\xeral"')[1]).toMatchObject({
      kind: 'word',
      value: 'lit\\xeral',
    });
  });

  it('supports adjacent-quoted concatenation', () => {
    // Verb is forced to word in slot 0; the option-classified token
    // is at slot 1.
    const t = tokens('git --name="hello "world');
    expect(t).toHaveLength(2);
    expect(t[1]).toMatchObject({
      kind: 'long-with-value',
      name: 'name',
      value: 'hello world',
    });
  });

  it('supports concatenation that mixes literal and quoted segments', () => {
    const t = tokens('foo"bar baz"qux');
    // First token is verb (forced word).
    expect(t[0]).toMatchObject({ kind: 'word', value: 'foobar bazqux' });
  });

  it('treats an unclosed double-quote as quoting through end of input', () => {
    const t = tokens('say "hello world');
    expect(t).toHaveLength(2);
    expect(t[1]).toMatchObject({ kind: 'word', value: 'hello world' });
  });
});

describe('CommandLineApi.parsePipeline — outside-quote escapes', () => {
  it('lets \\<space> embed a literal space inside a token', () => {
    const t = tokens('look hello\\ world');
    expect(t).toHaveLength(2);
    expect(t[1]).toMatchObject({ kind: 'word', value: 'hello world' });
  });

  it('lets \\\\ embed a literal backslash', () => {
    const t = tokens('look back\\\\slash');
    expect(t[1]).toMatchObject({ kind: 'word', value: 'back\\slash' });
  });

  it('lets \\" embed a literal double-quote', () => {
    const t = tokens('look hi\\"there');
    expect(t[1]).toMatchObject({ kind: 'word', value: 'hi"there' });
  });

  it('lets \\| embed a literal pipe', () => {
    const t = tokens('say a\\|b');
    expect(t).toHaveLength(2);
    expect(t[1]).toMatchObject({ kind: 'word', value: 'a|b' });
  });

  it('keeps other unknown \\X verbatim outside quotes', () => {
    const t = tokens('look \\xfoo');
    expect(t[1]).toMatchObject({ kind: 'word', value: '\\xfoo' });
  });
});

describe('CommandLineApi.parsePipeline — option classification', () => {
  it('classifies long flags', () => {
    const t = tokens('git --verbose');
    expect(t[1]).toMatchObject({ kind: 'long-flag', name: 'verbose' });
  });

  it('classifies long-with-value', () => {
    const t = tokens('git --name=Aslan');
    expect(t[1]).toMatchObject({
      kind: 'long-with-value',
      name: 'name',
      value: 'Aslan',
    });
  });

  it('splits long-with-value on the first = only', () => {
    const t = tokens('git --expr=1+1=2');
    expect(t[1]).toMatchObject({
      kind: 'long-with-value',
      name: 'expr',
      value: '1+1=2',
    });
  });

  it('classifies short-flag stacks', () => {
    const t = tokens('git -vn');
    expect(t[1]).toMatchObject({ kind: 'short-flags', flags: 'vn' });
  });

  it('classifies short-flags with digits as flag stacks', () => {
    const t = tokens('git -vn5');
    expect(t[1]).toMatchObject({ kind: 'short-flags', flags: 'vn5' });
  });

  it('treats -5 as a positional word, not a flag stack', () => {
    const t = tokens('add -5');
    expect(t[1]).toMatchObject({ kind: 'word', value: '-5' });
  });

  it('treats -3.14 as a positional word, not a flag stack', () => {
    const t = tokens('add -3.14');
    expect(t[1]).toMatchObject({ kind: 'word', value: '-3.14' });
  });

  it('treats bare - as a positional word', () => {
    const t = tokens('look -');
    expect(t[1]).toMatchObject({ kind: 'word', value: '-' });
  });

  it('emits a stop-options token at --', () => {
    const t = tokens('git -- --notaflag');
    expect(t).toHaveLength(3);
    expect(t[1]).toMatchObject({ kind: 'stop-options' });
    expect(t[2]).toMatchObject({ kind: 'word', value: '--notaflag' });
  });

  it('forces all subsequent tokens to word after --', () => {
    const t = tokens('git -- -v --foo');
    expect(t[2]).toMatchObject({ kind: 'word', value: '-v' });
    expect(t[3]).toMatchObject({ kind: 'word', value: '--foo' });
  });

  it('keeps a quoted dash-leading string as a word, not a flag', () => {
    const t = tokens('say "--not a flag"');
    expect(t[1]).toMatchObject({ kind: 'word', value: '--not a flag' });
  });
});

describe('CommandLineApi.parsePipeline — verb token', () => {
  it('extracts the verb from the first token', () => {
    expect(verbOf('look')).toBe('look');
  });

  it('keeps verb case verbatim — case folding is the matcher level', () => {
    expect(verbOf('LOOK')).toBe('LOOK');
  });

  it('classifies the first token as word even if it leads with -', () => {
    const t = tokens('-bogus');
    expect(t[0]).toMatchObject({ kind: 'word', value: '-bogus' });
    expect(verbOf('-bogus')).toBe('-bogus');
  });

  it('classifies the first token as word even if it leads with --', () => {
    const t = tokens('--bogus');
    expect(t[0]).toMatchObject({ kind: 'word', value: '--bogus' });
  });

  it("recognises ' as a literal verb token (single-quote alias for say)", () => {
    const t = tokens("'hello world");
    expect(t[0]).toMatchObject({ kind: 'word', value: "'hello" });
  });
});

describe('CommandLineApi.parsePipeline — pipe boundary', () => {
  it('throws NYI on a non-trivial pipeline', () => {
    expect(() => CommandLineApi.parsePipeline('say a | say b')).toThrow(
      'Command piping is not yet implemented'
    );
  });

  it('accepts a literal | inside double-quoted text', () => {
    const t = tokens('say "a | b"');
    expect(t).toHaveLength(2);
    expect(t[1]).toMatchObject({ kind: 'word', value: 'a | b' });
  });

  it('accepts a literal | escaped with backslash', () => {
    const t = tokens('say a\\|b');
    expect(t).toHaveLength(2);
    expect(t[1]).toMatchObject({ kind: 'word', value: 'a|b' });
  });

  it('throws when a trailing pipe yields a non-empty second command', () => {
    expect(() => CommandLineApi.parsePipeline('say a | say b | say c')).toThrow();
  });

  it('does not throw on a stray trailing pipe with empty second chunk', () => {
    // `say a |` yields one non-empty command and one empty chunk —
    // empty chunks are filtered before the >1 check.
    expect(() => CommandLineApi.parsePipeline('say a |')).not.toThrow();
  });
});

describe('CommandLineApi.parsePipeline — positions / source slices', () => {
  it('records pos / raw on every token', () => {
    const t = tokens('look at sword');
    expect(t[0]).toMatchObject({ pos: 0, raw: 'look' });
    expect(t[1]).toMatchObject({ pos: 5, raw: 'at' });
    expect(t[2]).toMatchObject({ pos: 8, raw: 'sword' });
  });

  it('exposes source / start on each ParsedCommand', () => {
    const p = CommandLineApi.parsePipeline('say hello');
    expect(p.commands[0]).toMatchObject({ source: 'say hello', start: 0 });
  });

  it('preserves greedy whitespace via the source slice', () => {
    // The matcher will pick this slice up; here we verify the
    // source carries the spacing verbatim.
    const p = CommandLineApi.parsePipeline('say  hello   world');
    expect(p.commands[0]?.source).toBe('say  hello   world');
  });
});

describe('CommandLineLogic singleton encapsulation', () => {
  it('denies a direct logic-method call from a non-CommandLineApi caller', async () => {
    const { StuffApi } = await import('../stuff');
    const { SecurityError } = await import('../../lib/security/errors');
    type CommandLineLogic =
      import('../../obj/api/CommandLineLogic').CommandLineLogic;
    CommandLineApi.parsePipeline('look');
    const logic = StuffApi.findByTemplatePath<CommandLineLogic>(
      '/obj/api/command-line'
    );
    expect(logic).toBeDefined();
    expect(() => logic!.parsePipeline('look')).toThrow(SecurityError);
  });
});
