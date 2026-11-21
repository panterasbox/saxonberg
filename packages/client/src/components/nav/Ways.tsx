/**
 * Ways — the ways from here (navigation card D6): a rose of ten arms (the
 * eight compass points, up and down — always all ten) and a list of every
 * way with a name rather than a bearing, by its own word.
 *
 * ⭐ Every state is the server's. The client has no rule of its own: a way
 * is a window, locked, shut or open because the ways section says so, and
 * it is *not for you as you stand* (amber) because `take` — the check `go`
 * runs, asked without moving — said no. A click on any arm but a window
 * sends `go <direction>`: what trying would do, and the tooltip says what
 * that is.
 *
 * A way with a door gets the door's menu (right-click, a mouse hold; the
 * touch sheet's *actions* button): open, unlock, look through are the
 * menu's — a tooltip carries no buttons.
 */

import React from "react";
import styled from "styled-components";
import type { NavWay, TooltipDoc } from "@saxonberg/types";
import { tokens } from "../ui";
import { Icon } from "../ui/icons/Icon";
import { Tip } from "../tooltip/Tip";
import { useRadialGestures } from "../ui/useRadialGestures";
import { ROSE_DIRECTIONS, longDirection } from "../../store/navSelectors";

/** What an arm shows, first match wins (D6). */
export type WayLook = "window" | "locked" | "shut" | "mode" | "refuses" | "unseen" | "open";

export function wayLook(way: NavWay): WayLook {
  if (way.state === "window") return "window";
  if (way.state === "locked") return "locked";
  if (way.state === "shut") return "shut";
  if (way.take && !way.take.ok) return way.needs || way.take.works?.mode ? "mode" : "refuses";
  if (way.take?.ok && way.take.unseen) return "unseen";
  return "open";
}

/** The mode a way needs, when it needs one (`climb`). */
export function wayMode(way: NavWay): string | undefined {
  if (way.take && !way.take.ok) return way.take.works?.mode ?? way.needs;
  return way.needs;
}

const LOOK_COLOR: Record<WayLook, string> = {
  window: tokens.color.info,
  locked: tokens.color.danger,
  shut: tokens.color.fgEmphasis,
  mode: tokens.color.warning,
  refuses: tokens.color.warning,
  unseen: tokens.color.fgDim,
  open: tokens.color.accentHover,
};

const STATE_WORDS: Record<WayLook, string> = {
  window: "a window — it shows the far side, and passes no body",
  locked: "locked",
  shut: "shut",
  mode: "not for you as you stand",
  refuses: "not for you as you stand",
  unseen: "open, as far as you know",
  open: "open",
};

const SHORT: Readonly<Record<string, string>> = {
  north: "N", northeast: "NE", east: "E", southeast: "SE",
  south: "S", southwest: "SW", west: "W", northwest: "NW",
  up: "up", down: "down",
};

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.sm};
`;

const Rose = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 2.8rem) 0.5rem 2.8rem;
  grid-template-rows: repeat(3, 2.2rem);
  gap: 3px;
`;

const ArmButton = styled.button<{ $color: string; $dim?: boolean }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.micro};
  border: 1px solid ${(p) => (p.$dim ? tokens.color.borderMuted : p.$color)};
  border-radius: ${tokens.radius.sm};
  background: ${(p) => (p.$dim ? "transparent" : tokens.color.actionBg)};
  color: ${(p) => (p.$dim ? tokens.color.fgMuted : p.$color)};
  opacity: ${(p) => (p.$dim ? 0.45 : 1)};
  cursor: ${(p) => (p.$dim ? "default" : "pointer")};
  padding: 0 4px;
  &:hover:not(:disabled) {
    background: ${tokens.color.actionBgHover};
  }
`;

const You = styled.span`
  display: grid;
  place-items: center;
  font-size: ${tokens.font.label};
  color: ${tokens.color.fgMuted};
`;

const Named = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${tokens.space.xs};
`;

const Preview = styled.div`
  min-height: 2.4em;
  font-size: ${tokens.font.small};
  color: ${tokens.color.fgDim};
  border-top: 1px solid ${tokens.color.borderMuted};
  padding-top: ${tokens.space.xs};
`;

export interface WaysProps {
  ways: readonly NavWay[];
  /** Where a way leads, as your map knows it (D10). */
  leadsTo?: (way: NavWay) => string | undefined;
  tipFor?: (way: NavWay) => TooltipDoc | null;
  onSendCommand: (command: string) => void;
  onCommandPreview?: (command: string | null) => void;
}

export function Ways(props: WaysProps): React.ReactElement {
  // PROTOTYPE: a destination list — one row per way you can see, in
  // compass order then the named ones, each saying where it goes. A
  // newcomer thinks "the bar", not "northeast".
  const order = (w: NavWay): number => {
    const i = (ROSE_DIRECTIONS as readonly string[]).indexOf(longDirection(w.direction));
    return i < 0 ? 100 : i;
  };
  const ways = [...props.ways].sort((a, b) => order(a) - order(b));
  const [focus, setFocus] = React.useState<NavWay | null>(null);
  void focus;
  return (
    <Root data-testid="nav-ways">
      <List data-testid="nav-rose">
        {ways.map((w) => (
          <WayEntry key={w.direction} way={w} label={w.direction} {...props} onFocusWay={setFocus} row />
        ))}
      </List>
      {props.ways.length === 0 ? (
        <span style={{ color: tokens.color.fgMuted, fontStyle: "italic" }}>No way out that you can see.</span>
      ) : null}
    </Root>
  );
}

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const Dest = styled.span`
  flex: 1;
  min-width: 0;
  text-align: left;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: ${tokens.color.fg};
  font-family: ${tokens.font.family};
`;

function WayEntry({
  way,
  label,
  gridArea,
  tipFor,
  onSendCommand,
  onCommandPreview,
  onFocusWay,
  row,
  leadsTo,
}: WaysProps & {
  way: NavWay;
  label: string;
  gridArea?: string | undefined;
  onFocusWay: (w: NavWay | null) => void;
  row?: boolean;
}): React.ReactElement {
  const look = wayLook(way);
  const mode = look === "mode" ? wayMode(way) : undefined;
  const command = `go ${way.direction}`;
  const gestures = useRadialGestures(way.boundary?.stuffId, way.boundary?.name ?? way.direction);
  const glyph =
    look === "locked" ? "way.locked"
    : look === "shut" ? "way.shut"
    : look === "window" ? "way.window"
    : look === "mode" ? `mode.${mode ?? "walk"}`
    : look === "refuses" ? "way.refuses"
    : look === "unseen" ? "way.unseen"
    : null;
  const dir = longDirection(way.direction);
  const bearing = (ROSE_DIRECTIONS as readonly string[]).includes(dir) ? `dir.${dir}` : "dir.named";
  return (
    <Tip tip={tipFor?.(way) ?? null}>
      <ArmButton
        type="button"
        $color={LOOK_COLOR[look]}
        disabled={look === "window"}
        data-testid={`nav-exit-${way.direction}`}
        data-state={look}
        data-way-state={way.state}
        {...(mode ? { "data-mode": mode } : {})}
        {...(way.crossesZone ? { "data-leaves": "true" } : {})}
        {...(way.boundary ? { "data-boundary": "true" } : {})}
        aria-label={command}
        style={gridArea ? { gridArea } : row ? { justifyContent: "flex-start", width: "100%", padding: "3px 6px", gap: 6 } : undefined}
        {...gestures}
        onClick={() => onSendCommand(command)}
        onMouseEnter={() => {
          onCommandPreview?.(command);
          onFocusWay(way);
        }}
        onMouseLeave={() => {
          onCommandPreview?.(null);
          onFocusWay(null);
        }}
        onFocus={() => onFocusWay(way)}
        onBlur={() => onFocusWay(null)}
      >
        {gridArea ? null : <Icon name={bearing} label={way.direction} size={12} decorative />}
        <span style={row ? { minWidth: "5.5em", textAlign: "left" } : undefined}>{label}</span>
        {row ? <Dest>{leadsTo?.(way) ?? "somewhere you have not been"}</Dest> : null}
        {glyph ? <Icon name={glyph} label={STATE_WORDS[look]} size={11} decorative /> : null}
        {/* PROTOTYPE: in the list, "leaves the zone" is engine noise — the destination says where. */}
        {way.crossesZone && !row ? <Icon name="way.leaves" label="it leaves this zone" size={11} decorative data={{ testid: "nav-leaves-marker" }} /> : null}
      </ArmButton>
    </Tip>
  );
}
