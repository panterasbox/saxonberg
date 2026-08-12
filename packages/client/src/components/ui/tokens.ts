/**
 * Semantic theme tokens consumed by the shared `ui/` components and
 * the inspection pane. Per the message-rendering slate, styling is a
 * client stylesheet mapped from semantic selectors to visual
 * treatments — components reference these tokens by *role*
 * (`surface`, `fg`, `accent`, `border`), not by literal color.
 *
 * The values here are the dark-terminal default theme. A future
 * theme swap (high-contrast, colorblind-safe, light) replaces this
 * file's exports without touching component code. Component code
 * must NEVER hardcode hex literals; if a needed treatment isn't
 * here, add a token rather than inlining.
 */

import { FACE_STACKS } from "../../styles/faces";

export const tokens = {
  color: {
    surface: "#252526",
    surfaceAlt: "#2d2d30",
    surfaceMuted: "#1f1f1f",
    surfaceSunken: "#1e1e1e",
    fg: "#d4d4d4",
    fgMuted: "#888",
    fgEmphasis: "#d7ba7d",
    accent: "#4ec9b0",
    accentHover: "#7fdfc8",
    onAccent: "#11201b",
    primary: "#007acc",
    primaryHover: "#005a9e",
    primaryActive: "#004578",
    border: "#444",
    borderMuted: "#333",
    borderEmphasis: "#555",
    sectionLabel: "#569cd6",
    actionBg: "#3c3c3c",
    actionBgHover: "#4a4a4a",
    // Connection-health signals — narrow, high-meaning state only
    // (reconnecting / dropped). Not for general decoration.
    warning: "#cca700",
    danger: "#f48771",
  },
  // Named social-graph highlight palette. The server emits a token name
  // (never raw hex — see `NotifyRule.PaletteToken`); the client maps it
  // here so a theme swap re-tints every social highlight in one edit.
  // `paletteFor(token)` falls back to `neutral` for an unknown token.
  palette: {
    amber: "#d7ba7d",
    teal: "#4ec9b0",
    rose: "#f48771",
    slate: "#888",
    violet: "#a89bd8",
    emerald: "#6abf69",
    sky: "#569cd6",
    neutral: "#bbb",
  } as Record<string, string>,
  space: {
    xs: "0.15rem",
    sm: "0.25rem",
    md: "0.5rem",
    lg: "0.75rem",
    xl: "1rem",
  },
  font: {
    // ── Faces. `family` is the app-chrome default voice (Public Sans).
    // Every chrome component (`tokens.font.family`) reads it; the command
    // register (CommandBar input/echo, `<pre>`/`<code>`) opts into `mono`
    // explicitly, and the engraved display voice into `engraved`. All
    // four stacks come from the single face-stack source so a swap is one
    // edit in `styles/faces`. `sans`/`serif`/`mono` are the pre-civic
    // alias names, kept so no call site moved.
    //
    // ⚠ The face is `engraved`, not `display` — `display` is the 22px
    // step in the size scale below. DESIGN-SYSTEM names the role
    // "Engraved capitals, display"; the two halves of that phrase are the
    // two keys.
    family: FACE_STACKS.chrome,
    sans: FACE_STACKS.chrome,
    serif: FACE_STACKS.narrative,
    mono: FACE_STACKS.command,
    engraved: FACE_STACKS.display,
    // ── Sizes. The DESIGN-SYSTEM § Scale type ramp: 10px engraved labels
    // · 11.5–12.5px secondary · 13–14px body chrome · 15–17px world prose
    // · 19–26px display.
    label: "10px",
    micro: "11.5px",
    small: "12.5px",
    body: "13px",
    title: "14px",
    prose: "16px",
    display: "22px",
  },
  radius: {
    sm: "2px",
    md: "4px",
  },
  // The side rail — the fixed-width complement to a fluid primary column
  // (chat rail, glance terminal). Fixed rem on purpose: a percentage rail
  // collapses on narrow screens and balloons on ultrawide. `wide` is the
  // CMS/builder variant that needs room for the explorer + editor.
  rail: {
    width: "22rem",
    minWidth: "16rem",
    wideWidth: "24rem",
    wideMinWidth: "18rem",
  },
  // The focal split — the canonical content-vs-content vertical ratio
  // (composition grammar): the focal pane (video / stats) claims the
  // dominant share, the never-blind game terminal keeps the rest.
  ratio: {
    focal: 62,
    focalComplement: 38,
  },
} as const;

export type Tokens = typeof tokens;
