/**
 * App - Main application component
 *
 * Handles:
 * - Authentication flow
 * - WebSocket connection
 * - Terminal UI for game interaction
 */

import React, { useEffect, useRef, useState } from "react";
import { nanoid } from "nanoid";
import styled from "styled-components";
import { useStore, type PromptEntry } from "./store/index";
import { registerReactionHandlers } from "./store/reactionActions";
import { registerForumHandlers } from "./store/forumActions";
import { ForumView } from "./components/ForumView";
import { ForumChatSidecar } from "./components/ForumChatSidecar";
import { SERVER_URL, WS_URL } from "./config";
import { websocketClient } from "./services/websocket";
import { Frame } from "./components/frame/Frame";
import { ReconnectBanner } from "./components/frame/ReconnectBanner";
import { StartScreen } from "./components/StartScreen";
import { Terminal } from "./components/Terminal";
import { TabStrip } from "./components/TabStrip";
import { FilterDrawer } from "./components/FilterDrawer";
import { CommandBar } from "./components/CommandBar";
import { InspectionPane } from "./components/InspectionPane";
import { CharacterSelect } from "./components/CharacterSelect";
import { CharGenStage } from "./components/CharGenStage";
import { CmsSurface } from "./components/cms/CmsSurface";
import { tokens } from "./components/ui";
import type { ConsoleTab } from "@saxonberg/types";

const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: ${tokens.color.surfaceSunken};
`;

/**
 * Neutral connecting splash — the `connecting` phase (authenticated, WS
 * handshaking) before the first server frame picks the real destination.
 * Deliberately NOT the character-select/roster screen: a player with no
 * characters should never glimpse a roster on the way to char-gen.
 */
const Splash = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: ${tokens.color.surfaceSunken};
  color: ${tokens.color.fgMuted};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};
  font-style: italic;
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
 * The in-world primary-view switch (Terminal | Forum). Distinct from the
 * TabStrip (which is a filter axis *inside* the Terminal view) — this
 * swaps the whole LeftColumn content slot + the view-sensitive right
 * column, while Frame + CommandBar persist.
 */
const ViewSwitch = styled.div`
  display: flex;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
`;

const ViewTab = styled.button<{ $active: boolean }>`
  background: ${(p) => (p.$active ? "rgba(255,255,255,0.14)" : "transparent")};
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 4px;
  color: inherit;
  cursor: pointer;
  padding: 0.15rem 0.6rem;
  font: inherit;
`;

/**
 * A live-scene peek so the player never goes dark on live play while the
 * Forum view is active — the most recent scene frame surfaces as a toast.
 */
const ScenePeek = styled.div`
  position: absolute;
  bottom: 4.5rem;
  right: 1rem;
  max-width: 22rem;
  padding: 0.5rem 0.75rem;
  border-radius: ${tokens.radius.md};
  background: ${tokens.color.surfaceAlt};
  border: 1px solid ${tokens.color.borderEmphasis};
  color: ${tokens.color.fgMuted};
  font-size: 0.85rem;
  pointer-events: none;
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
  if (!trimmed) return { verb: "", rest: "" };
  const spaceAt = trimmed.indexOf(" ");
  if (spaceAt < 0) return { verb: trimmed.toLowerCase(), rest: "" };
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
    .filter((tok) => tok.length > 0 && !tok.startsWith("--"))
    .join(" ");
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
  if (verb === "look") {
    const isPeek = / --peek(\s|$)/.test(" " + text + " ");
    if (isPeek) return; // peek is a pane no-op
    store.setPanePainted(true);
    const target = stripFlags(rest);
    if (target) store.setPendingTrailLabel(target);
    return;
  }
  if (verb === "focus") {
    store.setPanePainted(false);
    const target = stripFlags(rest);
    if (target) store.setPendingTrailLabel(target);
    return;
  }
  // Other verbs: leave pane state alone.
}

/**
 * Render the player-facing label for a prompt response. For chip-
 * driven kinds we resolve the wire response back to the human-
 * readable label so the terminal scrollback reads `Which sword? →
 * rusty sword` instead of `Which sword? → <stuffId>`. Returns
 * `null` when the prompt isn't in the store (already dismissed by
 * the time we render), since the line wouldn't have context.
 */
function formatResponseEcho(promptId: string, response: string): string | null {
  const entry = useStore
    .getState()
    .prompts.find((p) => p.promptId === promptId);
  if (!entry) return null;
  let resolved: string;
  switch (entry.kind) {
    case "text":
    case "compose":
      resolved = response;
      break;
    case "confirm":
      resolved = response === "yes" ? "Yes" : "No";
      break;
    case "choice": {
      const hit = entry.choices.find((c) => c.response === response);
      resolved = hit ? hit.label : response;
      break;
    }
    case "mql-object": {
      const hit = entry.matches.find((m) => m.stuffId === response);
      resolved = hit ? hit.displayName : response;
      break;
    }
    case "mql-many": {
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
        resolved = names.join(", ");
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

const FORUM_SUBCOMMANDS = new Set([
  "list",
  "make",
  "on",
  "post",
  "reply",
  "read",
  "promote",
  "follow",
  "vote",
]);

/**
 * Recognize a `forum` / `forum <board>` invocation and flip the cockpit
 * to the forum view + set the nav target. Subcommand forms (post / vote /
 * make …) leave the view alone — the server handles them and any live
 * subscription updates the already-open view. This is the client side of
 * the CLI⇄GUI convergence; the command still goes to the server too.
 */
function recognizeForumNavigation(text: string): void {
  const tokens = text.trim().split(/\s+/);
  if (tokens[0] !== "forum") return;
  const store = useStore.getState();
  if (tokens.length === 1) {
    store.setMainView("forum");
    return;
  }
  const arg = tokens[1]!;
  if (FORUM_SUBCOMMANDS.has(arg.toLowerCase())) return;
  // A bare `forum <board>` reads a board → open it in the forum view.
  store.setMainView("forum");
  store.setForumNav({ boardHandle: arg, threadId: null });
}

/**
 * Read once at module load: is this tab the CMS surface (`?surface=cms`)?
 * The CMS opens in its own browser tab sharing the session; when this is
 * true, `App` renders a full-screen `<CmsSurface/>` takeover bypassing
 * the cockpit and — crucially — opens NO WebSocket connection (the CMS
 * is REST-only; see plan §5). The query is fixed for the tab's life, so
 * reading it once at module load is sufficient.
 */
const IS_CMS_SURFACE =
  new URLSearchParams(window.location.search).get("surface") === "cms";

/**
 * App component.
 */
function App() {
  const auth = useStore((state) => state.auth);
  const connection = useStore((state) => state.connection);
  const connectionPhase = useStore((state) => state.connectionPhase);
  const mainView = useStore((state) => state.mainView);
  const setMainView = useStore((state) => state.setMainView);
  const frames = useStore((state) => state.frames);
  const clientState = useStore((state) => state.clientState);
  const reactionPrefs = useStore((state) => state.reactionPrefs);
  // Filter frames by the active tab's muted set. The 'All' default
  // mutes nothing, so a fresh player sees the full firehose.
  const activeTabName =
    (clientState["console.activeTab"] as string | undefined) ?? "All";
  const tabs = (clientState["console.tabs"] as ConsoleTab[] | undefined) ?? [];
  const activeTab = tabs.find((t) => t.name === activeTabName);
  const mutedSet = new Set(activeTab?.muted ?? []);
  // `social.react.alwaysAggregate` — hide reaction prose lines (frames
  // carrying `inReactionTo`); the chip on the target message carries the
  // aggregate instead.
  const visibleFrames = frames.filter(
    (f) =>
      !mutedSet.has(f.topic) &&
      !(reactionPrefs.alwaysAggregate && f.inReactionTo !== undefined),
  );
  // Live-scene peek for the forum view — the most recent in-world scene
  // frame, stripped of MML, so the player keeps live awareness without
  // leaving the forum. Recomputed as frames arrive.
  const scenePeek = React.useMemo(() => {
    for (let i = visibleFrames.length - 1; i >= 0; i--) {
      const f = visibleFrames[i]!;
      if (f.topic.startsWith("world.")) {
        return f.body
          .replace(/<[^>]+>/g, "")
          .trim()
          .slice(0, 160);
      }
    }
    return null;
  }, [visibleFrames]);
  // Single display value for the input. Three sources can drive it:
  //   1. The user typing (kept in userTypedRef as the canonical text).
  //   2. A hover preview from a clickable affordance (transient).
  //   3. The post-click flash showing the sent command (transient).
  // userTypedRef stays untouched during hover so we can restore it
  // on mouse-leave even if the user moved between adjacent
  // clickables. The restore is deferred by one tick so a leave →
  // enter sequence can cancel the pending restore.
  const [inputValue, setInputValue] = useState("");
  // True while a clickable affordance's command is previewed in the bar.
  // The command bar hides the input-mode chip during a preview so a
  // previewed direct command (e.g. `forum vote …`) doesn't read as though
  // it'll be wrapped by the active chat mode.
  const [previewing, setPreviewing] = useState(false);
  const [flashing, setFlashing] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const userTypedRef = useRef("");
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

  // The Terminal and Forum command bars are conceptually separate bars.
  // Their scope (mode) is held per-view in the store; the typed draft is
  // transient, so it starts fresh on each view switch rather than carrying
  // a half-typed line from one context into the other.
  useEffect(() => {
    setInputValue("");
    userTypedRef.current = "";
  }, [mainView]);

  useEffect(() => {
    // Check auth status on mount
    checkAuthStatus();

    // Check for auth callback
    const params = new URLSearchParams(window.location.search);
    const authResult = params.get("auth");

    if (authResult === "success") {
      // Remove query param from URL
      window.history.replaceState({}, "", window.location.pathname);

      // Check auth status and connect
      checkAuthStatus();
    } else if (authResult === "failure") {
      console.error("Authentication failed");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    // Connect to WebSocket when authenticated — EXCEPT on the CMS
    // surface, which is REST-only and must never open a WS (plan §5).
    if (IS_CMS_SURFACE) return;
    if (auth.isAuthenticated && !connection.isConnected) {
      console.info("App: Authenticated - connecting to WebSocket...");
      websocketClient.connect(WS_URL);
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
    const handle = (frame: import("@saxonberg/types").MessageFrame) => {
      if (!frame.body) return;
      const isEcho =
        frame.topic === "system.log.command.info" ||
        frame.topic === "system.log.command.warn";
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
        ...(frame.meta?.commandId !== undefined
          ? { commandId: frame.meta.commandId }
          : {}),
        ...(frame.meta?.inReactionTo !== undefined
          ? { inReactionTo: frame.meta.inReactionTo }
          : {}),
        ...(frame.meta?.frameId !== undefined
          ? { frameId: frame.meta.frameId }
          : {}),
        ...(typeof (frame.payload as { channelName?: unknown } | undefined)
          ?.channelName === "string"
          ? {
              channelName: (frame.payload as { channelName: string })
                .channelName,
            }
          : {}),
      });
    };
    websocketClient.onAnyTopic(handle);
    registerReactionHandlers();
    registerForumHandlers();
    return () => {
      websocketClient.offAnyTopic(handle);
    };
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch(`${SERVER_URL}/auth/status`, {
        credentials: "include",
      });

      const data = await response.json();

      if (data.isAuthenticated) {
        useStore.getState().setAuth({
          isAuthenticated: true,
          user: data.user || null,
          player: data.player || null,
          // Non-authoritative developer-tier hint — drives only the CMS
          // launcher visibility; the REST CMS gates are the authority.
          isDeveloper: data.isDeveloper === true,
        });
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
    }
  };

  const sendCommand = (text: string) => {
    if (!websocketClient.isConnected()) {
      console.warn("Cannot send command: not connected");
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

    // Verb-driven navigation: `forum` / `forum <board>` flips the cockpit
    // to the forum view and sets the nav target (CLI ⇄ GUI converge). The
    // forum subcommands that aren't board handles are left to the server.
    recognizeForumNavigation(text);

    // Push an echo-pairing snapshot for non-empty commands. The
    // server's empty-command short-circuit doesn't fire an input-
    // echo MessageFrame, so an empty submission must not queue a
    // snapshot — otherwise the FIFO drifts out of alignment with
    // the inbound echoes.
    if (text.trim().length > 0) {
      useStore.getState().pushEchoSnapshot({
        slot: "base",
        sigil: useStore.getState().basePrompt,
      });
    }

    websocketClient.send({
      type: "command",
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
      console.warn("Cannot send prompt response: not connected");
      return;
    }
    const echo = formatResponseEcho(promptId, response);
    if (echo) {
      useStore.getState().appendFrame({
        id: `prompt-echo-${nanoid()}`,
        topic: "system.log.command.info",
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
      console.warn("Cannot cancel prompt: not connected");
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
        setPreviewing(false);
        setInputValue(userTypedRef.current);
        restoreTimerRef.current = null;
      }, 0);
    } else {
      previewActiveRef.current = true;
      setPreviewing(true);
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
    userTypedRef.current = "";

    setInputValue(command);
    sendCommand(command);
    setFlashing(true);
    if (flashTimerRef.current !== null) {
      window.clearTimeout(flashTimerRef.current);
    }
    flashTimerRef.current = window.setTimeout(() => {
      setFlashing(false);
      setInputValue("");
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
      console.info("__injectMessage:", text);
      useStore.getState().appendFrame({
        id: `inject-${nanoid()}`,
        topic: "world.narration.action",
        body: text,
        timestamp: Date.now(),
      });
    };
    w.__pushPrompt = (entry: PromptEntry) => {
      console.info("__pushPrompt:", entry);
      useStore.getState().pushPrompt(entry);
    };
    w.__popPrompt = (promptId: string) => {
      console.info("__popPrompt:", promptId);
      useStore.getState().dismissPrompt(promptId);
    };
    w.__validateFail = (promptId: string, message: string | null) => {
      console.info("__validateFail:", promptId, message);
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

  // CMS surface takeover (`?surface=cms`). Its own tab, full-screen,
  // bypassing the cockpit and the connection-phase switch entirely — no
  // WebSocket, REST-only. Show the start screen until the shared session
  // is confirmed (the CMS needs the cookie + the developer flag); once
  // authenticated, render the CMS shell.
  if (IS_CMS_SURFACE) {
    if (!auth.isAuthenticated) return <StartScreen />;
    return <CmsSurface />;
  }

  // Mutually-exclusive top-level screen, switched on the connection
  // phase. `unauthenticated` → login takeover; `character-select` →
  // the roster; `char-gen` → the dedicated creation stage;
  // `in-world` → the cockpit. The phase is driven by auth + the
  // char-gen wire frames in the store (see store/index.ts).
  switch (connectionPhase) {
    case "unauthenticated":
      return <StartScreen />;

    case "connecting":
      return <Splash>Connecting…</Splash>;

    case "character-select":
      return <CharacterSelect onSendCommand={sendCommand} />;

    case "char-gen":
      return (
        <CharGenStage
          onSendCommand={sendCommand}
          frames={visibleFrames}
          baseValue={inputValue}
          onBaseChange={handleInputChange}
          onSendPromptResponse={sendPromptResponse}
          onCancelPrompt={cancelPrompt}
          flashing={flashing}
          onCommandClick={handleCommandClick}
          onCommandPreview={handleCommandPreview}
        />
      );

    case "in-world":
    default:
      // Show game UI when authenticated and the avatar is in-world.
      return (
        <AppContainer>
          <Frame />
          <ReconnectBanner />
          <Cockpit>
            <LeftColumn>
              {/* Primary-view switch — Terminal | Forum (not a phase). */}
              <ViewSwitch>
                <ViewTab
                  $active={mainView === "terminal"}
                  onClick={() => setMainView("terminal")}
                >
                  Terminal
                </ViewTab>
                <ViewTab
                  $active={mainView === "forum"}
                  onClick={() => setMainView("forum")}
                >
                  Forum
                </ViewTab>
              </ViewSwitch>
              {mainView === "terminal" ? (
                <>
                  <TabStrip onToggleDrawer={() => setDrawerOpen((v) => !v)} />
                  <Terminal
                    frames={visibleFrames}
                    onCommandClick={handleCommandClick}
                    onCommandPreview={handleCommandPreview}
                  />
                  {drawerOpen && (
                    <FilterDrawer onClose={() => setDrawerOpen(false)} />
                  )}
                </>
              ) : (
                <ForumView
                  onSendCommand={sendCommand}
                  onCommandPreview={handleCommandPreview}
                />
              )}
              {/* Frame + CommandBar persist across both views. */}
              <CommandBar
                baseValue={inputValue}
                onBaseChange={handleInputChange}
                onSendCommand={sendCommand}
                onSendPromptResponse={sendPromptResponse}
                onCancelPrompt={cancelPrompt}
                flashing={flashing}
                previewing={previewing}
              />
            </LeftColumn>
            {/* View-sensitive right column. */}
            {mainView === "terminal" ? (
              <InspectionPane
                onSendCommand={sendCommand}
                onCommandPreview={handleCommandPreview}
              />
            ) : (
              <ForumChatSidecar />
            )}
          </Cockpit>
          {/* Live-scene peek so forum-view players keep live awareness. */}
          {mainView === "forum" && scenePeek && (
            <ScenePeek>{scenePeek}</ScenePeek>
          )}
        </AppContainer>
      );
  }
}

export default App;
