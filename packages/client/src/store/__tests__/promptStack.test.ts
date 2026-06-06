import { beforeEach, describe, expect, it } from 'vitest';
import { useStore, BASE_SLOT, type PromptEntry } from '../index';

/**
 * Prompt-stack slice tests. Reducers in isolation — integration
 * with the wire client lives in `services/__tests__/websocket.test.ts`
 * and with the UI in `components/__tests__/CommandBar.test.tsx`.
 */
function resetSlice(): void {
  useStore.setState({
    prompts: [],
    promptDrafts: { [BASE_SLOT]: '' },
    activeSlot: BASE_SLOT,
    basePrompt: '>',
    echoSnapshotQueue: [],
  });
}

function makeTextEntry(
  promptId: string,
  label: string,
  foreground = true
): PromptEntry {
  return { kind: 'text', promptId, label, foreground };
}

describe('prompt-stack slice', () => {
  beforeEach(() => {
    resetSlice();
  });

  it('starts in command mode with an empty stack', () => {
    const s = useStore.getState();
    expect(s.prompts).toEqual([]);
    expect(s.activeSlot).toBe(BASE_SLOT);
    expect(s.basePrompt).toBe('>');
    expect(s.promptDrafts).toEqual({ [BASE_SLOT]: '' });
    expect(s.echoSnapshotQueue).toEqual([]);
  });

  describe('pushPrompt', () => {
    it('appends a new entry and seeds an empty draft', () => {
      useStore.getState().pushPrompt(makeTextEntry('p1', 'Name?'));
      const s = useStore.getState();
      expect(s.prompts.map((p) => p.promptId)).toEqual(['p1']);
      expect(s.promptDrafts).toMatchObject({ [BASE_SLOT]: '', p1: '' });
    });

    it('foreground: true makes the new entry active', () => {
      useStore
        .getState()
        .pushPrompt(makeTextEntry('p1', 'Name?', true));
      expect(useStore.getState().activeSlot).toBe('p1');
    });

    it('foreground: false leaves activeSlot put', () => {
      useStore
        .getState()
        .pushPrompt(makeTextEntry('p1', 'Background?', false));
      expect(useStore.getState().activeSlot).toBe(BASE_SLOT);
      expect(useStore.getState().prompts).toHaveLength(1);
    });

    it('dedupes on promptId — second push replaces the first', () => {
      useStore.getState().pushPrompt(makeTextEntry('p1', 'first'));
      useStore.getState().pushPrompt(makeTextEntry('p1', 'second'));
      const s = useStore.getState();
      expect(s.prompts).toHaveLength(1);
      expect(s.prompts[0]!.label).toBe('second');
    });

    it('does not overwrite an existing draft on re-push', () => {
      useStore.getState().pushPrompt(makeTextEntry('p1', 'first'));
      useStore.getState().setDraft('p1', 'typed so far');
      useStore.getState().pushPrompt(makeTextEntry('p1', 'second'));
      expect(useStore.getState().promptDrafts.p1).toBe('typed so far');
    });
  });

  describe('dismissPrompt', () => {
    it('removes the entry and its draft', () => {
      useStore.getState().pushPrompt(makeTextEntry('p1', 'Name?'));
      useStore.getState().setDraft('p1', 'partial');
      useStore.getState().dismissPrompt('p1');
      const s = useStore.getState();
      expect(s.prompts).toEqual([]);
      expect(s.promptDrafts.p1).toBeUndefined();
    });

    it('falls back to the next-newest prompt when the active one dismisses', () => {
      useStore.getState().pushPrompt(makeTextEntry('p1', 'A'));
      useStore.getState().pushPrompt(makeTextEntry('p2', 'B'));
      expect(useStore.getState().activeSlot).toBe('p2');
      useStore.getState().dismissPrompt('p2');
      expect(useStore.getState().activeSlot).toBe('p1');
    });

    it('falls back to BASE when the last prompt dismisses', () => {
      useStore.getState().pushPrompt(makeTextEntry('p1', 'A'));
      useStore.getState().dismissPrompt('p1');
      expect(useStore.getState().activeSlot).toBe(BASE_SLOT);
    });

    it('keeps active put when a non-active prompt dismisses', () => {
      useStore.getState().pushPrompt(makeTextEntry('p1', 'A'));
      useStore.getState().pushPrompt(makeTextEntry('p2', 'B'));
      // active is p2; dismiss p1 — active should stay p2.
      useStore.getState().dismissPrompt('p1');
      expect(useStore.getState().activeSlot).toBe('p2');
    });

    it('is a no-op on an unknown promptId', () => {
      useStore.getState().pushPrompt(makeTextEntry('p1', 'A'));
      useStore.getState().dismissPrompt('ghost');
      expect(useStore.getState().prompts).toHaveLength(1);
    });
  });

  describe('setPromptValidationError', () => {
    it('annotates an existing prompt', () => {
      useStore.getState().pushPrompt(makeTextEntry('p1', 'Name?'));
      useStore.getState().setPromptValidationError('p1', 'too short');
      const entry = useStore.getState().prompts[0]!;
      expect(entry.validationError).toBe('too short');
    });

    it('clears the annotation with null', () => {
      useStore.getState().pushPrompt(makeTextEntry('p1', 'Name?'));
      useStore.getState().setPromptValidationError('p1', 'too short');
      useStore.getState().setPromptValidationError('p1', null);
      const entry = useStore.getState().prompts[0]!;
      expect(entry.validationError).toBeUndefined();
    });

    it('is a no-op for unknown promptIds', () => {
      useStore.getState().pushPrompt(makeTextEntry('p1', 'Name?'));
      useStore.getState().setPromptValidationError('ghost', 'meh');
      const entry = useStore.getState().prompts[0]!;
      expect(entry.validationError).toBeUndefined();
    });
  });

  describe('setActiveSlot', () => {
    it('switches to BASE unconditionally', () => {
      useStore.getState().pushPrompt(makeTextEntry('p1', 'A'));
      expect(useStore.getState().activeSlot).toBe('p1');
      useStore.getState().setActiveSlot(BASE_SLOT);
      expect(useStore.getState().activeSlot).toBe(BASE_SLOT);
    });

    it('switches to a known prompt', () => {
      useStore.getState().pushPrompt(makeTextEntry('p1', 'A'));
      useStore.getState().pushPrompt(makeTextEntry('p2', 'B'));
      useStore.getState().setActiveSlot('p1');
      expect(useStore.getState().activeSlot).toBe('p1');
    });

    it('ignores unknown slot ids', () => {
      useStore.getState().pushPrompt(makeTextEntry('p1', 'A'));
      useStore.getState().setActiveSlot('ghost');
      expect(useStore.getState().activeSlot).toBe('p1');
    });
  });

  describe('setDraft', () => {
    it('persists per-slot draft text across switches', () => {
      useStore.getState().pushPrompt(makeTextEntry('p1', 'A'));
      useStore.getState().pushPrompt(makeTextEntry('p2', 'B'));
      useStore.getState().setActiveSlot('p1');
      useStore.getState().setDraft('p1', 'half-typed A');
      useStore.getState().setActiveSlot('p2');
      useStore.getState().setDraft('p2', 'half-typed B');
      const drafts = useStore.getState().promptDrafts;
      expect(drafts.p1).toBe('half-typed A');
      expect(drafts.p2).toBe('half-typed B');
    });
  });

  describe('echoSnapshotQueue', () => {
    it('push + shift is FIFO', () => {
      useStore.getState().pushEchoSnapshot({ slot: 'base', sigil: 'here>' });
      useStore
        .getState()
        .pushEchoSnapshot({ slot: 'base', sigil: 'kitchen>' });
      expect(useStore.getState().shiftEchoSnapshot()?.sigil).toBe('here>');
      expect(useStore.getState().shiftEchoSnapshot()?.sigil).toBe('kitchen>');
      expect(useStore.getState().shiftEchoSnapshot()).toBeNull();
    });
  });

  describe('setBasePrompt', () => {
    it('replaces the base-prompt string', () => {
      useStore.getState().setBasePrompt('hallway>');
      expect(useStore.getState().basePrompt).toBe('hallway>');
    });
  });

  describe('clearPrompts', () => {
    it('resets stack and active to base; base prompt preserved', () => {
      useStore.getState().setBasePrompt('here>');
      useStore.getState().pushPrompt(makeTextEntry('p1', 'A'));
      useStore.getState().pushPrompt(makeTextEntry('p2', 'B'));
      useStore.getState().setDraft('p1', 'half');
      useStore.getState().pushEchoSnapshot({ slot: 'base', sigil: 'here>' });
      useStore.getState().clearPrompts();
      const s = useStore.getState();
      expect(s.prompts).toEqual([]);
      expect(s.activeSlot).toBe(BASE_SLOT);
      expect(s.promptDrafts).toEqual({ [BASE_SLOT]: '' });
      expect(s.echoSnapshotQueue).toEqual([]);
      expect(s.basePrompt).toBe('here>');
    });
  });
});
