/**
 * CommandBar — slot-multiplexed input for commands AND prompts.
 *
 * The bar holds state for every pending prompt **plus** the always-
 * present base command slot. One slot is "active" at a time and
 * owns the input; switching slots swaps the draft text in and out
 * via the store's `promptDrafts` map. Each slot remembers its
 * draft until submitted or its prompt dismisses.
 *
 * Layout (two rows):
 *
 *   ┌──────────────────────────────────────────────────────────┐
 *   │ [▾ Slot label  ⌃N]   [chips/affordances for active slot] │
 *   │ [sigil] [input draft text                ]   [submit]    │
 *   └──────────────────────────────────────────────────────────┘
 *
 * Slot picker (top-left) is a dropdown when prompts are pending —
 * lists base + every prompt with its kind chip, draft preview, X-
 * cancel button. Clicking a row makes that slot active.
 *
 * Submit semantics by active slot:
 *
 *   - `base` → command-bus `command` (empty Enter still goes; the
 *     server's short-circuit refreshes the base prompt).
 *   - `text` → `prompt-response` with the typed draft.
 *   - `confirm` → typed `y`/`n`/`yes`/`no` (case-insensitive)
 *     resolves to `'yes'`/`'no'` on Enter; chip click bypasses
 *     the input entirely.
 *   - `choice` / `mql-object` → chip click is the canonical send
 *     path; Enter on the bare input is a no-op (we don't try to
 *     match typed text against choices in v1).
 *   - `mql-many` → toggle chips + a Send-(N) chip JSON-encodes
 *     the selected stuffId array.
 *
 * Per-slot X-cancel sends `prompt-cancel` for that promptId. The
 * "cancel all" affordance (when > 1 prompt pending) sends the
 * `prompt cancel` verb through the command bus.
 *
 * History persists to localStorage as before — but only the base
 * slot walks history (ArrowUp/Down). Prompt slots treat arrows as
 * plain text-edit keys.
 */

import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import {
  useStore,
  BASE_SLOT,
  type PromptEntry,
} from '../store/index';
import { tokens } from './ui/tokens';

interface CommandBarProps {
  /**
   * The base-slot draft text. Controlled by App because it doubles
   * as the hover-preview display channel (clickable-affordance
   * mouseenter writes here transiently). Per-prompt drafts are
   * read/written directly through the store.
   */
  baseValue: string;
  onBaseChange: (value: string) => void;
  onSendCommand: (text: string) => void;
  onSendPromptResponse: (promptId: string, response: string) => void;
  onCancelPrompt: (promptId: string) => void;
  /** Post-click flash signal forwarded from App. */
  flashing?: boolean;
  /**
   * True while a clickable affordance's command is previewed in the input.
   * Hides the input-mode chip so a previewed direct command (a forum vote
   * etc.) doesn't read as if it'll be wrapped by the active chat mode.
   */
  previewing?: boolean;
}

const HISTORY_KEY = 'saxonberg-command-history';
const MAX_HISTORY = 100;

/* --- Layout primitives -------------------------------------------- */

const BarContainer = styled.div<{ $promptMode: boolean }>`
  display: flex;
  flex-direction: column;
  background: ${tokens.color.surfaceAlt};
  border-top: 1px solid
    ${(p) => (p.$promptMode ? tokens.color.accent : tokens.color.border)};
`;

/**
 * Chip-affordance row — only renders when the active slot is a
 * prompt with chip-shape affordances (choice / confirm / mql-*).
 * Sits above the input row so chips don't fight for horizontal
 * space with the slot picker + send button.
 */
const ChipsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${tokens.space.sm};
  padding: ${tokens.space.md} ${tokens.space.xl} 0;
`;

const InputRow = styled.div<{ $hasChips: boolean }>`
  display: flex;
  align-items: stretch;
  padding: ${(p) =>
      p.$hasChips ? tokens.space.md : tokens.space.xl}
    ${tokens.space.xl} ${tokens.space.xl};

  /* Picker and input share an edge — no gap. Send button sits with a
   * slight breather to keep the click target distinct. */
  > button:last-child {
    margin-left: ${tokens.space.md};
  }
`;

/**
 * Dropdown anchor for the picker — wraps the picker chip + the
 * floating SlotDropdown so we can position the dropdown relative
 * to the chip without disturbing the input flow.
 */
const PickerAnchor = styled.div`
  position: relative;
  display: flex;
  align-items: stretch;
`;

/**
 * Multiline body-composition input for the `compose` prompt kind. Shares
 * the Input look but is a resizable textarea; ⌘/Ctrl+Enter submits.
 */
const ComposeArea = styled.textarea`
  flex: 1;
  padding: ${tokens.space.md};
  background: ${tokens.color.surfaceSunken};
  color: ${tokens.color.fg};
  border: 1px solid ${tokens.color.accent};
  border-left: none;
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.body};
  resize: vertical;

  &:focus {
    outline: none;
    border-color: ${tokens.color.accent};
  }
`;

/**
 * The active-input-mode pill shown left of the command input (e.g. the
 * channel you're scoped to). Visual sibling of a prompt slot chip.
 */
const ModeChip = styled.div`
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0 ${tokens.space.sm};
  background: ${tokens.color.surfaceAlt};
  border: 1px solid ${tokens.color.accent};
  border-right: none;
  color: ${tokens.color.accent};
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.body};
  white-space: nowrap;
`;

const ModeChipX = styled.button`
  background: none;
  border: none;
  color: ${tokens.color.fgMuted};
  cursor: pointer;
  padding: 0;
  font-size: 0.8rem;
  &:hover {
    color: ${tokens.color.fg};
  }
`;

const Input = styled.input<{ $flashing?: boolean; $promptMode?: boolean }>`
  flex: 1;
  padding: ${tokens.space.md};
  background: ${(p) =>
    p.$flashing
      ? '#264f3e'
      : p.$promptMode
      ? tokens.color.surfaceMuted
      : tokens.color.surfaceSunken};
  color: ${tokens.color.fg};
  border: 1px solid
    ${(p) =>
      p.$flashing
        ? tokens.color.accent
        : p.$promptMode
        ? tokens.color.accent
        : tokens.color.border};
  border-left: none;
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.body};
  transition: background 150ms, border-color 150ms;

  &:focus {
    outline: none;
    border-color: ${(p) =>
      p.$flashing
        ? tokens.color.accent
        : p.$promptMode
        ? tokens.color.accentHover
        : tokens.color.primary};
  }
`;

const SendButton = styled.button<{ $promptMode: boolean }>`
  padding: ${tokens.space.md} ${tokens.space.xl};
  background: ${(p) =>
    p.$promptMode ? tokens.color.accent : tokens.color.primary};
  color: ${(p) =>
    p.$promptMode ? tokens.color.surfaceSunken : 'white'};
  border: none;
  cursor: pointer;
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.body};
  white-space: nowrap;

  &:hover {
    background: ${(p) =>
      p.$promptMode ? tokens.color.accentHover : tokens.color.primaryHover};
  }
`;

/* --- Slot picker -------------------------------------------------- */

/**
 * The slot picker sits inline-left of the input. It ALWAYS renders,
 * regardless of whether prompts are pending — the command slot is
 * just the bottom of the stack. The label shown is whatever the
 * active slot's label is: `basePrompt` (e.g. `here>`) for command,
 * the prompt's question for a prompt. Click to open the dropdown
 * and pick which slot's response channel the input is bound to.
 */
const SlotPicker = styled.button<{ $expanded: boolean; $promptMode: boolean }>`
  display: flex;
  align-items: center;
  gap: ${tokens.space.sm};
  padding: ${tokens.space.md} ${tokens.space.md};
  background: ${(p) =>
    p.$expanded
      ? tokens.color.surfaceSunken
      : p.$promptMode
      ? tokens.color.surfaceMuted
      : tokens.color.surfaceSunken};
  color: ${(p) =>
    p.$promptMode ? tokens.color.accent : tokens.color.fgEmphasis};
  border: 1px solid
    ${(p) =>
      p.$promptMode ? tokens.color.accent : tokens.color.border};
  border-right: none;
  border-radius: 0;
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.body};
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    background: ${tokens.color.surfaceSunken};
  }
`;

/**
 * Pending-prompt count rendered on the right edge of the slot
 * picker chip. Only shows when at least one prompt is pending.
 * Counts every prompt slot (not including the always-present
 * base/command slot at the bottom of the stack) — same number
 * regardless of whether the active slot is base or a prompt, so
 * the player has a stable cue for "you've got N pending questions
 * underneath."
 */
const PendingCount = styled.span`
  display: inline-block;
  padding: 0 ${tokens.space.xs};
  color: ${tokens.color.fgMuted};
  font-size: ${tokens.font.small};
`;

/**
 * Dropdown caret on the right of the slot picker chip — gives the
 * "this opens a menu" affordance the bare label was missing.
 * Flips ▾/▴ based on open state.
 */
const Caret = styled.span`
  display: inline-block;
  color: ${tokens.color.fgMuted};
  font-size: ${tokens.font.small};
`;

/**
 * Floats above the slot picker so it doesn't shove the input row
 * around when opened. Anchored to the PickerAnchor wrapper; opens
 * upward (bottom: 100%) since the bar sits at the foot of the
 * cockpit.
 */
const SlotDropdown = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  min-width: 220px;
  background: ${tokens.color.surfaceSunken};
  border: 1px solid ${tokens.color.borderEmphasis};
  border-radius: ${tokens.radius.sm};
  position: absolute;
  bottom: 100%;
  left: 0;
  margin-bottom: ${tokens.space.xs};
  z-index: 10;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
`;

const SlotRow = styled.li<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: ${tokens.space.sm};
  padding: ${tokens.space.sm} ${tokens.space.md};
  background: ${(p) => (p.$active ? tokens.color.surfaceMuted : 'transparent')};
  border-left: 2px solid
    ${(p) => (p.$active ? tokens.color.accent : 'transparent')};
  font-size: ${tokens.font.small};

  &:hover {
    background: ${tokens.color.surfaceMuted};
  }
`;

const SlotRowLabel = styled.button`
  flex: 1;
  background: none;
  border: none;
  color: ${tokens.color.fg};
  font: inherit;
  text-align: left;
  cursor: pointer;
  padding: 0;

  &:hover {
    color: ${tokens.color.accentHover};
  }
`;

const KindChip = styled.span`
  padding: 0 ${tokens.space.sm};
  background: ${tokens.color.surfaceAlt};
  color: ${tokens.color.fgMuted};
  border-radius: ${tokens.radius.sm};
  font-size: ${tokens.font.micro};
`;

const DraftPreview = styled.span`
  color: ${tokens.color.fgMuted};
  font-style: italic;
  font-size: ${tokens.font.micro};
`;

const XButton = styled.button`
  padding: 0 ${tokens.space.sm};
  background: transparent;
  color: ${tokens.color.fgMuted};
  border: 1px solid ${tokens.color.borderMuted};
  border-radius: ${tokens.radius.sm};
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.micro};
  cursor: pointer;

  &:hover {
    color: ${tokens.color.fg};
    border-color: ${tokens.color.fgMuted};
  }
`;

/* --- Chip affordances --------------------------------------------- */

const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${tokens.space.sm};
`;

const Chip = styled.button<{ $primary?: boolean; $selected?: boolean }>`
  padding: ${tokens.space.xs} ${tokens.space.md};
  background: ${(p) =>
    p.$selected
      ? tokens.color.accent
      : p.$primary
      ? tokens.color.primary
      : tokens.color.actionBg};
  color: ${(p) =>
    p.$selected
      ? tokens.color.surfaceSunken
      : p.$primary
      ? 'white'
      : tokens.color.fg};
  border: 1px solid
    ${(p) => (p.$primary ? tokens.color.primary : tokens.color.borderEmphasis)};
  border-radius: ${tokens.radius.sm};
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.small};
  cursor: pointer;

  &:hover {
    background: ${(p) =>
      p.$selected ? tokens.color.accentHover : tokens.color.actionBgHover};
  }
`;

const ValidationMessage = styled.div`
  flex-basis: 100%;
  color: #e06c75;
  font-size: ${tokens.font.small};
  padding: 0 ${tokens.space.sm};
`;

/* --- Helpers ------------------------------------------------------ */

function kindLabelFor(entry: PromptEntry): string {
  return entry.kind;
}

function parseConfirmInput(text: string): 'yes' | 'no' | null {
  const t = text.trim().toLowerCase();
  if (t === 'y' || t === 'yes') return 'yes';
  if (t === 'n' || t === 'no') return 'no';
  return null;
}

function submitButtonLabel(entry: PromptEntry | undefined): string {
  if (!entry) return 'Send';
  if (entry.kind === 'compose') return 'Post';
  if (entry.kind === 'text' || entry.kind === 'confirm') return 'Respond';
  return 'Respond';
}

/* --- Component ---------------------------------------------------- */

export function CommandBar({
  baseValue,
  onBaseChange,
  onSendCommand,
  onSendPromptResponse,
  onCancelPrompt,
  flashing,
  previewing,
}: CommandBarProps) {
  const prompts = useStore((s) => s.prompts);
  // The active scope is this view's mode (the bars are per-view).
  const inputMode = useStore((s) => s.inputMode[s.mainView]);
  const setInputMode = useStore((s) => s.setInputMode);
  const clearInputMode = useStore((s) => s.clearInputMode);
  const activeSlot = useStore((s) => s.activeSlot);
  const promptDrafts = useStore((s) => s.promptDrafts);
  const basePrompt = useStore((s) => s.basePrompt);
  const setActiveSlot = useStore((s) => s.setActiveSlot);
  const setDraft = useStore((s) => s.setDraft);
  // Input is disabled while the bus is down (reconnecting / dropped):
  // commands can't be sent and are never queued, so a stale command
  // can't fire into a freshly-resumed world.
  const offline = useStore((s) => s.connection.link !== 'connected');

  const activeEntry: PromptEntry | undefined =
    activeSlot === BASE_SLOT
      ? undefined
      : prompts.find((p) => p.promptId === activeSlot);

  const promptMode = activeEntry !== undefined;

  // The input's displayed value: for base, use the controlled
  // baseValue from App (it tracks hover preview); for prompts, read
  // straight from store.
  const inputValue =
    activeSlot === BASE_SLOT
      ? baseValue
      : promptDrafts[activeSlot] ?? '';

  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Multi-select state for mql-many — keyed by promptId so the
  // selection persists across slot switches the same way drafts do.
  const [mqlManySelection, setMqlManySelection] = useState<
    Record<string, Set<string>>
  >({});

  // Reset mql-many selection when the prompt dismisses (the key
  // would otherwise grow unbounded across long sessions).
  useEffect(() => {
    setMqlManySelection((prev) => {
      const pendingIds = new Set(prompts.map((p) => p.promptId));
      let changed = false;
      const next: Record<string, Set<string>> = {};
      for (const [k, v] of Object.entries(prev)) {
        if (pendingIds.has(k)) {
          next[k] = v;
        } else {
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [prompts]);

  // History persistence — unchanged from the pre-refactor shape.
  useEffect(() => {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setHistory(parsed);
        }
      } catch (e) {
        console.warn('Failed to parse command history:', e);
      }
    }
  }, []);
  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    }
  }, [history]);

  /* --- Submit handlers -------------------------------------------- */

  const submitBase = () => {
    if (offline) return; // bus down — no send, no queue
    const trimmed = baseValue.trim();

    // Client-only `mode` control — intercepted, never sent to the server
    // (the scoped-input prefix is a client filter, like the console tabs).
    if (trimmed === 'mode' || trimmed === 'mode off') {
      clearInputMode();
      onBaseChange('');
      setHistoryIndex(-1);
      return;
    }
    if (!inputMode && trimmed.startsWith('mode ')) {
      const prefix = trimmed.slice(5).trim();
      if (prefix) setInputMode({ prefix, label: prefix });
      onBaseChange('');
      setHistoryIndex(-1);
      return;
    }

    // Apply the active mode prefix. A leading `/` escapes for a one-off
    // raw command; otherwise the bare input is wrapped into the real
    // command string `<prefix> <text>` (which is what reaches the bus).
    let toSend = baseValue;
    if (inputMode && trimmed) {
      toSend = trimmed.startsWith('/')
        ? trimmed.slice(1)
        : `${inputMode.prefix} ${trimmed}`;
    }
    onSendCommand(toSend);
    if (trimmed) {
      setHistory((prev) => {
        const filtered = prev[0] === trimmed ? prev : [trimmed, ...prev];
        return filtered.slice(0, MAX_HISTORY);
      });
    }
    onBaseChange('');
    setHistoryIndex(-1);
  };

  const submitActive = () => {
    if (offline) return; // bus down — no send, no queue
    if (!activeEntry) {
      submitBase();
      return;
    }
    const draft = promptDrafts[activeSlot] ?? '';
    switch (activeEntry.kind) {
      case 'text':
      case 'compose': {
        if (!draft) return;
        onSendPromptResponse(activeEntry.promptId, draft);
        // Draft drops in dismissPrompt; clear locally as a UI
        // affordance too so the input visually empties before the
        // dismissed envelope round-trips.
        setDraft(activeSlot, '');
        return;
      }
      case 'confirm': {
        const decoded = parseConfirmInput(draft);
        if (!decoded) return;
        onSendPromptResponse(activeEntry.promptId, decoded);
        setDraft(activeSlot, '');
        return;
      }
      case 'choice':
      case 'mql-object':
      case 'mql-many':
        // Chip-only kinds: Enter on bare input is a no-op.
        return;
    }
  };

  const handleChipSend = (entry: PromptEntry, response: string) => {
    onSendPromptResponse(entry.promptId, response);
    setDraft(entry.promptId, '');
  };

  const handleMqlManyToggle = (entry: PromptEntry, stuffId: string) => {
    setMqlManySelection((prev) => {
      const cur = prev[entry.promptId] ?? new Set<string>();
      const next = new Set(cur);
      if (next.has(stuffId)) {
        next.delete(stuffId);
      } else {
        next.add(stuffId);
      }
      return { ...prev, [entry.promptId]: next };
    });
  };

  const handleMqlManySend = (entry: PromptEntry) => {
    const sel = mqlManySelection[entry.promptId] ?? new Set<string>();
    onSendPromptResponse(entry.promptId, JSON.stringify([...sel]));
    setMqlManySelection((prev) => {
      const next = { ...prev };
      delete next[entry.promptId];
      return next;
    });
  };

  /* --- Key handling ---------------------------------------------- */

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitActive();
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      // Esc on a prompt slot returns to base without dismissing —
      // per slate, Esc is back-out, not kill. Esc on base clears
      // the input (legacy behavior).
      if (promptMode) {
        setActiveSlot(BASE_SLOT);
        return;
      }
      // Esc backs out of an active input mode first; a second Esc (or Esc
      // with no mode) clears the input.
      if (inputMode) {
        clearInputMode();
        return;
      }
      onBaseChange('');
      setHistoryIndex(-1);
      return;
    }
    // History only on base. Prompt slots treat arrows as plain
    // text-edit keys (some prompt responses are multi-line-ish).
    if (!promptMode && e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const newIndex = Math.min(historyIndex + 1, history.length - 1);
        setHistoryIndex(newIndex);
        onBaseChange(history[newIndex] || '');
      }
    } else if (!promptMode && e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        onBaseChange(history[newIndex] || '');
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        onBaseChange('');
      }
    }
  };

  /* --- Render helpers -------------------------------------------- */

  const activeChips = useMemo(() => {
    if (!activeEntry) return null;
    switch (activeEntry.kind) {
      case 'choice':
        return (
          <ChipRow>
            {activeEntry.choices.map((c) => (
              <Chip
                key={c.response}
                $primary={c.response === activeEntry.defaultChoice}
                onClick={() => handleChipSend(activeEntry, c.response)}
              >
                {c.label}
              </Chip>
            ))}
          </ChipRow>
        );
      case 'confirm': {
        const yesPrimary = activeEntry.defaultAnswer === 'yes';
        return (
          <ChipRow>
            <Chip
              $primary={yesPrimary}
              onClick={() => handleChipSend(activeEntry, 'yes')}
            >
              Yes
            </Chip>
            <Chip
              $primary={!yesPrimary}
              onClick={() => handleChipSend(activeEntry, 'no')}
            >
              No
            </Chip>
          </ChipRow>
        );
      }
      case 'mql-object':
        return (
          <ChipRow>
            {activeEntry.matches.map((m) => (
              <Chip
                key={m.stuffId}
                onClick={() => handleChipSend(activeEntry, m.stuffId)}
              >
                {m.displayName}
              </Chip>
            ))}
          </ChipRow>
        );
      case 'mql-many': {
        const sel =
          mqlManySelection[activeEntry.promptId] ?? new Set<string>();
        const bounds: string[] = [];
        if (activeEntry.min !== undefined) bounds.push(`min ${activeEntry.min}`);
        if (activeEntry.max !== undefined) bounds.push(`max ${activeEntry.max}`);
        return (
          <ChipRow>
            {activeEntry.matches.map((m) => (
              <Chip
                key={m.stuffId}
                $selected={sel.has(m.stuffId)}
                onClick={() => handleMqlManyToggle(activeEntry, m.stuffId)}
              >
                {m.displayName}
              </Chip>
            ))}
            <Chip $primary onClick={() => handleMqlManySend(activeEntry)}>
              Send{sel.size > 0 ? ` (${sel.size})` : ''}
              {bounds.length > 0 ? ` · ${bounds.join(' · ')}` : ''}
            </Chip>
          </ChipRow>
        );
      }
      case 'text':
        // Text uses the input row; no chips.
        return null;
    }
    // The prompt-chip handlers close only over stable state setters and
    // the entry passed in as an argument, so leaving them out of the dep
    // array is intentional — the memo already recomputes on the inputs
    // that actually affect its output.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEntry, mqlManySelection]);

  // Slot picker is ALWAYS rendered. The base/command slot is just
  // the bottom of the stack — UI treats it identically to a prompt.
  // Label = active slot's label (basePrompt for base; prompt
  // question for a prompt). Click opens the dropdown to switch
  // active slot.
  const slotPickerLabel = activeEntry ? activeEntry.label : basePrompt;
  const hasChips = activeEntry !== undefined && activeEntry.kind !== 'text';
  const hasValidationError = activeEntry?.validationError !== undefined;

  return (
    <BarContainer $promptMode={promptMode}>
      {hasChips || hasValidationError ? (
        <ChipsRow>
          {hasChips ? activeChips : null}
          {hasValidationError ? (
            <ValidationMessage>
              {activeEntry!.validationError}
            </ValidationMessage>
          ) : null}
        </ChipsRow>
      ) : null}

      <InputRow $hasChips={hasChips || hasValidationError}>
        <PickerAnchor>
          <SlotPicker
            $expanded={dropdownOpen}
            $promptMode={promptMode}
            onClick={() => setDropdownOpen((v) => !v)}
            aria-label="Open slot picker"
          >
            <Caret>{dropdownOpen ? '▴' : '▾'}</Caret>
            {prompts.length > 0 ? (
              <PendingCount>{prompts.length}</PendingCount>
            ) : null}
            <span>{slotPickerLabel}</span>
          </SlotPicker>

          {dropdownOpen ? (
            <SlotDropdown>
              <SlotRow $active={activeSlot === BASE_SLOT}>
                <SlotRowLabel
                  onClick={() => {
                    setActiveSlot(BASE_SLOT);
                    setDropdownOpen(false);
                  }}
                >
                  {basePrompt}
                </SlotRowLabel>
                <KindChip>command</KindChip>
                {promptDrafts[BASE_SLOT] ? (
                  <DraftPreview>
                    {promptDrafts[BASE_SLOT].slice(0, 32)}
                  </DraftPreview>
                ) : null}
              </SlotRow>
              {prompts.map((p) => (
                <SlotRow key={p.promptId} $active={activeSlot === p.promptId}>
                  <SlotRowLabel
                    onClick={() => {
                      setActiveSlot(p.promptId);
                      setDropdownOpen(false);
                    }}
                  >
                    {p.label}
                  </SlotRowLabel>
                  <KindChip>{kindLabelFor(p)}</KindChip>
                  {promptDrafts[p.promptId] ? (
                    <DraftPreview>
                      {promptDrafts[p.promptId]!.slice(0, 32)}
                    </DraftPreview>
                  ) : null}
                  <XButton onClick={() => onCancelPrompt(p.promptId)}>
                    X
                  </XButton>
                </SlotRow>
              ))}
            </SlotDropdown>
          ) : null}
        </PickerAnchor>

        {inputMode && !promptMode && !previewing && (
          <ModeChip title="Esc to exit">
            <span>{inputMode.label}</span>
            <ModeChipX
              aria-label="exit mode"
              onClick={() => clearInputMode()}
            >
              ✕
            </ModeChipX>
          </ModeChip>
        )}

        {activeEntry && activeEntry.kind === 'compose' ? (
          // Multiline body composition — markdown; ⌘/Ctrl+Enter submits,
          // Enter inserts a newline. (A live MML preview + "open in editor"
          // escalation are the next increment; the slot machinery here is
          // already generic.)
          <ComposeArea
            value={inputValue}
            onChange={(e) => setDraft(activeSlot, e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                submitActive();
              }
            }}
            disabled={offline}
            placeholder={activeEntry.placeholder ?? 'Compose (Markdown)…'}
            autoFocus
            rows={4}
          />
        ) : (
          <Input
            value={inputValue}
            onChange={(e) => {
              if (activeSlot === BASE_SLOT) {
                onBaseChange(e.target.value);
              } else {
                setDraft(activeSlot, e.target.value);
              }
            }}
            onKeyDown={handleKeyDown}
            disabled={offline}
            placeholder={
              offline
                ? 'Disconnected — reconnecting…'
                : promptMode
                ? activeEntry && activeEntry.kind === 'text'
                  ? activeEntry.placeholder ?? 'Type your answer...'
                  : activeEntry && activeEntry.kind === 'confirm'
                  ? 'y / n (or click)'
                  : 'Click a choice above, or Esc to return to commands'
                : inputMode
                ? `${inputMode.prefix} … (/ for a raw command, Esc to exit)`
                : 'Enter command...'
            }
            autoFocus
            $flashing={flashing}
            $promptMode={promptMode}
          />
        )}
        <SendButton
          $promptMode={promptMode}
          onClick={submitActive}
          disabled={offline}
        >
          {submitButtonLabel(activeEntry)}
        </SendButton>
      </InputRow>
    </BarContainer>
  );
}
