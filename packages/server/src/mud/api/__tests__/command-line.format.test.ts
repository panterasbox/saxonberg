/**
 * format() round-trip tests. The contract:
 *   - format(parsePipeline(t)) re-parses to a pipeline equivalent to
 *     parsePipeline(t) for valid t (canonical form).
 *   - parsePipeline(format(parsed)) === structurally parsed for any
 *     parsed value emitted by parsePipeline.
 *
 * Greedy-whitespace preservation is a matcher concern (the greedy
 * field grabs the source slice verbatim), so it isn't tested here —
 * see command-assembly.test.ts.
 */

import { describe, it, expect } from 'vitest';
import { CommandLineApi, type RawToken } from '../command-line';

function reparse(input: string) {
  const a = CommandLineApi.parsePipeline(input);
  const formatted = CommandLineApi.format(a);
  const b = CommandLineApi.parsePipeline(formatted);
  return { a, b, formatted };
}

/**
 * Round-trip equivalence cares about classification and content,
 * not the literal source slice or byte offsets — those naturally
 * shift when format() canonicalises the input.
 */
function semanticTokens(tokens: RawToken[]): unknown[] {
  return tokens.map((t) => {
    const out: Record<string, unknown> = { kind: t.kind };
    if (t.kind === 'word') out.value = t.value;
    else if (t.kind === 'short-flags') out.flags = t.flags;
    else if (t.kind === 'long-flag') out.name = t.name;
    else if (t.kind === 'long-with-value') {
      out.name = t.name;
      out.value = t.value;
    }
    return out;
  });
}

describe('CommandLineApi.format — round-trip', () => {
  it('round-trips simple verb-only input', () => {
    const { a, b } = reparse('look');
    expect(semanticTokens(b.commands[0]?.rawTokens ?? [])).toEqual(
      semanticTokens(a.commands[0]?.rawTokens ?? [])
    );
  });

  it('round-trips a verb plus positional', () => {
    const { a, b } = reparse('look sword');
    expect(semanticTokens(b.commands[0]?.rawTokens ?? [])).toEqual(
      semanticTokens(a.commands[0]?.rawTokens ?? [])
    );
  });

  it('round-trips quoted segments with whitespace', () => {
    const { a, b } = reparse('say "hello world"');
    expect(semanticTokens(b.commands[0]?.rawTokens ?? [])).toEqual(
      semanticTokens(a.commands[0]?.rawTokens ?? [])
    );
  });

  it('round-trips long-flag', () => {
    const { a, b } = reparse('git --verbose');
    expect(semanticTokens(b.commands[0]?.rawTokens ?? [])).toEqual(
      semanticTokens(a.commands[0]?.rawTokens ?? [])
    );
  });

  it('round-trips long-with-value', () => {
    const { a, b } = reparse('git --name=Aslan');
    expect(semanticTokens(b.commands[0]?.rawTokens ?? [])).toEqual(
      semanticTokens(a.commands[0]?.rawTokens ?? [])
    );
  });

  it('round-trips long-with-value when value has whitespace', () => {
    const { a, b } = reparse('git --message="hello world"');
    expect(semanticTokens(b.commands[0]?.rawTokens ?? [])).toEqual(
      semanticTokens(a.commands[0]?.rawTokens ?? [])
    );
  });

  it('round-trips short-flag stacks', () => {
    const { a, b } = reparse('git -vn5');
    expect(semanticTokens(b.commands[0]?.rawTokens ?? [])).toEqual(
      semanticTokens(a.commands[0]?.rawTokens ?? [])
    );
  });

  it('round-trips stop-options', () => {
    const { a, b } = reparse('git -- --notaflag');
    expect(semanticTokens(b.commands[0]?.rawTokens ?? [])).toEqual(
      semanticTokens(a.commands[0]?.rawTokens ?? [])
    );
  });

  it('round-trips a verb that leads with -', () => {
    const { a, b } = reparse('-foo');
    expect(semanticTokens(b.commands[0]?.rawTokens ?? [])).toEqual(
      semanticTokens(a.commands[0]?.rawTokens ?? [])
    );
  });

  it('round-trips embedded apostrophes verbatim', () => {
    const { a, b, formatted } = reparse("say it's fine");
    expect(formatted).not.toContain('\\');
    expect(semanticTokens(b.commands[0]?.rawTokens ?? [])).toEqual(
      semanticTokens(a.commands[0]?.rawTokens ?? [])
    );
  });

  it('round-trips an embedded double-quote (escapes in quoted form)', () => {
    const { a, b } = reparse('say "he said \\"hi\\""');
    expect(semanticTokens(b.commands[0]?.rawTokens ?? [])).toEqual(
      semanticTokens(a.commands[0]?.rawTokens ?? [])
    );
  });

  it('round-trips an embedded backslash in a quoted token', () => {
    const { a, b } = reparse('say "back\\\\slash"');
    expect(semanticTokens(b.commands[0]?.rawTokens ?? [])).toEqual(
      semanticTokens(a.commands[0]?.rawTokens ?? [])
    );
  });

  it('round-trips a token containing a literal pipe (quoted)', () => {
    const { a, b } = reparse('say "a | b"');
    expect(semanticTokens(b.commands[0]?.rawTokens ?? [])).toEqual(
      semanticTokens(a.commands[0]?.rawTokens ?? [])
    );
  });

  it('round-trips a token containing a literal pipe (escaped)', () => {
    const { a, b } = reparse('say a\\|b');
    expect(semanticTokens(b.commands[0]?.rawTokens ?? [])).toEqual(
      semanticTokens(a.commands[0]?.rawTokens ?? [])
    );
  });

  it('round-trips an empty-quoted argument', () => {
    const { a, b } = reparse('say ""');
    expect(semanticTokens(b.commands[0]?.rawTokens ?? [])).toEqual(
      semanticTokens(a.commands[0]?.rawTokens ?? [])
    );
  });

  it('format() of a single ParsedCommand renders without pipe', () => {
    const p = CommandLineApi.parsePipeline('look at sword');
    const cmd = p.commands[0]!;
    expect(CommandLineApi.format(cmd)).toBe('look at sword');
  });

  it('format() of multi-command pipeline joins with " | "', () => {
    // Pipeline parsing throws NYI, but we can build a multi-command
    // pipeline by hand to exercise format()'s pipe-joining branch.
    const cmd = CommandLineApi.parsePipeline('say a').commands[0]!;
    const out = CommandLineApi.format({
      raw: 'say a | say a',
      commands: [cmd, cmd],
    });
    expect(out).toBe('say a | say a');
  });
});
