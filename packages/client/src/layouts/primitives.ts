/**
 * Shared layout primitives — the styled containers reused across cockpit
 * layouts so the composition grammar (fixed-chrome / fluid-content,
 * never-blind) is expressed once, not re-derived per layout.
 *
 *   - `Cockpit`    — the fluid content row beneath the always-on chrome.
 *   - `LeftColumn` — the primary terminal + command-bar column.
 *   - `SideColumn` — the fixed-width side rail (chat / glance terminal).
 */

import styled from "styled-components";
import { tokens } from "../components/ui";

/**
 * The fluid content area of a layout — sits between the always-on chrome
 * (Frame header, Views menu) and fills the remaining height. Lays its
 * children out as a horizontal split (primary column + side rail).
 */
export const Cockpit = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;
`;

/**
 * The primary column: a terminal's scrollback + its command bar, stacked.
 * `min-width: 0` lets it shrink so a side rail can claim its share.
 */
export const LeftColumn = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
`;

/**
 * The fixed-width side rail — the complement to `LeftColumn`'s fluid
 * primary. One tokenized width (`tokens.rail`) shared by every layout
 * that carries a rail (livestream chat, builder glance), with a `$wide`
 * variant for the CMS/builder's roomier explorer + editor. Fixed rem on
 * purpose (a percentage rail breaks at the extremes).
 */
export const SideColumn = styled.div<{ $wide?: boolean }>`
  display: flex;
  flex-direction: column;
  flex: none;
  width: ${(p) => (p.$wide ? tokens.rail.wideWidth : tokens.rail.width)};
  min-width: ${(p) =>
    p.$wide ? tokens.rail.wideMinWidth : tokens.rail.minWidth};
  border-left: 1px solid ${tokens.color.border};
`;

export { tokens };
