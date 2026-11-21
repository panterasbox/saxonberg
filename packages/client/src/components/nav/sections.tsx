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
import { Icon } from "../ui/icons/Icon";
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

/** One fact on one row, led by its icon — the card's one way to show a fact. */
const FactRow = styled.div`
  display: grid;
  grid-template-columns: 14px 4.6rem 1fr;
  align-items: center;
  gap: ${tokens.space.sm};
  min-height: 20px;
  color: ${tokens.color.fg};
`;

const FactLabel = styled.span`
  color: ${tokens.color.fgMuted};
`;

export function Fact({ icon, label, children, testid }: { icon: string; label: string; children: React.ReactNode; testid?: string }): React.ReactElement {
  return (
    <FactRow {...(testid ? { "data-testid": testid } : {})}>
      <Icon name={icon} label={label} size={13} decorative color={tokens.color.fgDim} />
      <FactLabel>{label}</FactLabel>
      <span>{children}</span>
    </FactRow>
  );
}

// ── 3 · the zone ──────────────────────────────────────────────────────

export function zoneSummary(s: NavSections): string | null {
  if (!s.zone) return null;
  const keepers = s.localities?.jurisdiction ?? [];
  return keepers.length > 0 ? keepers[0]!.name : "Unclaimed ground";
}

/** Whose ground this is — one line; the chain above it in its tooltip. */
export function GroundLine({ sections }: { sections: NavSections }): React.ReactElement | null {
  const keepers = sections.localities?.jurisdiction ?? [];
  if (!sections.zone) return null;
  return (
    <Tip
      tip={{
        header: { name: keepers[0]?.name ?? "Unclaimed ground", kindWord: "whose ground" },
        ...(keepers.length > 1 ? { facts: keepers.slice(1).map((k) => ({ label: "and above it", value: k.name, source: "seen" as const })) } : {}),
      }}
    >
      <div data-testid="nav-jurisdiction" tabIndex={0}>
        <Fact icon="place.ground" label="government">
          {keepers[0]?.name ?? "none — unclaimed ground"}
        </Fact>
      </div>
    </Tip>
  );
}

/** Kept for the counts' readers; the card no longer shows a zone section. */
export function ZoneBody({ view }: { sections: NavSections; view: ZoneView | null }): React.ReactElement {
  return <div data-testid="nav-zone">{view ? `${view.counts.walked} walked` : null}</div>;
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
  if (p?.dark) return "Dark";
  const light = p?.light ?? "lit";
  return light.charAt(0).toUpperCase() + light.slice(1);
}

/**
 * ⭐ Every row, in every place, always (owner, review): a newcomer has no
 * baseline, so hiding the "ordinary" value hides the vocabulary. A row the
 * server leaves out does not apply here, and says so in words.
 */
export function PlaceBody({
  sections,
  known,
}: {
  sections: NavSections;
  known?: ViewPlace;
}): React.ReactElement {
  const p = sections.place!;
  const light = p.dark ? "dark — you cannot see" : (p.light ?? "unknown");
  const overhead =
    p.openSky === undefined ? "unknown" : p.openSky ? "open sky" : "a roof";
  const ceiling =
    p.lowCeiling === undefined ? "unknown" : p.lowCeiling ? "low — you must stoop" : "clear";
  const crowd = p.crowd ?? 0;
  return (
    <div data-testid="nav-place-section">
      <Fact icon={p.dark ? "place.dark" : "place.lit"} label="light">{light}</Fact>
      <Fact icon={p.openSky ? "place.sky" : "place.roof"} label="overhead">{overhead}</Fact>
      <Fact icon="place.roof" label="ceiling">{ceiling}</Fact>
      <Fact icon="place.weather" label="weather">{p.weather ?? "unknown"}</Fact>
      <Fact icon="place.season" label="season">{p.season ?? "unknown"}</Fact>
      <Fact icon="place.time" label="time">{p.daylight ?? "unknown"}</Fact>
      <Fact icon="place.water" label="water">{p.water ?? "none"}</Fact>
      <Fact icon="place.crowd" label="others">
        {crowd === 0 ? "nobody else here" : `${crowd} other${crowd === 1 ? "" : "s"} here`}
      </Fact>
      <Fact icon="place.elevation" label="height">
        {p.elevationM === undefined ? "unknown" : `${Math.round(p.elevationM)} m above the sea`}
      </Fact>
      <Fact icon="nav.room" label="your map" testid="nav-place-known">
        {known ? "on your map" : "not on your map"}
      </Fact>
    </div>
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

/** Every row, always — the same rule as the place (see PlaceBody). */
export function YouBody({ sections }: { sections: NavSections }): React.ReactElement {
  const y = sections.you!;
  const hands =
    y.hands && y.hands.length > 0
      ? y.hands.map((h) => `${h.slot}: ${h.holds ?? "empty"}`).join(", ")
      : y.freeHands !== undefined
        ? `${y.freeHands} free`
        : "unknown";
  return (
    <div data-testid="nav-you">
      <Fact icon="mode.walk" label="pace">{y.pace ?? "unknown"}</Fact>
      <Fact icon="you.posture" label="posture">{y.posture ?? "unknown"}</Fact>
      <Fact icon="you.hands" label="hands">{hands}</Fact>
      <Fact icon="you.load" label="load">{y.load ?? "unknown"}</Fact>
      <Fact icon="you.light" label="your light">{y.light ?? "none"}</Fact>
      <Fact icon="mode.walk" label="riding">{y.mount ?? "nothing"}</Fact>
      <Fact icon="you.lead" label="leading">{y.led && y.led.length > 0 ? y.led.join(", ") : "nobody"}</Fact>
      <Fact icon="you.cart" label="pulling">{y.cart ?? "nothing"}</Fact>
      <Fact icon="you.held" label="held back">{y.bars && y.bars.length > 0 ? y.bars.join(" ") : "no"}</Fact>
      <Fact icon="you.fighting" label="fighting">
        {y.fighting
          ? `${y.fighting.foes} foe${y.fighting.foes === 1 ? "" : "s"}${y.fighting.breakaway ? ` — ${y.fighting.breakaway}` : ""}`
          : "no"}
      </Fact>
    </div>
  );
}
