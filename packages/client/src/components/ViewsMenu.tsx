/**
 * ViewsMenu — the always-on cockpit-view switcher.
 *
 * A small "Views" dropdown in the fixed chrome. Per the click model it
 * is pure command-bus sugar: hovering an item previews the command in
 * the ghost line, clicking sends it. The server is authoritative — the
 * menu never sets anything locally; it reads `cockpit.layout` to mark
 * the active item, and the switch lands via the `client-state-update`
 * the verb pushes back.
 *
 * ⚠ Each item sends `cockpit mode <mode> <arrangement>` — ONE command,
 * because the cockpit now has two axes and a menu item means a point on
 * both. Sending two commands per click would break the rule that every
 * clickable previews exactly what it sends.
 *
 * ⚠ The items are still keyed by legacy `LayoutName` because the frame
 * this menu drives still swaps off `cockpit.layout`. That key is a
 * compatibility projection of (mode, arrangement) and dies with the
 * client overhaul, at which point this menu should offer the modes
 * directly and let the arrangement list follow the chosen mode.
 */

import React, { useState } from "react";
import styled from "styled-components";
import {
  LAYOUT_NAMES,
  LEGACY_LAYOUT_MIGRATION,
  type LayoutName,
} from "@saxonberg/types";
import { LAYOUT_REGISTRY } from "../layouts";
import { tokens } from "./ui";

const Wrap = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
`;

const MenuButton = styled.button<{ $open: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  background: ${(p) =>
    p.$open ? tokens.color.surfaceMuted : "transparent"};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.sm};
  color: ${tokens.color.fgEmphasis};
  cursor: pointer;
  padding: 0.15rem 0.6rem;
  font: inherit;
  font-size: ${tokens.font.small};

  &:hover {
    background: ${tokens.color.surfaceMuted};
  }
`;

/**
 * ⚠ `$inline` drops the absolute positioning and the fixed min-width.
 * A 180px popover anchored inside an already-popped account menu near
 * the right edge of a 320px screen overflows the viewport and scrolls
 * the whole page sideways — which is the exact failure the `＋ widget`
 * menu shipped with, found by driving and invisible to jsdom. Inline,
 * the list is in flow and can only be as wide as its host.
 */
const Menu = styled.ul<{ $inline?: boolean }>`
  list-style: none;
  margin: 0;
  padding: 0;
  position: ${(p) => (p.$inline ? "static" : "absolute")};
  top: 100%;
  left: 0.5rem;
  z-index: 20;
  min-width: ${(p) => (p.$inline ? "0" : "180px")};
  max-width: 100%;
  background: ${(p) =>
    p.$inline ? "transparent" : tokens.color.surfaceSunken};
  border: ${(p) =>
    p.$inline ? "none" : `1px solid ${tokens.color.borderEmphasis}`};
  border-radius: ${tokens.radius.sm};
  box-shadow: ${(p) => (p.$inline ? "none" : `0 2px 8px ${tokens.color.shadow}`)};
`;

const InlineWrap = styled.div`
  position: relative;
  display: block;
`;

const InlineHeading = styled.div`
  font-family: ${tokens.font.engraved};
  font-size: ${tokens.font.label};
  letter-spacing: 0.19em;
  text-transform: uppercase;
  color: ${tokens.color.fgMuted};
  padding: ${tokens.space.xs} ${tokens.space.sm} 0;
`;

const Item = styled.li<{ $active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  /* Wraps rather than overflows when the host is a phone-width menu. */
  flex-wrap: wrap;
  gap: 0 ${tokens.space.sm};
  padding: 0.35rem 0.7rem;
  cursor: pointer;
  color: ${(p) => (p.$active ? tokens.color.accent : tokens.color.fg)};
  border-left: 2px solid
    ${(p) => (p.$active ? tokens.color.accent : "transparent")};
  font-size: ${tokens.font.small};

  &:hover {
    background: ${tokens.color.surfaceMuted};
  }
`;

const ItemVerb = styled.span`
  color: ${tokens.color.fgMuted};
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.micro};
`;

/**
 * Display label for a layout name — the registry's label when the layout
 * is built, else a title-cased fallback so a not-yet-registered name
 * still reads sensibly in the menu.
 */
function labelFor(name: LayoutName): string {
  const def = LAYOUT_REGISTRY[name];
  if (def) return def.label;
  return name
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

interface ViewsMenuProps {
  /** The active layout (from `cockpit.layout`), to mark the current item. */
  current: LayoutName;
  /** Click-to-send a command (command-bus primacy). */
  onCommandClick: (command: string) => void;
  /** Hover-preview a command in the ghost line (`null` = stop). */
  onCommandPreview: (command: string | null) => void;
  /**
   * Render the list expanded in flow, with no trigger of its own —
   * for the mobile account dropdown, which is already an open menu.
   *
   * ⭐ A variant rather than a second component: the items, the labels
   * and above all the **command string** are built in exactly one
   * place, so the two form factors cannot drift into sending different
   * commands for the same menu entry. That is the same reason
   * `pinCommand` is a function and not two literals.
   */
  inline?: boolean;
}

export function ViewsMenu({
  current,
  onCommandClick,
  onCommandPreview,
  inline = false,
}: ViewsMenuProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const expanded = inline || open;

  const items = (
    <Menu data-testid="views-menu" $inline={inline}>
      {LAYOUT_NAMES.map((name) => {
        const { mode, arrangement } = LEGACY_LAYOUT_MIGRATION[name];
        const cmd = `cockpit mode ${mode} ${arrangement}`;
        return (
          <Item
            key={name}
            data-testid={`views-item-${name}`}
            $active={name === current}
            onMouseEnter={() => onCommandPreview(cmd)}
            onMouseLeave={() => onCommandPreview(null)}
            onClick={() => {
              onCommandClick(cmd);
              setOpen(false);
            }}
          >
            <span>{labelFor(name)}</span>
            <ItemVerb>{cmd}</ItemVerb>
          </Item>
        );
      })}
    </Menu>
  );

  if (inline) {
    return (
      <InlineWrap>
        <InlineHeading>Views</InlineHeading>
        {items}
      </InlineWrap>
    );
  }

  return (
    <Wrap
      onMouseLeave={() => {
        onCommandPreview(null);
      }}
    >
      <MenuButton
        $open={open}
        onClick={() => setOpen((v) => !v)}
        aria-label="Open the Views menu"
      >
        <span>Views</span>
        <span>{open ? "▴" : "▾"}</span>
      </MenuButton>
      {expanded ? items : null}
    </Wrap>
  );
}
