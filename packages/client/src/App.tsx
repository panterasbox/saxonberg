/**
 * App - Main application component
 *
 * Handles:
 * - Authentication flow
 * - WebSocket connection
 * - Terminal UI for game interaction
 */

import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { useStore, type PromptEntry } from './store/index';
import { websocketClient } from './services/websocket';
import { ConnectionStatus } from './components/ConnectionStatus';
import { Terminal } from './components/Terminal';
import { TabStrip } from './components/TabStrip';
import { CommandBar } from './components/CommandBar';
import { InspectionPane } from './components/InspectionPane';
import { tokens } from './components/ui';
import type { ConsoleTab } from '@saxonberg/types';

const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: ${tokens.color.surfaceSunken};
`;

/**
 * Top-level cockpit shell. Left column holds the terminal scrollback
 * + command bar (the existing single-column UX); right column hosts
 * the inspection pane. Fixed-width, no user-resize, no tab strip in
 * v1 — see the inspection-pane requirements' non-goals.
 */
const Cockpit = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;
`;

const LeftColumn = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
`;

/**
 * Tokenise the leading verb of a command line. The shell's parser is
 * server-side; this is a deliberately-coarse client-side peek that
 * only the pane consumes for paint/clear gating. Whitespace-split
 * the first token, lowercase it, and trust the server for everything
 * else. Aliases that compile to `look` / `focus` (e.g. `l`, `f`) are
 * not expanded here; in practice the cockpit slate gestures send the
 * canonical verbs.
 */
function parseLeadingVerb(text: string): { verb: string; rest: string } {
  const trimmed = text.trim();
  if (!trimmed) return { verb: '', rest: '' };
  const spaceAt = trimmed.indexOf(' ');
  if (spaceAt < 0) return { verb: trimmed.toLowerCase(), rest: '' };
  return {
    verb: trimmed.slice(0, spaceAt).toLowerCase(),
    rest: trimmed.slice(spaceAt + 1).trim(),
  };
}

/**
 * Strip the `--peek` flag (and any other flag tokens) so the
 * remainder reads as the bare target the player typed.
 */
function stripFlags(rest: string): string {
  return rest
    .split(/\s+/)
    .filter((tok) => tok.length > 0 && !tok.startsWith('--'))
    .join(' ');
}

/**
 * Apply the pane-side paint/clear consequences of an outgoing
 * command. Bare `look` paints against the current focus; `look <X>
 * --peek` is observe-only and does not paint; `focus <X>` clears
 * the body until the next look. Every other verb is a pane no-op.
 *
 * For `look <X>` / `focus <X>` with a typed target, also stash the
 * typed fragment as the pending breadcrumb-trail label. The
 * inspection pane's focus-subscription handler consumes it when
 * the focus change confirms server-side, so the trail entry reads
 * as what the player typed instead of the resolved Stuff's
 * primaryKeyword. The breadcrumb-push wiring still skips when
 * focus didn't actually change, so a cancelled disambiguation or a
 * rejected command never adds a trail entry.
 */
function applyOutgoingCommandToPane(text: string): void {
  const { verb, rest } = parseLeadingVerb(text);
  const store = useStore.getState();
  if (verb === 'look') {
    const isPeek = / --peek(\s|$)/.test(' ' + text + ' ');
    if (isPeek) return; // peek is a pane no-op
    store.setPanePainted(true);
    const target = stripFlags(rest);
    if (target) store.setPendingTrailLabel(target);
    return;
  }
  if (verb === 'focus') {
    store.setPanePainted(false);
    const target = stripFlags(rest);
    if (target) store.setPendingTrailLabel(target);
    return;
  }
  // Other verbs: leave pane state alone.
}

const LoginContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: #1e1e1e;
  color: #d4d4d4;
  font-family: 'Courier New', monospace;
`;

const LoginMessage = styled.div`
  padding: 2rem;
  background: #2d2d2d;
  border: 1px solid #444;
  border-radius: 8px;
  text-align: center;
  max-width: 500px;
`;

const LoginTitle = styled.h1`
  margin: 0 0 1rem 0;
  font-size: 24px;
  color: #007acc;
`;

const LoginText = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
`;

/**
 * Render the player-facing label for a prompt response. For chip-
 * driven kinds we resolve the wire response back to the human-
 * readable label so the terminal scrollback reads `Which sword? →
 * rusty sword` instead of `Which sword? → <stuffId>`. Returns
 * `null` when the prompt isn't in the store (already dismissed by
 * the time we render), since the line wouldn't have context.
 */
function formatResponseEcho(
  promptId: string,
  response: string
): string | null {
  const entry = useStore
    .getState()
    .prompts.find((p) => p.promptId === promptId);
  if (!entry) return null;
  let resolved: string;
  switch (entry.kind) {
    case 'text':
      resolved = response;
      break;
    case 'confirm':
      resolved = response === 'yes' ? 'Yes' : 'No';
      break;
    case 'choice': {
      const hit = entry.choices.find((c) => c.response === response);
      resolved = hit ? hit.label : response;
      break;
    }
    case 'mql-object': {
      const hit = entry.matches.find((m) => m.stuffId === response);
      resolved = hit ? hit.displayName : response;
      break;
    }
    case 'mql-many': {
      try {
        const ids: unknown = JSON.parse(response);
        if (!Array.isArray(ids)) {
          resolved = response;
          break;
        }
        const names = ids.map((id) => {
          const hit = entry.matches.find((m) => m.stuffId === id);
          return hit ? hit.displayName : String(id);
        });
        resolved = names.join(', ');
      } catch {
        resolved = response;
      }
      break;
    }
    default: {
      const _exhaustive: never = entry;
      resolved = response;
    }
  }
  return `${entry.label} → ${resolved}`;
}

/**
 * App component.
 */
function App() {
  const auth = useStore((state) => state.auth);
  const connection = useStore((state) => state.connection);
  const frames = useStore((state) => state.frames);
  const clientState = useStore((state) => state.clientState);
  // Filter frames by the active tab's muted set. The 'All' default
  // mutes nothing, so a fresh player sees the full firehose.
  const activeTabName =
    (clientState['console.activeTab'] as string | undefined) ?? 'All';
  const tabs =
    (clientState['console.tabs'] as ConsoleTab[] | undefined) ?? [];
  const activeTab = tabs.find((t) => t.name === activeTabName);
  const mutedSet = new Set(activeTab?.muted ?? []);
  const visibleFrames = frames.filter((f) => !mutedSet.has(f.topic));
  // Single display value for the input. Three sources can drive it:
  //   1. The user typing (kept in userTypedRef as the canonical text).
  //   2. A hover preview from a clickable affordance (transient).
  //   3. The post-click flash showing the sent command (transient).
  // userTypedRef stays untouched during hover so we can restore it
  // on mouse-leave even if the user moved between adjacent
  // clickables. The restore is deferred by one tick so a leave →
  // enter sequence can cancel the pending restore.
  const [inputValue, setInputValue] = useState('');
  const [flashing, setFlashing] = useState(false);
  const userTypedRef = useRef('');
  const previewActiveRef = useRef(false);
  const restoreTimerRef = useRef<number | null>(null);
  const flashTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (restoreTimerRef.current !== null)
        window.clearTimeout(restoreTimerRef.current);
      if (flashTimerRef.current !== null)
        window.clearTimeout(flashTimerRef.current);
    };
  }, []);

  useEffect(() => {
    // Check auth status on mount
    checkAuthStatus();

    // Check for auth callback
    const params = new URLSearchParams(window.location.search);
    const authResult = params.get('auth');

    if (authResult === 'success') {
      // Remove query param from URL
      window.history.replaceState({}, '', window.location.pathname);

      // Check auth status and connect
      checkAuthStatus();
    } else if (authResult === 'failure') {
      console.error('Authentication failed');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    // Connect to WebSocket when authenticated
    if (auth.isAuthenticated && !connection.isConnected) {
      console.info('App: Authenticated - connecting to WebSocket...');
      websocketClient.connect('ws://localhost:2010');
    }
  }, [auth.isAuthenticated, connection.isConnected]);

  useEffect(() => {
    // Single catch-all subscription feeds the typed frame buffer.
    // Replaces the prior per-topic allowlist — frames on previously-
    // unknown topics still reach the store via this path. The Terminal
    // renders the buffer; tab-level filtering (Phase 3+) reads from
    // the same buffer.
    //
    // Echo frames (`system.log.command.{info|warn}`) pair against the
    // FIFO echo-snapshot queue at arrival time so the rendered line
    // carries the base-prompt sigil that was active when the player
    // pressed Enter, regardless of where focus has moved since. The
    // sigil is kept on the Frame alongside the body; the Terminal
    // concatenates at render time.
    const handle = (frame: import('@saxonberg/types').MessageFrame) => {
      if (!frame.body) return;
      const isEcho =
        frame.topic === 'system.log.command.info' ||
        frame.topic === 'system.log.command.warn';
      let sigil: string | undefined;
      if (isEcho) {
        const snap = useStore.getState().shiftEchoSnapshot();
        sigil = snap?.sigil ?? useStore.getState().basePrompt;
      }
      useStore.getState().appendFrame({
        id: frame.id,
        topic: frame.topic,
        body: frame.body,
        timestamp: frame.meta?.timestamp ?? Date.now(),
        ...(sigil !== undefined ? { sigil } : {}),
      });
    };
    websocketClient.onAnyTopic(handle);
    return () => {
      websocketClient.offAnyTopic(handle);
    };
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('http://localhost:2010/auth/status', {
        credentials: 'include',
      });

      const data = await response.json();

      if (data.isAuthenticated) {
        useStore.getState().setAuth({
          isAuthenticated: true,
          user: data.user || null,
          player: data.player || null,
        });
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    }
  };

  const sendCommand = (text: string) => {
    if (!websocketClient.isConnected()) {
      console.warn('Cannot send command: not connected');
      return;
    }

    // Pane paint/clear policy lives at the outgoing-command seam:
    //   - `look ...` paints the pane body (and, when targeted,
    //     refreshes the breadcrumb trail with the target as a
    //     "we've looked at this" anchor).
    //   - `focus ...` clears the pane body (the next look will
    //     re-paint) and records the new fragment.
    // Other verbs leave the pane state untouched; subscription
    // deltas continue to update the cached result and the live
    // header regardless of which verb triggered them.
    applyOutgoingCommandToPane(text);

    // Push an echo-pairing snapshot for non-empty commands. The
    // server's empty-command short-circuit doesn't fire an input-
    // echo MessageFrame, so an empty submission must not queue a
    // snapshot — otherwise the FIFO drifts out of alignment with
    // the inbound echoes.
    if (text.trim().length > 0) {
      useStore.getState().pushEchoSnapshot({
        slot: 'base',
        sigil: useStore.getState().basePrompt,
      });
    }

    websocketClient.send({
      type: 'command',
      payload: { text },
    });
  };

  /**
   * Send a response to an active server-side prompt. Emits the
   * resolution echo line locally at send time — prompt responses
   * don't ride the system.log.command.* echo channel, so the
   * snapshot-pairing path doesn't apply here. The label-prefixed
   * line lands in the scroll regardless of which prompt is active
   * by the time the dismissed envelope round-trips.
   */
  const sendPromptResponse = (promptId: string, response: string) => {
    if (!websocketClient.isConnected()) {
      console.warn('Cannot send prompt response: not connected');
      return;
    }
    const echo = formatResponseEcho(promptId, response);
    if (echo) {
      useStore.getState().appendFrame({
        id: `prompt-echo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        topic: 'system.log.command.info',
        body: echo,
        timestamp: Date.now(),
      });
    }
    websocketClient.sendPromptResponse(promptId, response);
  };

  /**
   * Cancel a specific pending prompt (the X-button affordance).
   * Wholesale cancel rides the command bus via `prompt cancel` and
   * goes through `sendCommand`. No terminal echo for v1 —
   * cancellation is interactive-visible (the prompt vanishes from
   * the slot picker).
   */
  const cancelPrompt = (promptId: string) => {
    if (!websocketClient.isConnected()) {
      console.warn('Cannot cancel prompt: not connected');
      return;
    }
    websocketClient.sendPromptCancel(promptId);
  };

  /**
   * Mirror keystrokes into the canonical userTyped buffer and clear
   * any in-flight preview state (a keystroke ends a preview).
   */
  const handleInputChange = (value: string) => {
    if (previewActiveRef.current) {
      previewActiveRef.current = false;
      if (restoreTimerRef.current !== null) {
        window.clearTimeout(restoreTimerRef.current);
        restoreTimerRef.current = null;
      }
    }
    userTypedRef.current = value;
    setInputValue(value);
  };

  /**
   * Hover preview. `null` means "stop previewing" (mouseleave); a
   * string means "start previewing this command" (mouseenter). The
   * restore is deferred by one tick so an immediately-following
   * mouseenter on an adjacent clickable cancels it — without that,
   * a sweep across two affordances flashes the userTyped buffer
   * mid-transition.
   */
  const handleCommandPreview = (command: string | null) => {
    if (restoreTimerRef.current !== null) {
      window.clearTimeout(restoreTimerRef.current);
      restoreTimerRef.current = null;
    }
    if (command === null) {
      restoreTimerRef.current = window.setTimeout(() => {
        previewActiveRef.current = false;
        setInputValue(userTypedRef.current);
        restoreTimerRef.current = null;
      }, 0);
    } else {
      previewActiveRef.current = true;
      setInputValue(command);
    }
  };

  /**
   * Click-to-send: command-bus primacy. The input already shows the
   * command (via the preview) when the click lands. Send, flash for
   * 150ms, clear. Any user-typed buffer is also cleared — a click
   * commits to sending, so the prior typing is no longer relevant.
   */
  const handleCommandClick = (command: string) => {
    if (restoreTimerRef.current !== null) {
      window.clearTimeout(restoreTimerRef.current);
      restoreTimerRef.current = null;
    }
    previewActiveRef.current = false;
    userTypedRef.current = '';

    setInputValue(command);
    sendCommand(command);
    setFlashing(true);
    if (flashTimerRef.current !== null) {
      window.clearTimeout(flashTimerRef.current);
    }
    flashTimerRef.current = window.setTimeout(() => {
      setFlashing(false);
      setInputValue('');
      flashTimerRef.current = null;
    }, 150);
  };

  useEffect(() => {
    // Debug hooks for driving substrate UI from the browser console
    // without server-side wiring. Per the prompt-stack slate's
    // "Client build" wave 1: `__pushPrompt`, `__popPrompt`,
    // `__validateFail`. Use these to exercise the CommandBar's
    // slot multiplexing + chip rendering before content adopts
    // `PromptApi`-pushing verbs. Also exposes `useStore` for
    // ad-hoc inspection.
    //
    //   __pushPrompt({ kind: 'text', promptId: 'p1', label: 'Name?', foreground: true })
    //   __popPrompt('p1')
    //   __validateFail('p1', 'too short')
    //   __injectMessage('<exit dir="south">south</exit>')
    const w = window as unknown as {
      __injectMessage?: (text: string) => void;
      __pushPrompt?: (entry: PromptEntry) => void;
      __popPrompt?: (promptId: string) => void;
      __validateFail?: (promptId: string, message: string | null) => void;
      __store?: typeof useStore;
    };
    w.__injectMessage = (text: string) => {
      console.info('__injectMessage:', text);
      useStore.getState().appendFrame({
        id: `inject-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        topic: 'world.narration.action',
        body: text,
        timestamp: Date.now(),
      });
    };
    w.__pushPrompt = (entry: PromptEntry) => {
      console.info('__pushPrompt:', entry);
      useStore.getState().pushPrompt(entry);
    };
    w.__popPrompt = (promptId: string) => {
      console.info('__popPrompt:', promptId);
      useStore.getState().dismissPrompt(promptId);
    };
    w.__validateFail = (promptId: string, message: string | null) => {
      console.info('__validateFail:', promptId, message);
      useStore.getState().setPromptValidationError(promptId, message);
    };
    w.__store = useStore;
    return () => {
      delete w.__injectMessage;
      delete w.__pushPrompt;
      delete w.__popPrompt;
      delete w.__validateFail;
      delete w.__store;
    };
  }, []);

  // Show login screen if not authenticated
  if (!auth.isAuthenticated) {
    return (
      <LoginContainer>
        <LoginMessage>
          <LoginTitle>Saxonberg 2.0</LoginTitle>
          <LoginText>
            Please log in with your Google account to enter the world.
            <br />
            <br />
            <a
              href="http://localhost:2010/auth/google"
              style={{ color: '#007acc', textDecoration: 'none' }}
            >
              Login with Google
            </a>
          </LoginText>
        </LoginMessage>
      </LoginContainer>
    );
  }

  // Show game UI when authenticated and connected
  return (
    <AppContainer>
      <ConnectionStatus />
      <Cockpit>
        <LeftColumn>
          <TabStrip />
          <Terminal
            frames={visibleFrames}
            onCommandClick={handleCommandClick}
            onCommandPreview={handleCommandPreview}
          />
          <CommandBar
            baseValue={inputValue}
            onBaseChange={handleInputChange}
            onSendCommand={sendCommand}
            onSendPromptResponse={sendPromptResponse}
            onCancelPrompt={cancelPrompt}
            flashing={flashing}
          />
        </LeftColumn>
        <InspectionPane
          onSendCommand={sendCommand}
          onCommandPreview={handleCommandPreview}
        />
      </Cockpit>
    </AppContainer>
  );
}

export default App;
