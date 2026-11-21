/**
 * MapArea — the zone section's map, and it works like a map app (owner,
 * review: *"it needs to work like a map app… people have certain
 * expectations"* — D4's three fixed steps replaced): the wheel or a pinch
 * zooms around the pointer, a drag pans, **+ / −** zoom, **⌖** finds you
 * and follows you again, **⤢** fits everything you know. The map follows
 * you as you move until you pan away. The level control shows past one
 * level; the places you know but have not placed are listed; the honest
 * placeholders say why there is nothing to draw.
 *
 * The camera and the level shown are this component's own state: they
 * reset when the zone changes and are not remembered.
 */

import React from "react";
import styled from "styled-components";
import type { NavSections, TooltipDoc, WireRoutePlan } from "@saxonberg/types";
import { useStore } from "../../store/index";
import { zoneView, type ViewEdge, type ViewPlace, type ZoneView } from "../../store/navSelectors";
import { tokens } from "../ui";
import { Tip } from "../tooltip/Tip";
import { controlDoc, levelDoc } from "../doc/docs";
import { ZoneMap, viewBoxFor, type BoundarySide, type LensName } from "./ZoneMap";

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.xs};
`;

const Controls = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${tokens.space.xs};
  align-items: center;
  font-size: ${tokens.font.micro};
`;

const Btn = styled.button<{ $on?: boolean }>`
  font: inherit;
  padding: 1px 6px;
  border-radius: 3px;
  border: 1px solid ${(p) => (p.$on ? tokens.color.fgEmphasis : tokens.color.border)};
  background: ${(p) => (p.$on ? tokens.color.surfaceAlt : "transparent")};
  color: ${tokens.color.fg};
  cursor: pointer;
`;

const Muted = styled.div`
  color: ${tokens.color.fgMuted};
  font-size: ${tokens.font.small};
`;

/** The map's frame: 4 wide by 3 tall. */
const ASPECT = 0.75;
const MIN_SPAN = 2.5;
const MAX_SPAN = 400;

/** Where the map looks: its center (world cells, north up) and how many cells across. */
interface Camera {
  cx: number;
  cy: number;
  span: number;
}

const Frame = styled.div`
  position: relative;
  user-select: none;
  cursor: grab;
  &[data-dragging="true"] {
    cursor: grabbing;
  }
`;

const Overlay = styled.div`
  position: absolute;
  top: 6px;
  right: 6px;
  display: flex;
  flex-direction: column;
  gap: 3px;
`;

const MapBtn = styled.button<{ $on?: boolean }>`
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  font: inherit;
  font-size: 15px;
  line-height: 1;
  padding: 0;
  border-radius: 4px;
  border: 1px solid ${(p) => (p.$on ? tokens.color.accent : tokens.color.border)};
  background: ${tokens.color.surfaceAlt};
  color: ${tokens.color.fg};
  cursor: pointer;
  &:hover {
    background: ${tokens.color.actionBgHover};
  }
`;

const LevelOverlay = styled.div`
  position: absolute;
  bottom: 6px;
  left: 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: ${tokens.font.micro};
`;

function cameraOf(b: { minX: number; maxX: number; minY: number; maxY: number }): Camera {
  const w = b.maxX - b.minX + 1.8;
  const h = b.maxY - b.minY + 1.8;
  return { cx: (b.minX + b.maxX) / 2, cy: (b.minY + b.maxY) / 2, span: Math.max(w, h / ASPECT, MIN_SPAN) };
}

function boxOf(c: Camera): { minX: number; maxX: number; minY: number; maxY: number } {
  const hw = c.span / 2;
  const hh = (c.span * ASPECT) / 2;
  return { minX: c.cx - hw, maxX: c.cx + hw, minY: c.cy - hh, maxY: c.cy + hh };
}

const clampSpan = (n: number): number => Math.min(MAX_SPAN, Math.max(MIN_SPAN, n));

export interface MapAreaProps {
  sections: NavSections;
  /** Where you stand when it is inferred rather than sent (a copy's room). */
  standAt?: { x: number; y: number; z: number };
  lenses: ReadonlySet<LensName>;
  route?: readonly WireRoutePlan[];
  boundaries?: (view: ZoneView, level: number) => BoundarySide[];
  onPlaceClick?: (place: ViewPlace, view: ZoneView) => void;
  onEdgeClick?: (edge: ViewEdge, view: ZoneView) => void;
  commandFor?: (mark: { place?: ViewPlace; edge?: ViewEdge }, view: ZoneView) => string | null;
  tipFor?: (
    mark: { place?: ViewPlace; edge?: ViewEdge; lens?: LensName; leg?: number },
    view: ZoneView,
  ) => TooltipDoc | null;
  onCommandPreview?: (command: string | null) => void;
  ticks?: React.ComponentProps<typeof ZoneMap>["ticks"];
  leavesFrom?: React.ComponentProps<typeof ZoneMap>["leavesFrom"];
  /** Rendered under the map (the lens row). */
  children?: React.ReactNode;
}

export function MapArea(props: MapAreaProps): React.ReactElement {
  const { sections } = props;
  const mapCopy = useStore((s) => s.mapCopy);
  const zone = sections.zone;
  const zonePath = zone?.id?.path;
  const addresses = React.useMemo(
    () => sections.localities?.chain.map((c) => c.address) ?? [],
    [sections.localities],
  );
  const view = React.useMemo(
    () => (zonePath ? zoneView(mapCopy, zonePath, addresses) : null),
    [mapCopy, zonePath, addresses],
  );
  const at = sections.place?.at ?? props.standAt;
  const here = at ? { x: at.x, y: at.y, level: at.z } : undefined;

  const [shownLevel, setShownLevel] = React.useState<number | null>(null);
  // null = following you; set = the player has panned or zoomed.
  const [camera, setCamera] = React.useState<Camera | null>(null);
  // How many cells across the followed view shows (zooming while following keeps following).
  const [followSpan, setFollowSpan] = React.useState<number | null>(null);
  // Reset when the zone changes.
  React.useEffect(() => {
    setShownLevel(null);
    setCamera(null);
    setFollowSpan(null);
  }, [zonePath]);
  const level = shownLevel ?? here?.level ?? view?.levels[0] ?? 0;

  const frameRef = React.useRef<HTMLDivElement>(null);
  const [pxWidth, setPxWidth] = React.useState(320);
  React.useEffect(() => {
    const el = frameRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setPxWidth(el.clientWidth || 320));
    ro.observe(el);
    return () => ro.disconnect();
  });

  // The camera now: yours, or one that follows where you stand.
  const followed = React.useMemo((): Camera | null => {
    if (!view) return null;
    const near = cameraOf(viewBoxFor(view, level, "nearby", here));
    if (here && here.level === level) {
      return { cx: here.x, cy: here.y, span: clampSpan(followSpan ?? near.span) };
    }
    return followSpan ? { ...near, span: clampSpan(followSpan) } : near;
  }, [view, level, here?.x, here?.y, here?.level, followSpan]);
  const cam = camera ?? followed;

  const zoomBy = (factor: number, at?: { fx: number; fy: number }): void => {
    if (!cam) return;
    const span = clampSpan(cam.span * factor);
    if (!camera && !at) {
      setFollowSpan(span);
      return;
    }
    // Zoom around the pointer: the world point under it stays put.
    const b = boxOf(cam);
    const fx = at?.fx ?? 0.5;
    const fy = at?.fy ?? 0.5;
    const wx = b.minX + fx * (b.maxX - b.minX);
    const wy = b.maxY - fy * (b.maxY - b.minY);
    const nb = boxOf({ cx: wx, cy: wy, span });
    const nw = nb.maxX - nb.minX;
    const nh = nb.maxY - nb.minY;
    setCamera({ cx: wx + (0.5 - fx) * nw, cy: wy - (0.5 - fy) * nh, span });
  };

  // ── wheel, drag, pinch ────────────────────────────────────────────────
  const drag = React.useRef<{ x: number; y: number; moved: boolean; pointers: Map<number, { x: number; y: number }>; pinch?: number } | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const swallowClick = React.useRef(false);
  const camRef = React.useRef(cam);
  camRef.current = cam;

  React.useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    // ⚠ A native listener: React's wheel handler is passive and cannot stop the page scrolling.
    const onWheel = (e: WheelEvent): void => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomByRef.current(e.deltaY > 0 ? 1.18 : 1 / 1.18, { fx: (e.clientX - r.left) / r.width, fy: (e.clientY - r.top) / r.height });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  });
  const zoomByRef = React.useRef(zoomBy);
  zoomByRef.current = zoomBy;

  const onPointerDown = (e: React.PointerEvent): void => {
    if (e.button !== 0) return;
    const d = drag.current ?? { x: e.clientX, y: e.clientY, moved: false, pointers: new Map() };
    d.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (d.pointers.size === 1) {
      d.x = e.clientX;
      d.y = e.clientY;
      d.moved = false;
    }
    drag.current = d;
  };
  const onPointerMove = (e: React.PointerEvent): void => {
    const d = drag.current;
    const c = camRef.current;
    if (!d || !c || !d.pointers.has(e.pointerId)) return;
    const prev = d.pointers.get(e.pointerId)!;
    d.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (d.pointers.size === 2) {
      // Pinch: the distance between two fingers zooms.
      const [a, b] = [...d.pointers.values()];
      const dist = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      if (d.pinch) zoomByRef.current(d.pinch / dist);
      d.pinch = dist;
      d.moved = true;
      return;
    }
    if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 5) return;
    if (!d.moved) {
      d.moved = true;
      setDragging(true);
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    }
    const perPx = c.span / (frameRef.current?.clientWidth || pxWidth);
    setCamera({ cx: c.cx - (e.clientX - prev.x) * perPx, cy: c.cy + (e.clientY - prev.y) * perPx, span: c.span });
  };
  const onPointerUp = (e: React.PointerEvent): void => {
    const d = drag.current;
    if (!d) return;
    d.pointers.delete(e.pointerId);
    if (d.pointers.size < 2) d.pinch = undefined;
    if (d.pointers.size === 0) {
      if (d.moved) swallowClick.current = true;
      drag.current = null;
      setDragging(false);
    }
  };

  if (!zone || !zonePath) {
    return <Muted data-testid="nav-map-unknown">Where you are is not known yet.</Muted>;
  }
  if (zone.kind && zone.kind !== "grid") {
    return <Muted data-testid="nav-no-map">No map for this kind of space yet.</Muted>;
  }
  if (!view) return <Muted data-testid="nav-map-unknown">Where you are is not known yet.</Muted>;

  const fit = (): void => setCamera(cameraOf(viewBoxFor(view, level, "whole", here)));
  const findMe = (): void => {
    setShownLevel(null);
    setCamera(null);
  };
  const levels = here && !view.levels.includes(here.level) ? [...view.levels, here.level].sort((a, b) => a - b) : view.levels;

  return (
    <Root data-testid="nav-map-area">
      {view.places.length === 0 ? (
        <Muted data-testid="nav-map-empty">Nothing of this area on your map yet — walk somewhere and look around, and it draws itself.</Muted>
      ) : (
        <Frame
          ref={frameRef}
          data-testid="nav-map-frame"
          data-following={camera ? "false" : "true"}
          data-dragging={dragging ? "true" : "false"}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onClickCapture={(e) => {
            // A drag is not a click: the pan must not send a command.
            if (swallowClick.current) {
              swallowClick.current = false;
              e.stopPropagation();
              e.preventDefault();
            }
          }}
        >
          <ZoneMap
            view={view}
            {...(here ? { here } : {})}
            level={level}
            {...(cam ? { box: boxOf(cam) } : {})}
            pxWidth={pxWidth}
            lenses={props.lenses}
            {...(props.route ? { route: props.route } : {})}
            {...(props.boundaries ? { boundaries: props.boundaries(view, level) } : {})}
            {...(props.ticks ? { ticks: props.ticks } : {})}
            {...(props.leavesFrom ? { leavesFrom: props.leavesFrom } : {})}
            {...(props.onCommandPreview ? { onPreview: props.onCommandPreview } : {})}
            {...(props.onPlaceClick ? { onPlaceClick: (p) => props.onPlaceClick!(p, view) } : {})}
            {...(props.onEdgeClick ? { onEdgeClick: (e) => props.onEdgeClick!(e, view) } : {})}
            {...(props.commandFor ? { commandFor: (m) => props.commandFor!(m, view) } : {})}
            {...(props.tipFor ? { tipFor: (m) => props.tipFor!(m, view) } : {})}
          />
          <Overlay onPointerDown={(e) => e.stopPropagation()}>
            <Tip tip={controlDoc("Zoom in", undefined, "Or turn the wheel, or pinch.")}>
              <MapBtn type="button" data-testid="nav-zoom-in" aria-label="zoom in" onClick={() => zoomBy(1 / 1.5)}>+</MapBtn>
            </Tip>
            <Tip tip={controlDoc("Zoom out", undefined, "Or turn the wheel, or pinch.")}>
              <MapBtn type="button" data-testid="nav-zoom-out" aria-label="zoom out" onClick={() => zoomBy(1.5)}>−</MapBtn>
            </Tip>
            <Tip tip={controlDoc("Find me", undefined, camera ? "Center on you, and follow you as you move." : "The map is following you. Drag it to look around.")}>
              <MapBtn type="button" data-testid="nav-me" aria-label="find me" $on={!camera} onClick={findMe}>⌖</MapBtn>
            </Tip>
            <Tip tip={controlDoc("Show everything", undefined, "Fit everything you know of this area on the level shown.")}>
              <MapBtn type="button" data-testid="nav-map-fit" aria-label="show everything" onClick={fit}>⤢</MapBtn>
            </Tip>
          </Overlay>
          {levels.length > 1 ? (
            <LevelOverlay data-testid="nav-levels" role="group" aria-label="Levels you know" onPointerDown={(e) => e.stopPropagation()}>
              {[...levels].reverse().map((l) => (
                <Tip key={l} tip={levelDoc(levelName(l), view.places.filter((p) => p.level === l).length, here?.level === l)}>
                  <Btn
                    type="button"
                    data-testid={`nav-level-${l}`}
                    data-yours={here?.level === l ? "true" : undefined}
                    $on={level === l}
                    aria-pressed={level === l}
                    onClick={() => setShownLevel(l)}
                    style={{ background: tokens.color.surfaceAlt }}
                  >
                    {levelName(l)}
                    {here?.level === l ? " •" : ""}
                  </Btn>
                </Tip>
              ))}
            </LevelOverlay>
          ) : null}
        </Frame>
      )}
      {view.places.length === 0 ? null : (<>
      {props.children}
      </>)}
      {view.unplaced.length > 0 ? (
        <Muted data-testid="nav-unplaced">
          Known, not yet placed: {view.unplaced.map((p) => p.name).join(", ")}
        </Muted>
      ) : null}
    </Root>
  );
}

export function levelName(l: number): string {
  if (l === 0) return "ground";
  return l > 0 ? `up ${l}` : `down ${-l}`;
}
