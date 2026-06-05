/**
 * Prompt wire-types smoke test. Constructs each Note kind by name
 * and assigns it to the typed `Note` union — catches union shape
 * drift at compile time.
 *
 * Behavior wires up in Wave 2 onward. This wave is types-only.
 */

import { describe, it, expect } from 'vitest';
import type {
  Note,
  ChoicePromptNote,
  ConfirmPromptNote,
  TextPromptNote,
  MqlObjectPromptNote,
  MqlManyPromptNote,
  PromptValidationFailedNote,
  PromptDismissedNote,
  PromptRefreshNote,
  PromptResponseMessage,
  PromptCancelMessage,
} from '@saxonberg/types';
import { PromptCancelledError, type PromptValidator } from '../prompt';

describe('Prompt wire types — shape', () => {
  it('ChoicePromptNote constructs and is a Note', () => {
    const note: ChoicePromptNote = {
      kind: 'prompt-choice',
      label: 'Pick',
      choices: [
        { label: 'A', response: 'a' },
        { label: 'B', response: 'b' },
      ],
    };
    const asNote: Note = note;
    expect(asNote.kind).toBe('prompt-choice');
  });

  it('ConfirmPromptNote constructs and is a Note', () => {
    const note: ConfirmPromptNote = {
      kind: 'prompt-confirm',
      label: 'Continue?',
      defaultAnswer: 'yes',
    };
    const asNote: Note = note;
    expect(asNote.kind).toBe('prompt-confirm');
  });

  it('TextPromptNote constructs with optional placeholder', () => {
    const note: TextPromptNote = {
      kind: 'prompt-text',
      label: 'Name?',
      placeholder: 'enter your name',
    };
    const asNote: Note = note;
    expect(asNote.kind).toBe('prompt-text');
  });

  it('MqlObjectPromptNote carries projected matches', () => {
    const note: MqlObjectPromptNote = {
      kind: 'prompt-mql-object',
      label: 'Which sword?',
      matches: [
        { stuffId: 'a', displayName: 'rusty sword' },
        { stuffId: 'b', displayName: 'iron sword' },
      ],
    };
    const asNote: Note = note;
    expect(asNote.kind).toBe('prompt-mql-object');
  });

  it('MqlManyPromptNote carries bounds', () => {
    const note: MqlManyPromptNote = {
      kind: 'prompt-mql-many',
      label: 'Pick swords',
      matches: [
        { stuffId: 'a', displayName: 'a' },
        { stuffId: 'b', displayName: 'b' },
      ],
      min: 1,
      max: 2,
    };
    const asNote: Note = note;
    expect(asNote.kind).toBe('prompt-mql-many');
  });

  it('PromptValidationFailedNote carries message', () => {
    const note: PromptValidationFailedNote = {
      kind: 'prompt-validation-failed',
      message: 'name must be 3-20 chars',
    };
    const asNote: Note = note;
    expect(asNote.kind).toBe('prompt-validation-failed');
  });

  it('PromptDismissedNote enumerates v1 reasons', () => {
    const reasons: PromptDismissedNote['reason'][] = [
      'answered',
      'cancelled',
      'host-disconnected',
    ];
    for (const reason of reasons) {
      const note: PromptDismissedNote = { kind: 'prompt-dismissed', reason };
      const asNote: Note = note;
      expect(asNote.kind).toBe('prompt-dismissed');
    }
  });

  it('PromptRefreshNote carries rendered string', () => {
    const note: PromptRefreshNote = {
      kind: 'prompt-refresh',
      rendered: 'here>',
    };
    const asNote: Note = note;
    expect(asNote.kind).toBe('prompt-refresh');
  });

  it('PromptResponseMessage / PromptCancelMessage shapes', () => {
    const resp: PromptResponseMessage = {
      type: 'prompt-response',
      payload: { promptId: 'p1', response: 'a' },
    };
    const cancel: PromptCancelMessage = {
      type: 'prompt-cancel',
      payload: { promptId: 'p1' },
    };
    expect(resp.type).toBe('prompt-response');
    expect(cancel.type).toBe('prompt-cancel');
  });
});

describe('PromptCancelledError', () => {
  it('carries reason and instanceOf-checks cleanly', () => {
    const err1 = new PromptCancelledError('cancelled');
    const err2 = new PromptCancelledError('host-disconnected');
    expect(err1).toBeInstanceOf(PromptCancelledError);
    expect(err1).toBeInstanceOf(Error);
    expect(err1.reason).toBe('cancelled');
    expect(err2.reason).toBe('host-disconnected');
    expect(err1.name).toBe('PromptCancelledError');
    expect(err1.message).toContain('cancelled');
  });
});

describe('PromptValidator type', () => {
  it('accepts sync returning true', () => {
    const v: PromptValidator<string> = (_s) => true;
    expect(v('foo')).toBe(true);
  });

  it('accepts sync returning string', () => {
    const v: PromptValidator<string> = (_s) => 'must be short';
    expect(v('foo')).toBe('must be short');
  });

  it('accepts async returning Promise<true | string>', async () => {
    const v: PromptValidator<string> = async (s) =>
      s.length > 0 ? true : 'empty';
    await expect(v('foo')).resolves.toBe(true);
    await expect(v('')).resolves.toBe('empty');
  });

  it('accepts typed T (boolean for confirm, etc.)', () => {
    const vBool: PromptValidator<boolean> = (b) => (b ? true : 'must be yes');
    expect(vBool(true)).toBe(true);
    expect(vBool(false)).toBe('must be yes');
  });
});
