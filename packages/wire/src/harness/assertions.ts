/**
 * The outcome assertions — the envelope half of D1.
 *
 * These exist so a wire file never says `expect(said).toMatch(/you
 * can't/)`. A refusal has a KIND and a REASON on the envelope; the
 * prose that renders it belongs to the render tier and changes with
 * every copy edit.
 */

import { expect } from 'vitest';
import type { Note } from '@saxonberg/types';
import type { CommandResult } from './session';
import { countProseRead } from './registry';

/** A one-line summary of what a command actually answered. */
export function describe(result: CommandResult): string {
  const notes = result.notes
    .map((n) => {
      const r = n as { reason?: string; detail?: unknown; field?: string };
      return (
        `${n.kind}` +
        (r.field ? `[${r.field}]` : '') +
        (r.reason ? `:${r.reason}` : '')
      );
    })
    .join(' ');
  return `'${result.text}' → ${result.status}${notes ? ` (${notes})` : ''}`;
}

/** The act succeeded. */
export function expectOk(result: CommandResult): void {
  expect(result.status, describe(result)).toBe('ok');
}

/** The act did NOT succeed — a refusal is an outcome, not an absence. */
export function expectRefused(result: CommandResult): void {
  expect(result.status, describe(result)).not.toBe('ok');
}

/** The dispatch carried this note kind, and optionally this reason. */
export function expectNote(
  result: CommandResult,
  kind: Note['kind'],
  match?: { reason?: string }
): Note {
  const found = result.notes.find((n) => n.kind === kind);
  expect(found, `expected a ${kind} note — got ${describe(result)}`).toBeDefined();
  if (match?.reason !== undefined) {
    const reason = (found as { reason?: string }).reason;
    expect(reason, `${kind} note's reason — ${describe(result)}`).toBe(
      match.reason
    );
  }
  return found!;
}

/**
 * The act succeeded, **or** was declined for a reason the caller has
 * decided is equivalent for its purposes.
 *
 * ⭐ For preconditions, not outcomes. The canonical case is a shared
 * fixture another file already put into the state you wanted: `ignite
 * oven` answers `already-burning` when the hearth is lit, and a test
 * whose requirement is *"the hearth is lit"* should not care which file
 * lit it. Use it where the postcondition is what matters; never to
 * launder a refusal you did not expect.
 */
export function expectOkOr(
  result: CommandResult,
  ...reasons: string[]
): void {
  if (result.status === 'ok') return;
  const seen = result.notes
    .map((n) => (n as { reason?: string }).reason)
    .filter((r): r is string => typeof r === 'string');
  const matched = seen.some((r) => reasons.includes(r));
  expect(
    matched,
    `expected ok or one of [${reasons.join(', ')}] — got ${describe(result)}`
  ).toBe(true);
}

/** The dispatch carried NO note of this kind. */
export function expectNoNote(result: CommandResult, kind: Note['kind']): void {
  const found = result.notes.find((n) => n.kind === kind);
  expect(found, `unexpected ${kind} note — ${describe(result)}`).toBeUndefined();
}

/**
 * A note's `detail` — ⚠ **prose, and counted as such.**
 *
 * The line inside the envelope: `kind` and `reason` are a controller's
 * structured answer and are free to assert; `detail` is the sentence it
 * hands the player, and asserting on it is asserting on wording. It
 * rides the envelope, so it *looks* structural, which is exactly why it
 * needs to be named. Reach for it when the fact under test is genuinely
 * in the sentence — a refusal that must LIST the stops you may name —
 * and take the census entry.
 */
export function detailOf(note: Note): string {
  countProseRead();
  return String((note as { detail?: unknown }).detail ?? '');
}

/**
 * The `engagementId` a durative act started — the handle
 * `Session.awaitActivity` waits on.
 */
export function engagementIdOf(result: CommandResult): string {
  const note = expectNote(result, 'engagement-started') as {
    engagementId?: string;
  };
  expect(note.engagementId, describe(result)).toBeTruthy();
  return note.engagementId!;
}
