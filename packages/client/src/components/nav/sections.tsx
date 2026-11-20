/**
 * The navigation card's sections, widest to narrowest (D7): each is a
 * summary line and a body, built from the where-you-are sections and the
 * views over your map. A section with nothing to say is ABSENT, never an
 * empty box; a fact the server did not send is not shown.
 */

import React from "react";
import styled from "styled-components";
import type { NavSections } from "@saxonberg/types";
import { tokens } from "../ui";
import { Tip } from "../tooltip/Tip";
import { sightingDoc } from "../doc/docs";
import type { ViewPlace, ZoneView } from "../../store/navSelectors";

export const Rows = styled.dl`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 2px ${tokens.space.sm};
  margin: 0;
  dt {
    color: ${tokens.color.fgMuted};
  }
  dd {
    margin: 0;
    min-width: 0;
    overflow-wrap: anywhere;
  }
`;

const Link = styled.button`
  font: inherit;
  padding: 0;
  border: none;
  background: none;
  color: ${tokens.color.accent};
  cursor: pointer;
  text-decoration: underline dotted;
  text-underline-offset: 2px;
`;

/** The channel a fact came from, in words. */
export const CHANNEL_WORDS: Record<string, string> = {
  walked: "walked",
  seen: "seen",
  searched: "found by searching",
  published: "from a published map",
  charted: "from a chart",
  told: "told",
};

// ── 3 · the zone ──────────────────────────────────────────────────────

export function zoneSummary(s: NavSections): string | null {
  if (!s.zone) return null;
  const at = s.place?.at;
  const coords = at ? ` · x: ${at.x} y: ${at.y} z: ${at.z}` : "";
  return `${s.zone.label ?? "This zone"}${coords}`;
}

export function ZoneBody({ sections, view }: { sections: NavSections; view: ZoneView | null }): React.ReactElement {
  const zone = sections.zone!;
  const at = sections.place?.at;
  const keepers = sections.localities?.jurisdiction ?? [];
  const levels = view?.levels ?? [];
  return (
    <Rows data-testid="nav-zone">
      {zone.label ? (
        <>
          <dt>zone</dt>
          <dd>{zone.label}</dd>
        </>
      ) : null}
      {at ? (
        <>
          <dt>you</dt>
          <dd data-testid="nav-coords">
            x: {at.x} y: {at.y} <strong>z: {at.z}</strong>
          </dd>
        </>
      ) : null}
      <dt>who keeps it</dt>
      <dd data-testid="nav-jurisdiction">
        {keepers.length > 0 ? keepers.map((k) => k.name).join(", then ") : "No government claims this ground."}
      </dd>
      {zone.cellSizeM ? (
        <>
          <dt>a cell</dt>
          <dd>{zone.cellSizeM} m</dd>
        </>
      ) : null}
      {view && view.places.length > 0 ? (
        <>
          <dt>you know</dt>
          <dd data-testid="nav-zone-counts">
            {view.counts.walked} walked, {view.counts.known} known, {view.counts.openings} way{view.counts.openings === 1 ? "" : "s"} not taken
          </dd>
          <dt>levels known</dt>
          <dd>{levels.length}</dd>
        </>
      ) : null}
    </Rows>
  );
}

// ── 4 · the horizon ───────────────────────────────────────────────────

export function horizonSummary(s: NavSections): string | null {
  const h = s.horizon;
  if (!h || (h.things.length === 0 && h.traffic === 0)) return null;
  const first = h.things[0];
  const parts = ["Horizon"];
  if (first) parts.push(`${first.name}${glanceWords(first.glance)}`);
  if (h.things.length > 1) parts.push(`${h.things.length - 1} more`);
  if (h.traffic > 0) parts.push(`${h.traffic} sail${h.traffic === 1 ? "" : "s"}`);
  return parts.join(" · ");
}

export function glanceWords(g?: { point?: string; closeBy?: boolean; roughMiles?: number }): string {
  if (!g) return "";
  if (g.closeBy) return " close by";
  return `${g.point ? ` ${g.point}` : ""}${g.roughMiles !== undefined ? ` ${g.roughMiles} mi` : ""}`;
}

export function HorizonBody({
  sections,
  onLook,
  lookFor,
  onPreview,
}: {
  sections: NavSections;
  onLook: (stuffId: string) => void;
  lookFor: (stuffId: string) => string;
  onPreview?: (command: string | null) => void;
}): React.ReactElement {
  const h = sections.horizon!;
  return (
    <div data-testid="nav-horizon">
      {h.things.map((t) => (
        <div key={t.stuffId} data-testid="nav-sighting">
          <Tip tip={sightingDoc(t, lookFor(t.stuffId))}>
            <Link
              type="button"
              onClick={() => onLook(t.stuffId)}
              onMouseEnter={() => onPreview?.(lookFor(t.stuffId))}
              onMouseLeave={() => onPreview?.(null)}
            >
              {t.name}
            </Link>
          </Tip>
          {glanceWords(t.glance)}
        </div>
      ))}
      {h.traffic > 0 ? <div>{h.traffic} sail{h.traffic === 1 ? "" : "s"} in sight</div> : null}
    </div>
  );
}

// ── 5 · the structure ─────────────────────────────────────────────────

export function structureSummary(s: NavSections): string | null {
  const b = s.building;
  const aboard = s.localities?.ship;
  if (!b && !aboard) return null;
  if (b?.name) {
    const storey = b.storey !== undefined && b.storeys ? ` · floor ${b.storey + 1} of ${b.storeys}` : "";
    return `${b.name}${storey}`;
  }
  if (aboard) return aboard.name;
  // Outside: what stands here, by name — never a placeholder.
  const landed = b?.landed?.map((l) => l.name) ?? [];
  if (landed.length === 0) return null;
  return `Standing here: ${landed.join(", ")}`;
}

export function StructureBody({
  sections,
  onLook,
  lookFor,
  onPreview,
}: {
  sections: NavSections;
  onLook: (name: string) => void;
  lookFor?: (name: string) => string;
  onPreview?: (command: string | null) => void;
}): React.ReactElement {
  const b = sections.building ?? undefined;
  const outer = sections.localities?.outer;
  return (
    <Rows data-testid="nav-structure">
      {b?.name ? (
        <>
          <dt>you are in</dt>
          <dd>
            <Link
              type="button"
              onClick={() => onLook(b.name!)}
              onMouseEnter={() => onPreview?.(lookFor?.(b.name!) ?? null)}
              onMouseLeave={() => onPreview?.(null)}
            >
              {b.name}
            </Link>
            {b.landmark ? " (a landmark)" : ""}
          </dd>
        </>
      ) : null}
      {b?.storey !== undefined && b.storeys ? (
        <>
          <dt>floor</dt>
          <dd data-testid="nav-storey">
            {b.storey + 1} of {b.storeys}
          </dd>
        </>
      ) : null}
      {b?.heightM ? (
        <>
          <dt>height</dt>
          <dd>{b.heightM} m</dd>
        </>
      ) : null}
      {b?.entrance && "here" in b.entrance ? (
        <>
          <dt>way out</dt>
          <dd>here</dd>
        </>
      ) : null}
      {b?.landed && b.landed.length > 0 ? (
        <>
          <dt>standing here</dt>
          <dd>{b.landed.map((l) => l.name).join(", ")}</dd>
        </>
      ) : null}
      {outer ? (
        <>
          <dt>she lies</dt>
          <dd data-testid="nav-lie">
            {outer.at === "berth"
              ? `made fast${outer.landing ? ` at ${outer.landing}` : ""}`
              : outer.at === "river"
                ? `on the ${outer.river} at km ${outer.km}`
                : "at sea"}
          </dd>
        </>
      ) : null}
    </Rows>
  );
}

// ── 7 · the place ─────────────────────────────────────────────────────

export function placeSummary(s: NavSections): string {
  const p = s.place;
  // Only what is true of the place right now — whether it is on your map
  // is the map's to show, and "not walked" of the room you stand in read
  // as a contradiction.
  return `Place · ${p?.dark ? "dark" : (p?.light ?? "—")}`;
}

export function PlaceBody({
  sections,
  known,
  onLook,
  onPreview,
}: {
  sections: NavSections;
  known?: ViewPlace;
  onLook: () => void;
  onPreview?: (command: string | null) => void;
}): React.ReactElement {
  const p = sections.place!;
  return (
    <Rows data-testid="nav-place-section">
      <dt>light</dt>
      <dd>{p.dark ? "dark" : (p.light ?? "—")}</dd>
      {p.openSky !== undefined ? (
        <>
          <dt>above</dt>
          <dd>{p.openSky ? "open sky" : "a roof"}</dd>
        </>
      ) : null}
      {p.water ? (
        <>
          <dt>water</dt>
          <dd>{p.water}</dd>
        </>
      ) : null}
      {p.crowd !== undefined ? (
        <>
          <dt>others here</dt>
          <dd>{p.crowd}</dd>
        </>
      ) : null}
      {p.lowCeiling ? (
        <>
          <dt>ceiling</dt>
          <dd>low</dd>
        </>
      ) : null}
      {p.elevationM !== undefined ? (
        <>
          <dt>elevation</dt>
          <dd>{Math.round(p.elevationM)} m above the sea</dd>
        </>
      ) : null}
      <dt>on your map</dt>
      <dd data-testid="nav-place-known">
        {known
          ? [...new Set(known.sources.map((src) => CHANNEL_WORDS[src.channel] ?? src.channel))].join(", ")
          : p.dark
            ? "not yet — too dark to note it"
            : "not yet"}
      </dd>
      <dt />
      <dd>
        <Link
          type="button"
          data-testid="nav-place-look"
          onClick={onLook}
          onMouseEnter={() => onPreview?.("look")}
          onMouseLeave={() => onPreview?.(null)}
        >
          look around
        </Link>
      </dd>
    </Rows>
  );
}

// ── 8 · you ───────────────────────────────────────────────────────────

export function youSummary(s: NavSections): string | null {
  const y = s.you;
  if (!y) return null;
  const parts = ["You"];
  if (y.pace) parts.push(y.pace === "walk" ? "walking" : y.pace);
  if (y.load) parts.push(y.load);
  if (y.light) parts.push(y.light);
  if (y.fighting) parts.push("fighting");
  return parts.join(" · ");
}

export function YouBody({ sections }: { sections: NavSections }): React.ReactElement {
  const y = sections.you!;
  return (
    <Rows data-testid="nav-you">
      {y.pace ? (
        <>
          <dt>pace</dt>
          <dd>{y.pace}</dd>
        </>
      ) : null}
      {y.posture ? (
        <>
          <dt>posture</dt>
          <dd>{y.posture}</dd>
        </>
      ) : null}
      {y.load ? (
        <>
          <dt>load</dt>
          <dd>{y.load}</dd>
        </>
      ) : null}
      {y.light ? (
        <>
          <dt>light</dt>
          <dd>{y.light}</dd>
        </>
      ) : null}
      {y.mount ? (
        <>
          <dt>riding</dt>
          <dd>{y.mount}</dd>
        </>
      ) : null}
      {y.bars && y.bars.length > 0 ? (
        <>
          <dt>held back</dt>
          <dd>{y.bars.join(" ")}</dd>
        </>
      ) : null}
      {y.fighting ? (
        <>
          <dt>fighting</dt>
          <dd>
            {y.fighting.foes} foe{y.fighting.foes === 1 ? "" : "s"}
            {y.fighting.breakaway ? ` — ${y.fighting.breakaway}` : ""}
          </dd>
        </>
      ) : null}
    </Rows>
  );
}
