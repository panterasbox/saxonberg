/**
 * Layout registry types — the shared contract every cockpit layout is
 * built against.
 *
 * A layout is a whole-cockpit arrangement (world / forum / livestream-
 * viewer / streamer / builder). The active one is the server-
 * authoritative `cockpit.layout` clientState key; `App` reads it and
 * renders `LAYOUT_REGISTRY[layout].Component`, falling back to `world`.
 * Layouts are variations on the one composition grammar (see
 * docs/cockpit-composition.md) — never bespoke screens.
 *
 * `LayoutProps` is the bundle of shared cockpit handles `App` threads to
 * the active layout: the frame buffer, the command-send / preview /
 * click handlers, and the prompt handlers. Each command bar owns its own
 * input draft locally and submits its `barId` (so the server applies
 * that bar's mode); preview/flash live in the ghost command line, not in
 * a bar. Each layout fans these out to its terminals, bar(s), and cards.
 */

import type React from "react";
import type { Frame as ConsoleFrame } from "../store/index";

export interface LayoutProps {
  /** The tab-filtered frame buffer the layout's terminal(s) render. */
  frames: ConsoleFrame[];
  /**
   * Send a raw command over the bus. `barId` is the originating command
   * bar (the server applies that bar's input mode); omit it for un-moded
   * dispatch (affordance clicks).
   */
  onSendCommand: (text: string, barId?: string) => void;
  /** Send a response to an active server-side prompt. */
  onSendPromptResponse: (promptId: string, response: string) => void;
  /** Cancel a pending prompt. */
  onCancelPrompt: (promptId: string) => void;
  /** Click-to-send an affordance's command, un-moded (command-bus primacy). */
  onCommandClick: (command: string) => void;
  /**
   * Send WITHOUT the phone's confirm interception.
   *
   * ⚠ For surfaces that have already named the command they are about
   * to send — the emote sheet shows it verbatim above its own send
   * control. The command sheet's job is to be that naming moment; a
   * surface that already is one does not need it, and routing through it
   * asks the same question twice. See `Terminal.onCommandSend`.
   */
  onCommandSend: (command: string) => void;
  /** Hover-preview an affordance's command in the ghost line (`null` = stop). */
  onCommandPreview: (command: string | null) => void;
}

/**
 * One registry entry — the menu label + the React component that paints
 * the layout. Keyed by `LayoutName` in `LAYOUT_REGISTRY`.
 */
export interface LayoutDef {
  /** Human-legible label for the "Views" menu. */
  label: string;
  /** The cockpit component for this layout. */
  Component: React.FC<LayoutProps>;
}
