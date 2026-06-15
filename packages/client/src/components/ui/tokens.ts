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
  space: {
    xs: "0.15rem",
    sm: "0.25rem",
    md: "0.5rem",
    lg: "0.75rem",
    xl: "1rem",
  },
  font: {
    // `family` is the app-chrome default voice — sans (Source Sans 3).
    // Every chrome component (`tokens.font.family`) reads sans; the
    // command register (CommandBar input/echo, `<pre>`/`<code>`) opts
    // into `mono` explicitly. The three stacks come from the single
    // face-stack source so a swap is one edit in `styles/faces`.
    family: FACE_STACKS.sans,
    sans: FACE_STACKS.sans,
    serif: FACE_STACKS.serif,
    mono: FACE_STACKS.mono,
    body: "13px",
    small: "12px",
    micro: "11px",
    title: "14px",
  },
  radius: {
    sm: "2px",
    md: "4px",
  },
} as const;

export type Tokens = typeof tokens;
