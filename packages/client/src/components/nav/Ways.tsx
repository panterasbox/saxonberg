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
  grid-template-columns: repeat(3, 2rem) 0.4rem 2rem;
  grid-template-rows: repeat(3, 1.7rem);
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
  const byDir = new Map(props.ways.map((w) => [longDirection(w.direction), w]));
  const named = props.ways.filter(
    (w) => !(ROSE_DIRECTIONS as readonly string[]).includes(longDirection(w.direction)),
  );
  const [focus, setFocus] = React.useState<NavWay | null>(null);

  const arm = (dir: string, label: string, gridArea?: string): React.ReactElement => {
    const way = byDir.get(dir);
    if (!way) {
      return (
        <Tip key={dir} tip={{ header: { name: dir, kindWord: "way" }, prose: "No way you know of." }}>
          <ArmButton
            type="button"
            $color={tokens.color.fgMuted}
            $dim
            aria-disabled="true"
            data-testid={`nav-arm-${dir}`}
            data-state="none"
            style={gridArea ? { gridArea } : undefined}
            onClick={(e) => e.preventDefault()}
          >
            <Icon name={`dir.${dir}`} label={dir} size={12} decorative />
          </ArmButton>
        </Tip>
      );
    }
    return (
      <WayEntry
        key={dir}
        way={way}
        label={label}
        gridArea={gridArea}
        {...props}
        onFocusWay={setFocus}
      />
    );
  };

  void focus;
  return (
    <Root data-testid="nav-ways">
      <Rose data-testid="nav-rose">
        {arm("northwest", SHORT.northwest!, "1 / 1")}
        {arm("north", SHORT.north!, "1 / 2")}
        {arm("northeast", SHORT.northeast!, "1 / 3")}
        {arm("west", SHORT.west!, "2 / 1")}
        <You style={{ gridArea: "2 / 2" }}>you</You>
        {arm("east", SHORT.east!, "2 / 3")}
        {arm("southwest", SHORT.southwest!, "3 / 1")}
        {arm("south", SHORT.south!, "3 / 2")}
        {arm("southeast", SHORT.southeast!, "3 / 3")}
        {arm("up", SHORT.up!, "1 / 5")}
        {arm("down", SHORT.down!, "3 / 5")}
      </Rose>
      {named.length > 0 ? (
        <Named data-testid="nav-named">
          {named.map((w) => (
            <WayEntry key={w.direction} way={w} label={w.direction} {...props} onFocusWay={setFocus} row />
          ))}
        </Named>
      ) : null}
      {props.ways.length === 0 ? (
        <span style={{ color: tokens.color.fgMuted, fontStyle: "italic" }}>No way out that you can see.</span>
      ) : null}
    </Root>
  );
}

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
        <Icon name={bearing} label={way.direction} size={13} decorative />
        {gridArea ? null : <span style={row ? { minWidth: "5.5em", textAlign: "left" } : undefined}>{label}</span>}
        {row ? <Dest>{leadsTo?.(way) ?? ""}</Dest> : null}
        {glyph ? <Icon name={glyph} label={STATE_WORDS[look]} size={11} decorative /> : null}
        {way.crossesZone ? <Icon name="way.leaves" label="it leaves this zone" size={11} decorative data={{ testid: "nav-leaves-marker" }} /> : null}
      </ArmButton>
    </Tip>
  );
}
