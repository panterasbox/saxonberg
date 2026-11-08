/**
 * NavigatorBody — the `map` card's body: where you are, at zone level.
 *
 * ⭐ Navigation, not inspection (owner, 2026-11-01). Nothing here says
 * what the room LOOKS like — that is the room's own inspection card.
 * This answers *where am I, and how do I get out* (map slate, the zone
 * navigation card; this is its wave-1 stub with no map drawn yet).
 *
 * - The breadcrumb is display-only for now: knowing a Locality is meant to
 *   come from your MAP (a first visit records it), which is a later build.
 * - The rose shows the ways out inside this zone; a way that leaves the
 *   zone's grid goes to a LIST, because a compass arm cannot say where a
 *   different coordinate frame is (map slate § 3).
 * - Every value is what the server sent. An absent one says it is not
 *   known rather than showing a guess.
 */

import React from "react";
import styled from "styled-components";
import type { Whereabouts, WhereaboutsExit } from "@saxonberg/types";
import { tokens } from "../ui";

interface NavigatorBodyProps {
  where: Whereabouts;
  onSendCommand: (command: string) => void;
  onCommandPreview?: (command: string | null) => void;
}

/** The rose's eight cells, row by row, with the centre for "you". */
const ROSE: readonly (string | null)[] = [
  "northwest", "north", "northeast",
  "west", null, "east",
  "southwest", "south", "southeast",
];

const SHORT: Readonly<Record<string, string>> = {
  north: "N", northeast: "NE", east: "E", southeast: "SE",
  south: "S", southwest: "SW", west: "W", northwest: "NW",
  up: "up", down: "down", in: "in", out: "out",
};

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.lg};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.body};
  color: ${tokens.color.fg};
`;

const Crumbs = styled.nav`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: ${tokens.space.xs};
  color: ${tokens.color.fgMuted};
  font-size: ${tokens.font.small};
`;

const Here = styled.span`
  color: ${tokens.color.fg};
  font-family: ${tokens.font.serif};
  font-size: ${tokens.font.title};
`;

const Label = styled.div`
  font-size: ${tokens.font.label};
  color: ${tokens.color.sectionLabel};
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: ${tokens.space.xs};
`;

const Rose = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 2.6rem);
  grid-template-rows: repeat(3, 2.2rem);
  gap: 3px;
`;

const Arm = styled.button<{ $door?: boolean }>`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.micro};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.sm};
  background: ${tokens.color.actionBg};
  color: ${tokens.color.accentHover};
  cursor: pointer;
  ${(p) => (p.$door ? `border-style: dashed;` : "")}
  &:hover {
    background: ${tokens.color.actionBgHover};
    color: ${tokens.color.fg};
  }
`;

/** An arm with no way out: nothing drawn, so a lone exit does not look broken. */
const Empty = styled.span``;

const You = styled.span`
  display: grid;
  place-items: center;
  font-size: ${tokens.font.label};
  color: ${tokens.color.fgMuted};
`;

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${tokens.space.xs};
`;

const Fact = styled.div`
  color: ${tokens.color.fg};
`;

const Unknown = styled.span`
  color: ${tokens.color.fgMuted};
  font-style: italic;
`;


export function NavigatorBody({ where, onSendCommand, onCommandPreview }: NavigatorBodyProps): React.ReactElement {
  const preview = onCommandPreview ?? (() => undefined);
  const inZone = new Map(where.exits.filter((e) => !e.crossesZone).map((e) => [e.direction, e]));
  const leaving = where.exits.filter((e) => e.crossesZone);
  const vertical = [...inZone.values()].filter((e) => !ROSE.includes(e.direction));

  const go = (exit: WhereaboutsExit, label: string): React.ReactElement => {
    const command = `go ${exit.direction}`;
    const door = exit.door ? ` — through ${exit.door.name}${exit.door.open ? "" : " (closed)"}` : "";
    return (
      <Arm
        key={exit.direction}
        type="button"
        $door={exit.door !== undefined && !exit.door.open}
        data-testid={`nav-exit-${exit.direction}`}
        title={`${command}${exit.destination ? ` → ${exit.destination}` : ""}${door}`}
        aria-label={command}
        onClick={() => onSendCommand(command)}
        onMouseEnter={() => preview(command)}
        onMouseLeave={() => preview(null)}
      >
        {label}
      </Arm>
    );
  };

  const { weather, season, daylight } = where.conditions;
  // "The Lounge › the lounge" reads as a stutter: a room named for its
  // Locality is shown once.
  const bare = (n: string): string => n.toLowerCase().replace(/^the\s+/, "");
  const last = where.localities[where.localities.length - 1];
  const merged = last !== undefined && bare(last.name) === bare(where.place.name);
  const crumbs = merged ? where.localities.slice(0, -1) : where.localities;
  // When they merge, the Locality's own (proper) name is the one shown.
  const hereName = merged ? last.name : where.place.name;

  return (
    <Root data-testid="navigator">
      <Crumbs aria-label="where you are" data-testid="nav-crumbs">
        {crumbs.map((l) => (
          <React.Fragment key={l.address}>
            <span title={l.address}>{l.name}</span>
            <span aria-hidden="true">›</span>
          </React.Fragment>
        ))}
        {where.structure ? (
          <>
            <span>{where.structure.name}</span>
            <span aria-hidden="true">›</span>
          </>
        ) : null}
        <Here>{hereName}</Here>
      </Crumbs>

      <div>
        <Label>Ways out</Label>
        <Rose data-testid="nav-rose">
          {ROSE.map((dir, i) => {
            if (dir === null) {
              return (
                <You key="you" title={where.coords ? `cell ${where.coords.x}, ${where.coords.y}, ${where.coords.z}` : undefined}>
                  you
                </You>
              );
            }
            const exit = inZone.get(dir);
            return exit ? go(exit, SHORT[dir] ?? dir) : <Empty key={`empty-${i}`} aria-hidden="true" />;
          })}
        </Rose>
        {vertical.length > 0 ? (
          <Row style={{ marginTop: tokens.space.xs }}>
            {vertical.map((e) => go(e, SHORT[e.direction] ?? e.direction))}
          </Row>
        ) : null}
        {leaving.length > 0 ? (
          <div style={{ marginTop: tokens.space.sm }} data-testid="nav-leaving">
            <Label>Leaving this area</Label>
            <Row>
              {leaving.map((e) =>
                go(e, `${SHORT[e.direction] ?? e.direction}${e.destination ? ` → ${e.destination}` : ""}`),
              )}
            </Row>
          </div>
        ) : null}
        {where.exits.length === 0 ? <Unknown>No way out that you can see.</Unknown> : null}
      </div>

      <div data-testid="nav-conditions">
        <Label>Outside</Label>
        <Fact>
          {weather ?? <Unknown>weather unknown</Unknown>}
          {season ? `, ${season}` : null}
          {daylight ? ` — ${daylight}` : null}
        </Fact>
      </div>

      <div data-testid="nav-jurisdiction">
        <Label>Whose ground</Label>
        <Fact>{where.jurisdiction ?? <Unknown>No government claims this ground.</Unknown>}</Fact>
      </div>

    </Root>
  );
}
