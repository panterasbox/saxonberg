import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { useStore, BASE_SLOT, type PromptEntry } from '../../store/index';
import { CommandBar } from '../CommandBar';
import { tokens } from '../ui/tokens';

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

describe('CommandBar — command register stays monospace [8e]', () => {
  // The input line / prompt / local echo are the command register
  // ("you + the machine"). The CommandBar is a client-shell component
  // outside the transcript, driven by `tokens.font.family`; removing
  // the transcript's global mono rule must not make the input
  // proportional. Guard the token so a future edit can't silently
  // regress it.
  it('the command-register token resolves to a monospace stack', () => {
    // The CommandBar reads `tokens.font.mono` (the command register).
    // The chrome default `tokens.font.family` is now sans, so this
    // guards the right token.
    expect(tokens.font.mono).toMatch(/monospace/);
    expect(tokens.font.family).not.toMatch(/monospace/);
  });

  it('the input row renders with the monospace font token', () => {
    resetStore();
    renderBar(makeSpies());
    const input = screen.getByPlaceholderText(
      'Enter command...',
    ) as HTMLInputElement;
    // styled-components injects the rule; assert the token feeds it.
    const css = Array.from(document.querySelectorAll('style'))
      .map((s) => s.textContent ?? '')
      .join('');
    expect(css).toContain('monospace');
    expect(input).toBeTruthy();
  });
});

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
    // The prompt's question shows in both the pinned context line and the
    // slot-picker pill.
    expect(screen.getAllByText('Name?').length).toBeGreaterThanOrEqual(1);
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

describe('CommandBar — slot picker as bottom-of-stack model', () => {
  beforeEach(() => {
    resetStore();
  });

  it('always renders the slot picker, even with zero pending prompts', () => {
    const spies = makeSpies();
    renderBar(spies);
    // The slot picker exists and shows the basePrompt label.
    expect(screen.getByLabelText('Open slot picker')).toBeTruthy();
    expect(screen.getByText('here>')).toBeTruthy();
  });

  it('slot picker shows basePrompt when active is base, even with prompts pending', () => {
    const spies = makeSpies();
    renderBar(spies);
    act(() => {
      pushPrompt({
        kind: 'text',
        promptId: 'p1',
        label: 'Which target?',
        foreground: true,
      });
      // Player picks command from the dropdown.
      useStore.getState().setActiveSlot(BASE_SLOT);
    });
    // Slot picker reflects the ACTIVE slot — base → basePrompt.
    expect(screen.getByText('here>')).toBeTruthy();
    // Pending-prompt count is shown alongside (1 prompt on the stack).
    expect(screen.getByText('1')).toBeTruthy();
    // Input is in command mode.
    expect(screen.getByPlaceholderText('Enter command...')).toBeTruthy();
  });

  it('typing a command while a prompt is pending leaves the prompt on the stack', () => {
    const spies = makeSpies();
    renderBar(spies, '');
    act(() => {
      pushPrompt({
        kind: 'text',
        promptId: 'p1',
        label: 'Name?',
        foreground: true,
      });
      useStore.getState().setActiveSlot(BASE_SLOT);
    });
    const cmdInput = screen.getByPlaceholderText('Enter command...');
    fireEvent.keyDown(cmdInput, { key: 'Enter' });
    expect(spies.onSendCommand).toHaveBeenCalled();
    // Prompt still pending.
    expect(useStore.getState().prompts).toHaveLength(1);
  });

  it('dropdown lists base slot first plus each pending prompt', () => {
    const spies = makeSpies();
    renderBar(spies);
    act(() => {
      pushPrompt({
        kind: 'text',
        promptId: 'p1',
        label: 'Name?',
        foreground: true,
      });
      pushPrompt({
        kind: 'text',
        promptId: 'p2',
        label: 'Color?',
        foreground: true,
      });
    });
    fireEvent.click(screen.getByLabelText('Open slot picker'));
    // The dropdown has a row for base (basePrompt) AND each prompt.
    // Color? appears twice: as the active slot picker label AND as a
    // dropdown row. Name? only appears as a dropdown row.
    expect(screen.getAllByText('here>').length).toBeGreaterThan(0);
    expect(screen.getByText('Name?')).toBeTruthy();
    expect(screen.getAllByText('Color?').length).toBeGreaterThan(0);
  });
});

describe('CommandBar — meta affordances', () => {
  beforeEach(() => {
    resetStore();
  });

  it('dropdown row X cancels the corresponding prompt', () => {
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
    // Open the dropdown.
    fireEvent.click(screen.getByLabelText('Open slot picker'));
    // Each prompt row carries an X button. (The base row doesn't.)
    const xButtons = screen.getAllByText('X');
    expect(xButtons).toHaveLength(1);
    fireEvent.click(xButtons[0]!);
    expect(spies.onCancelPrompt).toHaveBeenCalledWith('p1');
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

  it('shows the pending-prompt count when one or more prompts are pending', () => {
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
    expect(screen.getByText('2')).toBeTruthy();
  });
});
