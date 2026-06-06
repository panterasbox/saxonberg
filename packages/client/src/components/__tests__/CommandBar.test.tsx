import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { useStore, BASE_SLOT, type PromptEntry } from '../../store/index';
import { CommandBar } from '../CommandBar';

/**
 * CommandBar component tests. Drives the slot-multiplexed input:
 * slot switching via the dropdown, per-slot draft persistence,
 * per-kind submit (text Enter, confirm parse, chip click, mql-many
 * multi-select), per-prompt X cancel, validation-error rendering.
 *
 * Each test seeds the store directly via `useStore.setState` to
 * avoid spinning up the websocket round-trip. The CommandBar's
 * callbacks are vi.fn spies; we assert against them as the wire
 * boundary.
 */
function resetStore(): void {
  useStore.setState({
    prompts: [],
    promptDrafts: { [BASE_SLOT]: '' },
    activeSlot: BASE_SLOT,
    basePrompt: 'here>',
    echoSnapshotQueue: [],
  });
}

interface Spies {
  onBaseChange: ReturnType<typeof vi.fn>;
  onSendCommand: ReturnType<typeof vi.fn>;
  onSendPromptResponse: ReturnType<typeof vi.fn>;
  onCancelPrompt: ReturnType<typeof vi.fn>;
}

function makeSpies(): Spies {
  return {
    onBaseChange: vi.fn(),
    onSendCommand: vi.fn(),
    onSendPromptResponse: vi.fn(),
    onCancelPrompt: vi.fn(),
  };
}

function renderBar(spies: Spies, baseValue = '') {
  return render(
    <CommandBar
      baseValue={baseValue}
      onBaseChange={spies.onBaseChange}
      onSendCommand={spies.onSendCommand}
      onSendPromptResponse={spies.onSendPromptResponse}
      onCancelPrompt={spies.onCancelPrompt}
    />,
  );
}

function pushPrompt(entry: PromptEntry) {
  useStore.getState().pushPrompt(entry);
}

describe('CommandBar — base / command mode', () => {
  beforeEach(() => {
    resetStore();
  });

  it('renders the base prompt sigil and an empty-stack input row', () => {
    const spies = makeSpies();
    renderBar(spies);
    expect(screen.getByText('here>')).toBeTruthy();
    expect(screen.getByPlaceholderText('Enter command...')).toBeTruthy();
  });

  it('Enter on base sends through onSendCommand', () => {
    const spies = makeSpies();
    renderBar(spies, 'look');
    fireEvent.keyDown(screen.getByPlaceholderText('Enter command...'), {
      key: 'Enter',
    });
    expect(spies.onSendCommand).toHaveBeenCalledWith('look');
  });

  it('empty Enter still calls onSendCommand (for the server-side refresh short-circuit)', () => {
    const spies = makeSpies();
    renderBar(spies, '');
    fireEvent.keyDown(screen.getByPlaceholderText('Enter command...'), {
      key: 'Enter',
    });
    expect(spies.onSendCommand).toHaveBeenCalledWith('');
  });
});

describe('CommandBar — prompt arrival and slot switching', () => {
  beforeEach(() => {
    resetStore();
  });

  it('auto-focuses a foreground prompt on arrival', () => {
    const spies = makeSpies();
    renderBar(spies);
    act(() => {
      pushPrompt({
        kind: 'text',
        promptId: 'p1',
        label: 'Name?',
        foreground: true,
      });
    });
    expect(useStore.getState().activeSlot).toBe('p1');
    expect(screen.getByPlaceholderText('Type your answer...')).toBeTruthy();
    // Sigil flips to '?' in prompt mode.
    expect(screen.getByText('?')).toBeTruthy();
  });

  it('background prompt leaves the input on base', () => {
    const spies = makeSpies();
    renderBar(spies);
    act(() => {
      pushPrompt({
        kind: 'text',
        promptId: 'p1',
        label: 'Background?',
        foreground: false,
      });
    });
    expect(useStore.getState().activeSlot).toBe(BASE_SLOT);
    expect(screen.getByPlaceholderText('Enter command...')).toBeTruthy();
  });

  it('persists per-slot drafts across switches', () => {
    const spies = makeSpies();
    renderBar(spies);
    act(() => {
      pushPrompt({
        kind: 'text',
        promptId: 'p1',
        label: 'A?',
        foreground: true,
      });
      pushPrompt({
        kind: 'text',
        promptId: 'p2',
        label: 'B?',
        foreground: true,
      });
    });
    // Active is p2. Type into it.
    fireEvent.change(screen.getByPlaceholderText('Type your answer...'), {
      target: { value: 'half-B' },
    });
    expect(useStore.getState().promptDrafts.p2).toBe('half-B');
    // Switch to p1 via setActiveSlot directly (UI clicks the
    // dropdown; the store call is the same shape).
    act(() => {
      useStore.getState().setActiveSlot('p1');
    });
    fireEvent.change(screen.getByPlaceholderText('Type your answer...'), {
      target: { value: 'half-A' },
    });
    expect(useStore.getState().promptDrafts.p1).toBe('half-A');
    // Switch back to p2; draft restored.
    act(() => {
      useStore.getState().setActiveSlot('p2');
    });
    expect(useStore.getState().promptDrafts.p2).toBe('half-B');
  });

  it('Esc on a prompt slot returns to base without dismissing', () => {
    const spies = makeSpies();
    renderBar(spies);
    act(() => {
      pushPrompt({
        kind: 'text',
        promptId: 'p1',
        label: 'A?',
        foreground: true,
      });
    });
    fireEvent.keyDown(screen.getByPlaceholderText('Type your answer...'), {
      key: 'Escape',
    });
    expect(useStore.getState().activeSlot).toBe(BASE_SLOT);
    expect(useStore.getState().prompts).toHaveLength(1);
  });
});

describe('CommandBar — submit per kind', () => {
  beforeEach(() => {
    resetStore();
  });

  it('text Enter sends prompt-response with the draft', () => {
    const spies = makeSpies();
    renderBar(spies);
    act(() => {
      pushPrompt({
        kind: 'text',
        promptId: 'p1',
        label: 'Name?',
        foreground: true,
      });
    });
    fireEvent.change(screen.getByPlaceholderText('Type your answer...'), {
      target: { value: 'Alice' },
    });
    fireEvent.keyDown(screen.getByPlaceholderText('Type your answer...'), {
      key: 'Enter',
    });
    expect(spies.onSendPromptResponse).toHaveBeenCalledWith('p1', 'Alice');
  });

  it('confirm Enter on "y" sends prompt-response "yes"', () => {
    const spies = makeSpies();
    renderBar(spies);
    act(() => {
      pushPrompt({
        kind: 'confirm',
        promptId: 'p1',
        label: 'Continue?',
        defaultAnswer: 'no',
        foreground: true,
      });
    });
    fireEvent.change(screen.getByPlaceholderText('y / n (or click)'), {
      target: { value: 'y' },
    });
    fireEvent.keyDown(screen.getByPlaceholderText('y / n (or click)'), {
      key: 'Enter',
    });
    expect(spies.onSendPromptResponse).toHaveBeenCalledWith('p1', 'yes');
  });

  it('confirm Enter on garbage is a no-op', () => {
    const spies = makeSpies();
    renderBar(spies);
    act(() => {
      pushPrompt({
        kind: 'confirm',
        promptId: 'p1',
        label: 'Continue?',
        defaultAnswer: 'no',
        foreground: true,
      });
    });
    fireEvent.change(screen.getByPlaceholderText('y / n (or click)'), {
      target: { value: 'maybe' },
    });
    fireEvent.keyDown(screen.getByPlaceholderText('y / n (or click)'), {
      key: 'Enter',
    });
    expect(spies.onSendPromptResponse).not.toHaveBeenCalled();
  });

  it('choice chip click sends the chosen response', () => {
    const spies = makeSpies();
    renderBar(spies);
    act(() => {
      pushPrompt({
        kind: 'choice',
        promptId: 'p1',
        label: 'Pick',
        choices: [
          { label: 'Apple', response: 'apple' },
          { label: 'Pear', response: 'pear' },
        ],
        foreground: true,
      });
    });
    fireEvent.click(screen.getByText('Apple'));
    expect(spies.onSendPromptResponse).toHaveBeenCalledWith('p1', 'apple');
  });

  it('mql-object chip click sends the picked stuffId', () => {
    const spies = makeSpies();
    renderBar(spies);
    act(() => {
      pushPrompt({
        kind: 'mql-object',
        promptId: 'p1',
        label: 'Which sword?',
        matches: [
          { stuffId: 'sw1', displayName: 'rusty sword' },
          { stuffId: 'sw2', displayName: 'iron sword' },
        ],
        foreground: true,
      });
    });
    fireEvent.click(screen.getByText('rusty sword'));
    expect(spies.onSendPromptResponse).toHaveBeenCalledWith('p1', 'sw1');
  });

  it('mql-many toggles + Send ships a JSON-encoded id array', () => {
    const spies = makeSpies();
    renderBar(spies);
    act(() => {
      pushPrompt({
        kind: 'mql-many',
        promptId: 'p1',
        label: 'Pick swords',
        matches: [
          { stuffId: 'sw1', displayName: 'rusty sword' },
          { stuffId: 'sw2', displayName: 'iron sword' },
          { stuffId: 'sw3', displayName: 'gold sword' },
        ],
        foreground: true,
      });
    });
    fireEvent.click(screen.getByText('rusty sword'));
    fireEvent.click(screen.getByText('gold sword'));
    // Send chip is the only one starting with "Send".
    const sendChip = screen
      .getAllByRole('button')
      .find((b) => b.textContent?.startsWith('Send'));
    if (!sendChip) throw new Error('Send chip not rendered');
    fireEvent.click(sendChip);
    expect(spies.onSendPromptResponse).toHaveBeenCalledTimes(1);
    const [, payload] = spies.onSendPromptResponse.mock.calls[0]!;
    expect(JSON.parse(payload as string).sort()).toEqual(['sw1', 'sw3']);
  });
});

describe('CommandBar — meta affordances', () => {
  beforeEach(() => {
    resetStore();
  });

  it('per-prompt X-cancel calls onCancelPrompt for that promptId', () => {
    const spies = makeSpies();
    renderBar(spies);
    act(() => {
      pushPrompt({
        kind: 'text',
        promptId: 'p1',
        label: 'Name?',
        foreground: true,
      });
    });
    fireEvent.click(screen.getByLabelText('Cancel this prompt'));
    expect(spies.onCancelPrompt).toHaveBeenCalledWith('p1');
  });

  it('"cancel all" sends the prompt cancel verb through onSendCommand', () => {
    const spies = makeSpies();
    renderBar(spies);
    act(() => {
      pushPrompt({
        kind: 'text',
        promptId: 'p1',
        label: 'A?',
        foreground: true,
      });
      pushPrompt({
        kind: 'text',
        promptId: 'p2',
        label: 'B?',
        foreground: true,
      });
    });
    fireEvent.click(screen.getByLabelText('Cancel every pending prompt'));
    expect(spies.onSendCommand).toHaveBeenCalledWith('prompt cancel');
  });

  it('renders the inline validation error message', () => {
    const spies = makeSpies();
    renderBar(spies);
    act(() => {
      pushPrompt({
        kind: 'text',
        promptId: 'p1',
        label: 'Name?',
        foreground: true,
      });
      useStore
        .getState()
        .setPromptValidationError('p1', 'must be 3-20 chars');
    });
    expect(screen.getByText('must be 3-20 chars')).toBeTruthy();
  });

  it('shows the stack badge when more than one prompt is pending', () => {
    const spies = makeSpies();
    renderBar(spies);
    act(() => {
      pushPrompt({
        kind: 'text',
        promptId: 'p1',
        label: 'A?',
        foreground: true,
      });
      pushPrompt({
        kind: 'text',
        promptId: 'p2',
        label: 'B?',
        foreground: true,
      });
    });
    expect(screen.getByText('⌃2')).toBeTruthy();
  });
});
