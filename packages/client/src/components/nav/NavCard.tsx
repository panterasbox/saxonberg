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
import type { NavWay, TooltipDoc, WireClaim } from "@saxonberg/types";
import { useStore } from "../../store/index";
import {
  boundariesView,
  crumbsView,
  localityKnowledge,
  placeByKey,
  neighborDirection,
  placeAt,
  routeCommandFor,
  wayLeadsTo,
  zoneView,
  type Standing,
  type ViewEdge,
  type Crumb,
  type ViewPlace,
  type ZoneView,
} from "../../store/navSelectors";
import { websocketClient } from "../../services/websocket";
import type { TipSpec } from "../tooltip/useTip";
import { readNavCard, setLens, setSection } from "../../store/navCardActions";
import { escapeTarget, lookCommand, useLinkMode } from "../cards/clickTarget";
import { ChangeMark } from "../cards/ChangeMark";
import { tokens } from "../ui";
import { crumbDoc, edgeDoc, placeDoc, sightingDoc, wayDoc, zoneDoc } from "../doc/docs";
import { MapArea } from "./MapArea";
import { Ways } from "./Ways";
import { Crumbs } from "./Crumbs";
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

const StandingHere = styled.div`
  font-size: ${tokens.font.small};
  color: ${tokens.color.fgDim};
`;

const LinkButton = styled.button`
  font: inherit;
  padding: 0;
  border: none;
  background: none;
  color: ${tokens.color.accent};
  cursor: pointer;
  text-decoration: underline dotted;
  text-underline-offset: 2px;
`;

const Here = styled.div`
  font-family: ${tokens.font.serif};
  font-size: ${tokens.font.title};
  color: ${tokens.color.fg};
`;

/** The optional sections, widest first — the order the card opens them in. */
/** `look <the building>` — its name as a typed target. */
const structureLook = (name: string): string => `look ${escapeTarget(name.replace(/^the\s+/i, ""))}`;

export const SECTION_ORDER = ["zone", "horizon", "structure", "place", "you"] as const;

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

  const standingOnly =
    !sections.building?.name && !sections.localities?.ship && (sections.building?.landed?.length ?? 0) > 0;
  // The summaries; a null one is a section that is absent.
  const summaries: Record<(typeof SECTION_ORDER)[number], string | null> = {
    zone: zoneSummary(sections),
    horizon: horizonSummary(sections),
    // Outdoors with only buildings standing by: a plain line, not a section
    // that opens to say its own summary again.
    structure: standingOnly ? null : structureSummary(sections),
    place: sections.place ? placeSummary(sections) : null,
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
        // Where you stand: a click looks around (it once routed you to yourself).
        if (herePlace && mark.place.key === herePlace.key) return "look";
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

  /** The ways from here the ways section says leave this zone — never a `?`. */
  const leavingDirs = React.useMemo(
    () => new Set((sections.ways?.ways ?? []).filter((w) => w.crossesZone).map((w) => w.direction.toLowerCase())),
    [sections.ways],
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

  /** A mark on the map, as your map knows it (D12). */
  const markTip = (
    mark: { place?: ViewPlace; edge?: ViewEdge; lens?: LensName; leg?: number },
    view: ZoneView,
  ): TooltipDoc | null => {
    if (mark.place) {
      const command = commandFor({ place: mark.place });
      const neighbor = (command?.startsWith("go ") ?? false) || command === "look";
      return placeDoc(mark.place, { command, neighbor, ...(command === "look" ? { here: true } : {}) });
    }
    if (mark.edge) {
      const e = mark.edge;
      const from = view.places.find((p) => p.key === e.from);
      const far = e.to ? placeByKey(mapCopy, e.to) : undefined;
      const others = view.edges
        .filter((o) => o.from === e.from && o.dir === e.dir && o.id !== e.id && o.to)
        .map((o) => placeByKey(mapCopy, o.to!)?.name ?? "somewhere");
      const lengthM =
        e.shape === "track" && from && far && sections.zone?.cellSizeM
          ? Math.hypot(far.x - from.x, far.y - from.y) * sections.zone.cellSizeM
          : undefined;
      return edgeDoc(e, {
        from: from?.name ?? "somewhere",
        ...(far ? { to: far.name } : {}),
        ...(lengthM !== undefined ? { lengthM } : {}),
        command: commandFor({ edge: e }),
        others,
      });
    }
    if (mark.lens === "route" && mark.leg !== undefined) {
      const plan = routePlan?.plans[0];
      const said = plan?.assumptions.filter((a) => a.leg === mark.leg).map((a) => a.text) ?? [];
      return {
        header: { name: "the least certain leg", kindWord: "route" },
        prose: said.length > 0 ? said.join(" ") : "This leg is the least sure of the plan.",
      };
    }
    return null;
  };

  /**
   * A crumb, from your claim — and, when you hold one, its civic facts,
   * asked for only when the tooltip opens (W8).
   */
  const crumbTip = (c: Crumb): TipSpec | TooltipDoc => {
    const known: { claim?: WireClaim; claims: number; places?: number } = c.ship ? { claims: 0 } : localityKnowledge(mapCopy, c.address);
    const doc = crumbDoc(c, known);
    if (c.ship || !c.name || !known.claim) return doc;
    return {
      key: `crumb:${c.address}`,
      resolve: async () => {
        const facts = await websocketClient.localityFacts(c.address);
        return crumbDoc(
          c,
          known,
          facts ? { seats: facts.seats, resident: facts.resident, ...(facts.forecast ? { forecast: facts.forecast } : {}) } : null,
        );
      },
    };
  };

  /** A way from here: what it is, where it leads, what stops you (D12). */
  const wayTip = (w: NavWay): TooltipDoc => {
    const to = standing ? wayLeadsTo(mapCopy, standing, w) : undefined;
    const dir = w.direction.toLowerCase();
    const mapEdge = herePlace && zv ? zv.edges.find((e) => e.from === herePlace.key && e.dir === dir) : undefined;
    const far = mapEdge?.to ? placeByKey(mapCopy, mapEdge.to) : undefined;
    const thumb =
      far && far.placed && far.zone && far.zone !== sections.zone?.id?.path ? { zone: far.zone, level: far.level } : undefined;
    return wayDoc(w.direction, `go ${w.direction}`, {
      ...(to ? { to: to.name, toSource: to.channel } : {}),
      ...(w.boundary ? { through: `${w.boundary.name}${w.state === "open" ? "" : ` (${w.state})`}` } : {}),
      way: w,
      ...(mapEdge?.foundBySearching ? { foundBySearching: true } : {}),
      ...(thumb ? { zoneThumb: thumb } : {}),
    });
  };

  const run = (command: string | null): void => {
    if (command) props.onSendCommand(command);
  };
  const leadsTo = (w: NavWay): string | undefined =>
    standing ? wayLeadsTo(mapCopy, standing, w)?.name : w.destination;

  const section = (
    name: (typeof SECTION_ORDER)[number],
    body: React.ReactNode,
    surface?: string,
    tip?: TooltipDoc,
  ): React.ReactNode =>
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
        {...(tip ? { tip } : {})}
      >
        {body}
      </NavSection>
    );

  return (
    <Root ref={rootRef} data-testid="nav-card">
      {/* 1 · you are here */}
      <Here data-testid="nav-here-name">{sections.place?.name ?? "Somewhere"}</Here>

      {/* 2 · in the world — always shown: it is the line that says where you are */}
      <ChangeMark surface="nav:localities">
        <Crumbs
          crumbs={crumbs}
          placeName={sections.place?.name ?? ""}
          tipFor={(c) => crumbTip(c)}
          onSendCommand={props.onSendCommand}
          {...(props.onCommandPreview ? { onCommandPreview: props.onCommandPreview } : {})}
        />
      </ChangeMark>

      {/* 3 · the zone, and its map (the map is always shown) */}
      <ChangeMark surface="nav:zone">
        <MapArea
          sections={sections}
          lenses={lenses}
          {...(routePlan ? { route: routePlan.plans } : {})}
          commandFor={commandFor}
          {...(herePlace ? { leavesFrom: { place: herePlace.key, dirs: leavingDirs } } : {})}
          onPlaceClick={(p) => run(commandFor({ place: p }))}
          onEdgeClick={(e) => run(commandFor({ edge: e }))}
          boundaries={(view, level) => boundariesView(mapCopy, view, level)}
          tipFor={(mark, view) => markTip(mark, view)}
          ticks={(sections.horizon?.things ?? [])
            .filter((t) => t.glance?.point)
            .map((t) => ({
              id: t.stuffId,
              point: t.glance!.point!,
              name: t.name,
              doc: sightingDoc(t, lookCommand(t.stuffId, undefined, linkMode)),
              onClick: () => run(lookCommand(t.stuffId, undefined, linkMode)),
            }))}
          {...(props.onCommandPreview ? { onCommandPreview: props.onCommandPreview } : {})}
        >
          <LensRow
            on={lenses}
            onToggle={(l, on) => setLens(l, on)}
            tipFor={(l) => lensDoc(l, lenses.has(l), lensCount(l))}
          />
        </MapArea>
      </ChangeMark>
      {section(
        "zone",
        sections.zone ? <ZoneBody sections={sections} view={zv} /> : null,
        undefined,
        zv ? zoneDoc(sections, zv.counts) : undefined,
      )}

      {/* 4 · the horizon */}
      {section(
        "horizon",
        sections.horizon ? (
          <HorizonBody
            sections={sections}
            onLook={(id) => run(lookCommand(id, undefined, linkMode))}
            lookFor={(id) => lookCommand(id, undefined, linkMode)}
            {...(props.onCommandPreview ? { onPreview: props.onCommandPreview } : {})}
          />
        ) : null,
        "nav:horizon",
      )}

      {/* 5 · the structure — outdoors, only what stands here, each a look */}
      {standingOnly ? (
        <StandingHere data-testid="nav-standing-here">
          Standing here:{" "}
          {sections.building!.landed!.map((l, i) => (
            <React.Fragment key={l.name}>
              {i > 0 ? ", " : null}
              <LinkButton
                type="button"
                onClick={() => run(structureLook(l.name))}
                onMouseEnter={() => props.onCommandPreview?.(structureLook(l.name))}
                onMouseLeave={() => props.onCommandPreview?.(null)}
              >
                {l.name}
              </LinkButton>
            </React.Fragment>
          ))}
        </StandingHere>
      ) : null}
      {/* 5 · the structure */}
      {section(
        "structure",
        <StructureBody
          sections={sections}
          onLook={(name) => run(structureLook(name))}
          lookFor={structureLook}
          {...(props.onCommandPreview ? { onPreview: props.onCommandPreview } : {})}
        />,
        "nav:building",
      )}

      {/* 6 · the ways (always open) */}
      <ChangeMark surface="nav:ways">
        <Ways
          ways={sections.ways?.ways ?? []}
          leadsTo={leadsTo}
          tipFor={(w) => wayTip(w)}
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
            {...(props.onCommandPreview ? { onPreview: props.onCommandPreview } : {})}
          />
        ) : null,
        "nav:place",
      )}

      {/* 8 · you */}
      {section("you", sections.you ? <YouBody sections={sections} /> : null, "nav:you")}
    </Root>
  );
}
