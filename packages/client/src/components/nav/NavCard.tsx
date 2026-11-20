/**
 * NavCard — the zone navigation card (navigation card D7): the `map`
 * card's body, docked in the Explore panel. Where you are, at zone level,
 * drawn from your own map.
 *
 * ⚠ W2 shell: the map on top, the shipped text navigator beneath it, so
 * nothing is lost between waves.
 *
 * ⭐ The map is how you move (D3, D5): a click on a neighbor sends
 * `go <that way>`; a click on a place further off sends `route to …` and
 * the plan it answers is drawn. Every click is a real command, previewed
 * in the status bar first.
 */

import React from "react";
import { useStore } from "../../store/index";
import { whereaboutsOf } from "../../store/navSlice";
import {
  neighborDirection,
  placeAt,
  routeCommandFor,
  type Standing,
  type ViewEdge,
  type ViewPlace,
} from "../../store/navSelectors";
import { NavigatorBody } from "../cards/NavigatorBody";
import { MapArea } from "./MapArea";
import type { LensName } from "./ZoneMap";

const DEFAULT_LENSES: ReadonlySet<LensName> = new Set<LensName>(["frontier", "route"]);

export interface NavCardProps {
  onSendCommand: (command: string) => void;
  onCommandPreview?: (command: string | null) => void;
}

export function NavCard(props: NavCardProps): React.ReactElement {
  const sections = useStore((s) => s.navSections);
  const mapCopy = useStore((s) => s.mapCopy);
  const routePlan = useStore((s) => s.routePlan);
  const where = React.useMemo(() => whereaboutsOf(sections), [sections]);

  const standing: Standing | null =
    sections.zone?.id && sections.place?.at
      ? { zone: sections.zone.id.path, at: sections.place.at, ways: sections.ways?.ways ?? [] }
      : null;

  const commandFor = React.useCallback(
    (mark: { place?: ViewPlace; edge?: ViewEdge }): string | null => {
      if (mark.place) {
        const dir = standing ? neighborDirection(mapCopy, standing, mark.place) : undefined;
        return dir ? `go ${dir}` : routeCommandFor(mapCopy, mark.place);
      }
      if (mark.edge && standing) {
        const way = standing.ways.find((w) => w.direction === mark.edge!.dir || w.direction.toLowerCase() === mark.edge!.dir);
        if (way && isHere(mapCopy, standing, mark.edge.from)) return `go ${way.direction}`;
      }
      return null;
    },
    [mapCopy, standing],
  );

  const run = (command: string | null): void => {
    if (command) props.onSendCommand(command);
  };

  return (
    <div data-testid="nav-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <MapArea
        sections={sections}
        lenses={DEFAULT_LENSES}
        {...(routePlan ? { route: routePlan.plans } : {})}
        commandFor={commandFor}
        onPlaceClick={(p) => run(commandFor({ place: p }))}
        onEdgeClick={(e) => run(commandFor({ edge: e }))}
        {...(props.onCommandPreview ? { onCommandPreview: props.onCommandPreview } : {})}
      />
      {where ? <NavigatorBody where={where} {...props} /> : null}
    </div>
  );
}

function isHere(
  copy: Parameters<typeof neighborDirection>[0],
  standing: Standing,
  key: string,
): boolean {
  return placeAt(copy, standing.zone, standing.at)?.key === key;
}
