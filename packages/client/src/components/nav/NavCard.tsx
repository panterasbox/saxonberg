/**
 * NavCard — the zone navigation card (navigation card D7): the `map`
 * card's body, docked in the Explore panel. Where you are, at zone level,
 * drawn from your own map, widest to narrowest:
 *
 *   1 you are here · 2 in the world · 3 the zone and its map ·
 *   4 the horizon · 5 the structure · 6 the ways · 7 the place · 8 you
 *
 * ⭐ The glance rule: every section is a summary line that opens; a
 * section with nothing to say is absent, never an empty box. The card
 * fills the height it is given (D8) and remembers only the sections the
 * player set by hand (D9).
 *
 * ⭐ The map is how you move (D3, D5): a click on a neighbor sends
 * `go <that way>`; a click on a place further off sends `route to …` and
 * the plan it answers is drawn. Every click is a real command, previewed
 * in the status bar first.
 */

import React from "react";
import styled from "styled-components";
import type { NavWay } from "@saxonberg/types";
import { useStore } from "../../store/index";
import {
  boundariesView,
  crumbsView,
  neighborDirection,
  placeAt,
  routeCommandFor,
  wayLeadsTo,
  zoneView,
  type Standing,
  type ViewEdge,
  type ViewPlace,
} from "../../store/navSelectors";
import { readNavCard, setLens, setSection } from "../../store/navCardActions";
import { escapeTarget, lookCommand, useLinkMode } from "../cards/clickTarget";
import { ChangeMark } from "../cards/ChangeMark";
import { tokens } from "../ui";
import { wayDoc } from "../doc/docs";
import { MapArea } from "./MapArea";
import { Ways } from "./Ways";
import { Crumbs, crumbsSummary } from "./Crumbs";
import { NavSection } from "./NavSection";
import { useFillHeight } from "./useFillHeight";
import { LensRow } from "./LensRow";
import { lensDoc } from "../doc/docs";
import type { LensName } from "./ZoneMap";
import {
  HorizonBody,
  PlaceBody,
  StructureBody,
  YouBody,
  ZoneBody,
  horizonSummary,
  placeSummary,
  structureSummary,
  youSummary,
  zoneSummary,
} from "./sections";

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.sm};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.body};
  color: ${tokens.color.fg};
`;

const Here = styled.div`
  font-family: ${tokens.font.serif};
  font-size: ${tokens.font.title};
  color: ${tokens.color.fg};
`;

/** The optional sections, widest first — the order the card opens them in. */
export const SECTION_ORDER = ["world", "zone", "horizon", "structure", "place", "you"] as const;

export interface NavCardProps {
  onSendCommand: (command: string) => void;
  onCommandPreview?: (command: string | null) => void;
}

export function NavCard(props: NavCardProps): React.ReactElement {
  const sections = useStore((s) => s.navSections);
  const mapCopy = useStore((s) => s.mapCopy);
  const routePlan = useStore((s) => s.routePlan);
  const clientState = useStore((s) => s.clientState);
  const memory = React.useMemo(() => readNavCard(clientState), [clientState]);
  const lenses = React.useMemo(() => new Set(memory.lenses as LensName[]), [memory.lenses]);
  const linkMode = useLinkMode();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const bodies = React.useRef(new Map<string, HTMLDivElement>());

  const standing: Standing | null =
    sections.zone?.id && sections.place?.at
      ? { zone: sections.zone.id.path, at: sections.place.at, ways: sections.ways?.ways ?? [] }
      : null;
  const herePlace = standing ? placeAt(mapCopy, standing.zone, standing.at) : undefined;
  const crumbs = React.useMemo(() => crumbsView(mapCopy, sections.localities), [mapCopy, sections.localities]);
  const zv = React.useMemo(() => {
    const path = sections.zone?.id?.path;
    if (!path) return null;
    return zoneView(mapCopy, path, sections.localities?.chain.map((c) => c.address) ?? []);
  }, [mapCopy, sections.zone, sections.localities]);

  // The summaries; a null one is a section that is absent.
  const summaries: Record<(typeof SECTION_ORDER)[number], string | null> = {
    world: crumbsSummary(crumbs, sections),
    zone: zoneSummary(sections),
    horizon: horizonSummary(sections),
    structure: structureSummary(sections),
    place: sections.place ? placeSummary(sections, herePlace) : null,
    you: youSummary(sections),
  };
  const present = SECTION_ORDER.filter((n) => summaries[n] !== null);

  const auto = useFillHeight({
    rootRef,
    order: present,
    userSet: memory.sections,
    measure: (name) => bodies.current.get(name)?.getBoundingClientRect().height ?? 0,
  });
  const isOpen = (name: string): boolean => {
    const set = memory.sections[name];
    return set !== undefined ? set === "open" : auto.has(name);
  };

  const commandFor = React.useCallback(
    (mark: { place?: ViewPlace; edge?: ViewEdge }): string | null => {
      if (mark.place) {
        const dir = standing ? neighborDirection(mapCopy, standing, mark.place) : undefined;
        return dir ? `go ${dir}` : routeCommandFor(mapCopy, mark.place);
      }
      if (mark.edge && standing && herePlace?.key === mark.edge.from) {
        const way = standing.ways.find((w) => w.direction.toLowerCase() === mark.edge!.dir);
        if (way) return `go ${way.direction}`;
      }
      return null;
    },
    [mapCopy, standing, herePlace],
  );

  /** How much a lens has to draw on the level you stand on — its tooltip says when it is nothing. */
  const lensCount = (l: LensName): number => {
    if (!zv) return 0;
    const level = sections.place?.at?.z ?? 0;
    const onLevel = (key: string): boolean => zv.places.some((p) => p.key === key && p.level === level);
    if (l === "frontier") return zv.edges.filter((e) => onLevel(e.from) && (e.shape === "opening" || (e.shape === "vertical" && !e.farKnown))).length;
    if (l === "route") return routePlan?.plans[0]?.legs.length ?? 0;
    if (l === "refusals") return zv.edges.filter((e) => onLevel(e.from) && (e.state === "locked" || e.state === "shut")).length;
    return boundariesView(mapCopy, zv, level).length;
  };

  const run = (command: string | null): void => {
    if (command) props.onSendCommand(command);
  };
  const leadsTo = (w: NavWay): string | undefined =>
    standing ? wayLeadsTo(mapCopy, standing, w)?.name : w.destination;

  const section = (name: (typeof SECTION_ORDER)[number], body: React.ReactNode, surface?: string): React.ReactNode =>
    summaries[name] === null ? null : (
      <NavSection
        key={name}
        name={name}
        summary={summaries[name]!}
        open={isOpen(name)}
        set={memory.sections[name] !== undefined}
        onToggle={(open) => setSection(name, open ? "open" : "closed")}
        bodyRef={(el) => {
          if (el) bodies.current.set(name, el);
          else bodies.current.delete(name);
        }}
        {...(surface ? { surface } : {})}
      >
        {body}
      </NavSection>
    );

  return (
    <Root ref={rootRef} data-testid="nav-card">
      {/* 1 · you are here */}
      <Here data-testid="nav-here-name">{sections.place?.name ?? "Somewhere"}</Here>

      {/* 2 · in the world */}
      {section(
        "world",
        <Crumbs
          crumbs={crumbs}
          placeName={sections.place?.name ?? ""}
          onSendCommand={props.onSendCommand}
          {...(props.onCommandPreview ? { onCommandPreview: props.onCommandPreview } : {})}
        />,
        "nav:localities",
      )}

      {/* 3 · the zone, and its map (the map is always shown) */}
      <ChangeMark surface="nav:zone">
        <MapArea
          sections={sections}
          lenses={lenses}
          {...(routePlan ? { route: routePlan.plans } : {})}
          commandFor={commandFor}
          onPlaceClick={(p) => run(commandFor({ place: p }))}
          onEdgeClick={(e) => run(commandFor({ edge: e }))}
          boundaries={(view, level) => boundariesView(mapCopy, view, level)}
          {...(props.onCommandPreview ? { onCommandPreview: props.onCommandPreview } : {})}
        >
          <LensRow
            on={lenses}
            onToggle={(l, on) => setLens(l, on)}
            tipFor={(l) => lensDoc(l, lenses.has(l), lensCount(l))}
          />
        </MapArea>
      </ChangeMark>
      {section("zone", sections.zone ? <ZoneBody sections={sections} view={zv} /> : null)}

      {/* 4 · the horizon */}
      {section(
        "horizon",
        sections.horizon ? (
          <HorizonBody sections={sections} onLook={(id) => run(lookCommand(id, undefined, linkMode))} />
        ) : null,
        "nav:horizon",
      )}

      {/* 5 · the structure */}
      {section(
        "structure",
        <StructureBody sections={sections} onLook={(name) => run(`look ${escapeTarget(name.replace(/^the\s+/i, ""))}`)} />,
        "nav:building",
      )}

      {/* 6 · the ways (always open) */}
      <ChangeMark surface="nav:ways">
        <Ways
          ways={sections.ways?.ways ?? []}
          leadsTo={leadsTo}
          tipFor={(w) => {
            const to = leadsTo(w);
            const doc = wayDoc(w.direction, `go ${w.direction}`, {
              ...(to ? { to } : {}),
              ...(w.boundary ? { through: `${w.boundary.name}${w.state === "open" ? "" : ` (${w.state})`}` } : {}),
            });
            if (w.take && !w.take.ok) {
              const works = w.take.works?.command;
              return { ...doc, prose: w.take.reason, ...(works ? { hint: `${works} would get you through.` } : {}) };
            }
            return doc;
          }}
          onSendCommand={props.onSendCommand}
          {...(props.onCommandPreview ? { onCommandPreview: props.onCommandPreview } : {})}
        />
      </ChangeMark>

      {/* 7 · the place */}
      {section(
        "place",
        sections.place ? (
          <PlaceBody
            sections={sections}
            {...(herePlace ? { known: herePlace } : {})}
            onLook={() => run("look")}
          />
        ) : null,
        "nav:place",
      )}

      {/* 8 · you */}
      {section("you", sections.you ? <YouBody sections={sections} /> : null, "nav:you")}
    </Root>
  );
}
