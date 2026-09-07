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

/** The dispatch carried NO note of this kind. */
export function expectNoNote(result: CommandResult, kind: Note['kind']): void {
  const found = result.notes.find((n) => n.kind === kind);
  expect(found, `unexpected ${kind} note — ${describe(result)}`).toBeUndefined();
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
