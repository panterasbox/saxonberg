/**
 * App - Main application component
 *
 * Handles:
 * - Authentication flow
 * - WebSocket connection
 * - Terminal UI for game interaction
 */

import React, { useEffect, useRef } from "react";
import { nanoid } from "nanoid";
import styled from "styled-components";
import {
  useStore,
  type PromptEntry,
  type Frame as ConsoleFrame,
} from "./store/index";
import { registerReactionHandlers } from "./store/reactionActions";
import { registerForumHandlers } from "./store/forumActions";
import { SERVER_URL, WS_URL } from "./config";
import { websocketClient } from "./services/websocket";
import { Frame } from "./components/frame/Frame";
import { MobileFrame } from "./components/frame/MobileFrame";
import { CommandSheet } from "./components/frame/CommandSheet";
import { ReconnectBanner } from "./components/frame/ReconnectBanner";
import { SocialNotificationsPanel } from "./components/settings/SocialNotificationsPanel";
import { StartScreen } from "./components/StartScreen";
import { CharacterSelect } from "./components/CharacterSelect";
import { CharGenStage } from "./components/CharGenStage";
import { StatusBar } from "./components/frame/StatusBar";
import { SettingsPanel } from "./components/settings/SettingsPanel";
import { useCardFeed } from "./components/cards/useCardFeed";
import type { LayoutProps } from "./layouts";
import { resolveMode } from "./layouts/modes";
import { useGround } from "./lib/style/useGround";
import { useIsCompact } from "./lib/style/useIsCompact";
import { tokens } from "./components/ui";
import { facetFilterPasses } from "./components/FacetFilterPanel";
import { ALL_VIEW } from "@saxonberg/types";
import type {
  ConsoleTab,
  LayoutName,
  CockpitMode,
  RelayMessagePayload,
} from "@saxonberg/types";

/** Relay-chat topics that carry a `RelayMessagePayload` (all transports). */
const RELAY_TOPICS = new Set([
  "speech.relay",
  "speech.relay",
  "speech.relay",
]);

/**
 * Extract the structured relay-provenance fields from a relay-chat payload
 * at ingest. Honest-to-origin: `speaker` is the default shown name (the
 * external handle, or the local player's name on an `egress` mirror);
 * `persona` is the linked MUD identity, revealed on hover when the sender
 * is a linked player (Twitch only this cycle).
 */
function relayFrameFields(payload: unknown): ConsoleFrame["relay"] {
  const p = payload as RelayMessagePayload | undefined;
  if (!p || !p.speaker) return undefined;
  const sp = p.speaker;
  let speaker: string;
  let persona: string | undefined;
  if (sp.kind === "in-game") {
    speaker = sp.ref.displayName ?? "someone";
  } else if (sp.kind === "external-linked") {
    speaker = sp.externalName;
    persona = sp.ref.displayName;
  } else {
    speaker = sp.externalName;
  }
  return {
    service: p.service,
    channelHandle: p.channelHandle,
    speaker,
    text: p.text,
    ...(persona ? { persona } : {}),
    ...(p.egress ? { egress: true } : {}),
  };
}

/**
 * ⚠⚠ **`$compact` clamps the shell to the viewport, and it is the
 * precondition for every fixed-position chrome surface working at
 * all.**
 *
 * On a real phone (not merely a narrow desktop window) a document that
 * overflows horizontally makes Chrome widen the **initial containing
 * block** — and the ICB is what `position: fixed` resolves against. The
 * in-world layout puts a fixed `22rem` rail beside the terminal, so the
 * document is ~698px wide at a 390px viewport; measured consequence:
 * the shelf screen, declared `position: fixed; inset: 0`, computed to
 * **728px**, and its close button and every row's actions sat off the
 * right edge, unreachable. The command sheet had the same fate.
 *
 * ⚠ The unit suite cannot see this (jsdom has no layout) and neither
 * could the e2e suite as written: Playwright's plain `viewport` is a
 * DESKTOP context, where the ICB stays put. It needs `isMobile`, which
 * is what a real device emulation turns on.
 *
 * So the shell refuses to be wider than the screen, and `ContentRow`
 * takes the overflow into its own scroller — the rail stays reachable
 * by scrolling the CONTENT, which is where a phone user would look for
 * it, instead of by scrolling the whole page, which broke the chrome.
 *
 * ⚠ Compact only. Above the breakpoint nothing changes; a page-level
 * horizontal scroll is legitimate for the builder/CMS layouts.
 */
const AppContainer = styled.div<{ $compact: boolean }>`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: ${tokens.color.surfaceSunken};
  ${(p) =>
    p.$compact
      ? `
  max-width: 100vw;
  overflow-x: hidden;
  `
      : ""}
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
 * The fluid content row: the active layout fills it, and a summoned card
 * (settings, future detail) docks beside it as a non-modal side panel —
 * the terminal stays visible (never-blind, no-modal).
 */
const ContentRow = styled.div<{ $compact?: boolean }>`
  display: flex;
  flex: 1;
  min-height: 0;
  /*
   * ⚠ The overflow the shell above refuses has to go somewhere, and
   * here is the right somewhere: the rail scrolls WITH the content
   * rather than with the page. Clipping it instead would have made a
   * shipped card unreachable, which is a worse answer than the bug.
   * Redesigning the play surface for a phone is Wave 4's.
   */
  ${(p) => (p.$compact ? "overflow-x: auto;" : "")}
`;

/*
 * ⭐⭐ **The paint/clear policy is gone, and so is the parser that fed
 * it.**
 *
 * The client used to peek at an outgoing command's leading verb —
 * `look` paints the card body, `focus` clears it — because there was
 * ONE card slot and it had to be told what the player was doing.
 * Cards are minted per command now, so `look` does not paint a slot: it
 * opens a card, and the lesson the policy taught (*focus is a pointer;
 * look is the verb that paints*) is taught by that instead, which is
 * stronger. With the focus signal retired there is no cleared body to
 * paint.
 */

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

/**
 * App component.
 */
function App() {
  // ⚠ First line, above the phase switch. The switch early-returns per
  // phase, so a ground applied inside one case would leave the other
  // four (start screen, splash, character select, char-gen) painting on
  // whatever `main.tsx` pre-applied and never repainting on a theme
  // change. The chrome resolves its theme through the same `pickTheme`
  // as the transcript's `useStylesheet` — see `lib/style/useGround`.
  useGround();

  /*
   * ⚠ Above the phase switch for the same reason `useGround` is: the
   * switch early-returns per phase, and a hook called inside one branch
   * would break the rules-of-hooks contract the moment the phase moved.
   *
   * ⭐ It gates the IN-WORLD chrome only. Char-gen keeps its own
   * `StatusBar` and its own layout untouched — mobile intake is its own
   * wave with its own art, and reflowing it here would be building half
   * of that wave blind. So "no status bar below the breakpoint" is a
   * claim about the in-world phase, which is where the command sheet
   * exists to replace what hover used to do.
   */
  const isCompact = useIsCompact();

  const auth = useStore((state) => state.auth);
  const connection = useStore((state) => state.connection);
  const connectionPhase = useStore((state) => state.connectionPhase);
  // The Social / Notifications settings card (master's notify surface),
  // opened from the AccountMenu. Independent of the summoned-card tier.
  const socialPanelOpen = useStore((state) => state.socialPanelOpen);
  const setSocialPanelOpen = useStore((state) => state.setSocialPanelOpen);
  const frames = useStore((state) => state.frames);
  const clientState = useStore((state) => state.clientState);
  const reactionPrefs = useStore((state) => state.reactionPrefs);
  /*
   * ⭐⭐ The frame renders from the TWO cockpit axes — `cockpit.mode` and
   * the per-mode arrangement — not from the single `cockpit.layout` key.
   * That key is a compatibility projection the S3 build wrote in order
   * for it to die with the old client; this is that death.
   *
   * `cockpit.layout` is still read, but only where the server itself
   * reads it: as the migration cue when `cockpit.mode` has never been
   * set. See `resolveMode`.
   */
  const resolved = resolveMode(
    clientState["cockpit.mode"] as CockpitMode | null | undefined,
    clientState["cockpit.arrangements"] as
      | Record<string, string>
      | undefined,
    clientState["cockpit.layout"] as LayoutName | null | undefined,
  );
  /*
   * ⭐⭐ **The card wiring lives HERE, above the mode registry.**
   *
   * Third occurrence of the wiring-at-the-layout bug, and this is the
   * position that has no fourth. It sat in `CardFeed` (the desktop
   * right column), so a phone got a card store nothing ever wrote to;
   * it moved to `WorldLayout`, which fixed the phone and left `build`,
   * `chat` and `watch` — different layout components entirely — with
   * the same defect. Wave 7 puts the authoring cards in `build`, so
   * hoisting is not optional.
   *
   * ⚠ Unconditional, and above the phase switch: React hooks are, and
   * the alternative (mounting it inside the `in-world` branch) is
   * exactly the conditional wiring this note exists to end.
   */
  useCardFeed();
  const summonedPanel = useStore((state) => state.summonedPanel);
  const openPanel = useStore((state) => state.openPanel);
  const closePanel = useStore((state) => state.closePanel);
  const activeTabName =
    (clientState["console.activeTab"] as string | undefined) ?? ALL_VIEW;
  const tabs = (clientState["console.tabs"] as ConsoleTab[] | undefined) ?? [];
  /*
   * ⚠⚠ **`All` resolves to NOTHING, structurally.**
   *
   * It is the absence of a filter, so it is not looked up in
   * `console.tabs` at all — and deliberately not, rather than merely
   * not being there: a player who edited `All` before it was locked
   * still has a stored row with facets on it, and honouring that would
   * make the locked view quietly filter. The lock has to hold against
   * state that predates it.
   */
  const activeTab =
    activeTabName === ALL_VIEW
      ? undefined
      : tabs.find((t) => t.name === activeTabName);
  const mutedSet = new Set(activeTab?.muted ?? []);
  /*
   * ⭐⭐ **Three filters, in the order they answer three different
   * questions.**
   *
   *  1. **Which FEED** — where the SERVER routed the frame, read off
   *     `meta.feeds`. Routed feeds are independent of each other, so
   *     this is a switch rather than a narrowing. Nothing here
   *     evaluates a routing rule: the decision is already made and
   *     stamped, and a second evaluator would disagree the first time
   *     one of them changed.
   *  2. **The standing FACET predicate** — the active tab's saved
   *     filter set. "Quiet" is one rule over `weight`, not a list of
   *     sixty topic paths that drifts every time a topic is added.
   *  3. **Muted topics** — the tree half. Facets cannot express a
   *     subtree ("everything about the air in here"), which is a
   *     prefix operation, so both halves stay.
   */
  const getTopicDescriptor = useStore((state) => state.getTopicDescriptor);
  const facetFilter = activeTab?.facets;
  const visibleFrames = frames.filter((f) => {
    /*
     * ⭐ No feed check. Every tab is a VIEW over the whole buffer now —
     * a frame is not placed anywhere at delivery, so there is nothing
     * to match against. See `WorldLayout`'s strip note for why the
     * destination model was retired.
     */
    const d = getTopicDescriptor(f.topic);
    if (
      !facetFilterPasses(facetFilter, {
        address: d.address,
        actor: d.actor,
        weight: d.weight,
        topic: f.topic,
      })
    ) {
      return false;
    }
    if (mutedSet.has(f.topic)) return false;
    // `social.react.alwaysAggregate` — hide reaction prose lines (frames
    // carrying `inReactionTo`); the chip on the target message carries
    // the aggregate instead.
    if (reactionPrefs.alwaysAggregate && f.inReactionTo !== undefined) {
      return false;
    }
    return true;
  });
  // Hover preview lives in the ghost command line (store-backed), not in
  // a command bar — under per-bar mode a moded bar would prepend its
  // prefix, so the preview would lie about what sends. The restore on
  // mouse-leave is deferred by one tick so a leave → enter sweep across
  // adjacent affordances doesn't flicker the line empty.
  const restoreTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (restoreTimerRef.current !== null)
        window.clearTimeout(restoreTimerRef.current);
    };
  }, []);

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
    // Connect to WebSocket when authenticated. The builder layout (the
    // re-homed CMS) now runs inside this live session — there is no
    // longer a REST-only takeover tab to special-case.
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
    // Echo frames (`shell.diagnostic`) pair against the
    // FIFO echo-snapshot queue at arrival time so the rendered line
    // carries the base-prompt sigil that was active when the player
    // pressed Enter, regardless of where focus has moved since. The
    // sigil is kept on the Frame alongside the body; the Terminal
    // concatenates at render time.
    const handle = (frame: import("@saxonberg/types").MessageFrame) => {
      if (!frame.body) return;
      const isEcho =
        frame.topic === "shell.diagnostic" ||
        frame.topic === "shell.diagnostic";
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
        // ⭐ Which feeds this frame belongs in — decided SERVER-side
        // against the player's routing table and stamped on the
        // envelope, so the client renders the answer instead of
        // re-deriving the rules.
        ...(frame.meta?.feeds !== undefined
          ? { feeds: frame.meta.feeds }
          : {}),
        ...(typeof (frame.payload as { channelName?: unknown } | undefined)
          ?.channelName === "string"
          ? {
              channelName: (frame.payload as { channelName: string })
                .channelName,
            }
          : {}),
        ...(RELAY_TOPICS.has(frame.topic)
          ? { relay: relayFrameFields(frame.payload) }
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

      // Which providers the server has configured — drives start-screen
      // button enablement (stored regardless of auth state).
      useStore
        .getState()
        .setConfiguredProviders(
          Array.isArray(data.providers) ? data.providers : null,
        );

      // ⚠ Copied across only when the server actually sent them. An
      // absent field must stay absent — the front door renders each of
      // these as a claim, and a defaulted one would be a claim nobody
      // made.
      useStore.getState().setServerFacts({
        ...(typeof data.online === "number" ? { online: data.online } : {}),
        ...(typeof data.resetPolicy === "string" && data.resetPolicy
          ? { resetPolicy: data.resetPolicy }
          : {}),
      });

      if (data.isAuthenticated) {
        useStore.getState().setAuth({
          isAuthenticated: true,
          user: data.user || null,
          player: data.player || null,
          // Non-authoritative wizard-tier hint — drives only the CMS
          // launcher visibility; the REST CMS gates are the authority.
          isWizard: data.isWizard === true,
        });
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
    }
  };

  // Send a real command over the bus. `barId` is the originating command
  // bar (so the server applies that bar's input mode); affordance clicks
  // omit it to dispatch un-moded (preview equals send). The text reaches
  // the server verbatim — the client never wraps it (the interpreter
  // prepends the mode prefix server-side).
  const sendCommand = (text: string, barId?: string) => {
    if (!websocketClient.isConnected()) {
      console.warn("Cannot send command: not connected");
      return;
    }

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

    websocketClient.sendCommand(text, barId !== undefined ? { barId } : undefined);
  };

  /**
   * Send a response to an active server-side prompt. Emits the
   * resolution echo line locally at send time — prompt responses
   * don't ride the `shell.diagnostic` echo channel, so the
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
        topic: "shell.diagnostic",
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
   * Hover preview → the ghost command line (store-backed). `null` means
   * "stop previewing" (mouseleave); a string shows the exact command a
   * hovered affordance would run. The restore is deferred by one tick so
   * a leave → enter sweep across adjacent affordances doesn't flicker the
   * line empty mid-transition.
   */
  const handleCommandPreview = (command: string | null) => {
    if (restoreTimerRef.current !== null) {
      window.clearTimeout(restoreTimerRef.current);
      restoreTimerRef.current = null;
    }
    if (command === null) {
      restoreTimerRef.current = window.setTimeout(() => {
        useStore.getState().setGhostPreview(null);
        restoreTimerRef.current = null;
      }, 0);
    } else {
      useStore.getState().setGhostPreview(command);
    }
  };

  /**
   * Click-to-send: command-bus primacy, **un-moded**. Affordance clicks
   * carry no `barId`, so the interpreter never prepends a bar's mode —
   * preview equals send. Flash the ghost line so the just-sent command
   * stays briefly visible.
   *
   * ⭐⭐ **Below the breakpoint this opens the sheet instead of
   * sending**, and doing it HERE is the whole design. Every affordance
   * in the tree — transcript tags, shelf menu entries, the Views menu,
   * the pull-down, future cards — routes through this one handler. So
   * the phone's confirm step is **one interception point for the entire
   * app** rather than a `isCompact` prop threaded into every renderer.
   * `MmlRenderer`, `EntityName` and `Shelf` need no changes at all, and
   * an affordance added next year gets the behaviour for free.
   */
  const handleCommandClick = (command: string) => {
    if (isCompact) {
      useStore.getState().openCommandSheet(command);
      return;
    }
    sendDirect(command);
  };

  /**
   * The send path both the desktop click and the sheet's confirm take —
   * one function, so "what the sheet showed" and "what got sent" cannot
   * become two strings that agree today.
   */
  const sendDirect = (command: string) => {
    sendCommand(command);
    useStore.getState().flashGhost(`› ${command}`);
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
        topic: "act.deed",
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
          onSendPromptResponse={sendPromptResponse}
          onCancelPrompt={cancelPrompt}
          onCommandClick={handleCommandClick}
          onCommandPreview={handleCommandPreview}
        />
      );

    case "in-world":
    default: {
      // Show game UI when authenticated and the avatar is in-world. The
      // active layout is server-authoritative (`cockpit.layout`); the
      // registry resolves it to a component, falling back to `world`.
      const layoutProps: LayoutProps = {
        frames: visibleFrames,
        onSendCommand: sendCommand,
        onSendPromptResponse: sendPromptResponse,
        onCancelPrompt: cancelPrompt,
        onCommandClick: handleCommandClick,
        onCommandPreview: handleCommandPreview,
        onCommandSend: sendDirect,
      };
      const ActiveLayout = resolved.def.Component;
      return (
        <AppContainer $compact={isCompact}>
          {/* Always-on chrome (the matte): bus-health + identity + the
              Views layout switcher + settings, same place every layout —
              then the reconnect banner.

              ⭐ A JS switch, not a media query hiding one of two: the
              mobile bar is a different COMPOSITION (two rows, a
              pull-down, no status bar), and rendering both would put
              two `StatusBar`s in the tree and make "exactly one renders
              above the breakpoint" unassertable. */}
          {isCompact ? (
            <MobileFrame
              mode={resolved.mode}
              arrangement={resolved.arrangement}
              onCommandClick={handleCommandClick}
              onCommandPreview={handleCommandPreview}
              settingsActive={summonedPanel === "settings"}
              onToggleSettings={() =>
                summonedPanel === "settings" ? closePanel() : openPanel("settings")
              }
            />
          ) : (
            <Frame
              mode={resolved.mode}
              arrangement={resolved.arrangement}
              onCommandClick={handleCommandClick}
              onCommandPreview={handleCommandPreview}
              settingsActive={summonedPanel === "settings"}
              onToggleSettings={() =>
                summonedPanel === "settings" ? closePanel() : openPanel("settings")
              }
            />
          )}
          <ReconnectBanner />
          {/* The active layout fills the fluid content area; a summoned
              card (settings) docks beside it — non-modal, terminal stays. */}
          <ContentRow $compact={isCompact}>
            <ActiveLayout {...layoutProps} />
            {summonedPanel === "settings" ? (
              <SettingsPanel onSendCommand={sendCommand} onClose={closePanel} />
            ) : null}
          </ContentRow>
          {/* The Social / Notifications card (master's notify surface),
              opened from the AccountMenu — independent of the summoned
              settings card above. */}
          {socialPanelOpen && (
            <SocialNotificationsPanel
              onClose={() => setSocialPanelOpen(false)}
              onSendCommand={sendCommand}
              onCommandPreview={handleCommandPreview}
              onCommandClick={handleCommandClick}
            />
          )}
          {/* The status bar — the one preview surface. Affordance
              previews + post-action flash, browser-style along the
              bottom of the window.

              ⚠ Absent below the breakpoint, and not merely hidden: a
              phone has no hover, so it would have nothing to report,
              and it would cost a row the feed needs. What replaces it
              is the command sheet — the tap that names its command
              before it sends. */}
          {isCompact ? null : <StatusBar />}
          {/* The command sheet — the phone's replacement for hover.
              Rendered unconditionally: it paints only when the store
              holds a command, and only the compact branch of
              `handleCommandClick` ever puts one there. */}
          <CommandSheet onSend={sendDirect} />
        </AppContainer>
      );
    }
  }
}

export default App;
