/**
 * ViewsMenu — the always-on cockpit-layout switcher.
 *
 * A small "Views" dropdown in the fixed chrome. Per the click model it
 * is pure command-bus sugar: hovering an item previews `layout <name>`
 * in the ghost line, clicking sends it. The server is authoritative —
 * the menu never sets layout locally; it reads the current layout from
 * `cockpit.layout` to mark the active item, and the actual switch lands
 * via the `client-state-update` the `layout` verb pushes back.
 *
 * The menu noun ("Views") and the verb (`layout`) intentionally differ:
 * "Views" is newcomer-legible, `layout` pairs with `style` in the
 * cockpit-config verb family. The first use teaches the verb.
 */

import React, { useState } from "react";
import styled from "styled-components";
import { LAYOUT_NAMES, type LayoutName } from "@saxonberg/types";
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

const Menu = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  position: absolute;
  top: 100%;
  left: 0.5rem;
  z-index: 20;
  min-width: 180px;
  background: ${tokens.color.surfaceSunken};
  border: 1px solid ${tokens.color.borderEmphasis};
  border-radius: ${tokens.radius.sm};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
`;

const Item = styled.li<{ $active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
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
}

export function ViewsMenu({
  current,
  onCommandClick,
  onCommandPreview,
}: ViewsMenuProps): JSX.Element {
  const [open, setOpen] = useState(false);

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
      {open ? (
        <Menu data-testid="views-menu">
          {LAYOUT_NAMES.map((name) => {
            const cmd = `layout ${name}`;
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
      ) : null}
    </Wrap>
  );
}
