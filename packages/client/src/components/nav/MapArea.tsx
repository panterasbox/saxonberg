/**
 * MapArea — the zone section's map and its controls (navigation card D1,
 * D3, D4): the map, the zoom steps and *me*, the level control (only past
 * one level), the places you know but have not placed, and the honest
 * placeholders when there is nothing to draw.
 *
 * Zoom and the level shown are this component's own state: they reset
 * when the zone changes and are not remembered (D4).
 */

import React from "react";
import styled from "styled-components";
import type { NavSections, TooltipDoc, WireRoutePlan } from "@saxonberg/types";
import { useStore } from "../../store/index";
import { zoneView, type ViewEdge, type ViewPlace, type ZoneView } from "../../store/navSelectors";
import { tokens } from "../ui";
import { Tip } from "../tooltip/Tip";
import { controlDoc, levelDoc } from "../doc/docs";
import { ZoneMap, ZOOMS, type BoundarySide, type LensName, type Zoom } from "./ZoneMap";

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

const ZOOM_LABEL: Record<Zoom, string> = { whole: "whole zone", nearby: "nearby", close: "close" };

export interface MapAreaProps {
  sections: NavSections;
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
  const at = sections.place?.at;
  const here = at ? { x: at.x, y: at.y, level: at.z } : undefined;

  const [zoom, setZoom] = React.useState<Zoom>("nearby");
  const [options, setOptions] = React.useState(false);
  const [shownLevel, setShownLevel] = React.useState<number | null>(null);
  // Reset when the zone changes.
  React.useEffect(() => {
    setZoom("nearby");
    setShownLevel(null);
  }, [zonePath]);
  const level = shownLevel ?? here?.level ?? view?.levels[0] ?? 0;

  if (!zone || !zonePath) {
    return <Muted data-testid="nav-map-unknown">Where you are is not known yet.</Muted>;
  }
  if (zone.kind && zone.kind !== "grid") {
    return <Muted data-testid="nav-no-map">No map for this kind of space yet.</Muted>;
  }
  if (!view) return <Muted data-testid="nav-map-unknown">Where you are is not known yet.</Muted>;

  const step = (dir: 1 | -1): void => {
    const i = ZOOMS.indexOf(zoom) + dir;
    if (i >= 0 && i < ZOOMS.length) setZoom(ZOOMS[i]!);
  };
  const levels = here && !view.levels.includes(here.level) ? [...view.levels, here.level].sort((a, b) => a - b) : view.levels;

  return (
    <Root data-testid="nav-map-area">
      {view.places.length === 0 ? (
        <Muted data-testid="nav-map-empty">Nothing of this area on your map yet — walk somewhere and look around, and it draws itself.</Muted>
      ) : (
        <ZoneMap
          view={view}
          {...(here ? { here } : {})}
          level={level}
          zoom={zoom}
          lenses={props.lenses}
          {...(props.route ? { route: props.route } : {})}
          {...(props.boundaries ? { boundaries: props.boundaries(view, level) } : {})}
          onZoomStep={step}
          {...(props.ticks ? { ticks: props.ticks } : {})}
          {...(props.leavesFrom ? { leavesFrom: props.leavesFrom } : {})}
          {...(props.onCommandPreview ? { onPreview: props.onCommandPreview } : {})}
          {...(props.onPlaceClick ? { onPlaceClick: (p) => props.onPlaceClick!(p, view) } : {})}
          {...(props.onEdgeClick ? { onEdgeClick: (e) => props.onEdgeClick!(e, view) } : {})}
          {...(props.commandFor ? { commandFor: (m) => props.commandFor!(m, view) } : {})}
          {...(props.tipFor ? { tipFor: (m) => props.tipFor!(m, view) } : {})}
        />
      )}
      {view.places.length === 0 ? null : (<>
      {/* PROTOTYPE: zoom and lenses folded behind one control. */}
      <Controls>
        <Btn type="button" data-testid="nav-map-options" aria-expanded={options} $on={options} onClick={() => setOptions((o) => !o)}>
          {options ? "▾ map options" : "▸ map options"}
        </Btn>
      </Controls>
      {levels.length > 1 ? (
        <Controls data-testid="nav-levels" role="group" aria-label="Levels you know">
          {[...levels].reverse().map((l) => (
            <Tip key={l} tip={levelDoc(levelName(l), view.places.filter((p) => p.level === l).length, here?.level === l)}>
              <Btn
                type="button"
                data-testid={`nav-level-${l}`}
                data-yours={here?.level === l ? "true" : undefined}
                $on={level === l}
                aria-pressed={level === l}
                onClick={() => setShownLevel(l)}
              >
                {levelName(l)}
                {here?.level === l ? " •" : ""}
              </Btn>
            </Tip>
          ))}
        </Controls>
      ) : null}
      {options ? (<>
      <Controls data-testid="nav-zoom">
        {ZOOMS.map((z) => (
          <Tip key={z} tip={controlDoc(`Zoom: ${ZOOM_LABEL[z]}`, undefined, zoomHint(z))}>
            <Btn type="button" data-testid={`nav-zoom-${z}`} $on={zoom === z} aria-pressed={zoom === z} onClick={() => setZoom(z)}>
              {ZOOM_LABEL[z]}
            </Btn>
          </Tip>
        ))}
        <Tip tip={controlDoc("Me", undefined, "Show your own level and follow you again.")}>
          <Btn
            type="button"
            data-testid="nav-me"
            onClick={() => {
              setShownLevel(null);
              if (zoom === "whole") setZoom("nearby");
            }}
          >
            me
          </Btn>
        </Tip>
      </Controls>
      {props.children}
      </>) : null}
      </>)}
      {view.unplaced.length > 0 ? (
        <Muted data-testid="nav-unplaced">
          Known, not yet placed: {view.unplaced.map((p) => p.name).join(", ")}
        </Muted>
      ) : null}
    </Root>
  );
}

function zoomHint(z: Zoom): string {
  if (z === "whole") return "Everything you have found in this zone, on the level shown.";
  if (z === "nearby") return "You and the places within two ways of you.";
  return "You and your neighbors, with their names.";
}

export function levelName(l: number): string {
  if (l === 0) return "ground";
  return l > 0 ? `up ${l}` : `down ${-l}`;
}
