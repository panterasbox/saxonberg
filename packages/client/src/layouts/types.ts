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
 * click handlers, and the base-input state (controlled by `App` because
 * it doubles as the hover-preview channel). Each layout fans these out
 * to its terminals, command bar(s), and side panes.
 */

import type React from "react";
import type { Frame as ConsoleFrame } from "../store/index";

export interface LayoutProps {
  /** The tab-filtered frame buffer the layout's terminal(s) render. */
  frames: ConsoleFrame[];
  /** Send a raw command over the bus. */
  onSendCommand: (text: string) => void;
  /** Send a response to an active server-side prompt. */
  onSendPromptResponse: (promptId: string, response: string) => void;
  /** Cancel a pending prompt. */
  onCancelPrompt: (promptId: string) => void;
  /** Click-to-send an affordance's command (command-bus primacy). */
  onCommandClick: (command: string) => void;
  /** Hover-preview an affordance's command (`null` = stop previewing). */
  onCommandPreview: (command: string | null) => void;
  /** The base-slot input draft (controlled by App; also the preview channel). */
  baseValue: string;
  /** Mirror a base-input keystroke back to App. */
  onBaseChange: (value: string) => void;
  /** Post-click flash signal. */
  flashing: boolean;
  /** True while an affordance command is previewed in the bar. */
  previewing: boolean;
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
