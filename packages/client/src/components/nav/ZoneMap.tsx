/**
 * ZoneMap — draws a `ZoneView` (navigation card D1).
 *
 * ⭐ One renderer, one `<svg>`, no data reads inside it: everything it
 * draws arrives as props, from the views over YOUR map (`navSelectors`).
 * It never asks what a place IS — it draws by claim kind and position.
 *
 * - The `viewBox` is in cell units, y flipped (north is +y in the world,
 *   down in SVG). Strokes do not scale.
 * - Layers, bottom to top, each a `<g data-layer>` so a lens is an overlay
 *   and never a second renderer. Places sit above the ways (edges and
 *   stubs), so a way's hit band never takes a place's click.
 * - ⛔ No SVG title element anywhere (the no-native-title gate): every mark is a
 *   focusable `<g role="button">` with an `aria-label`, wrapped in a
 *   `<Tip>` when the caller gives it a document.
 * - The thumbnail (a tooltip's `zoneThumb`) is this same component at
 *   *whole zone*, with no handlers.
 *
 * Zoom is by HOPS from where you stand, never a fixed window (D4).
 */

import React from "react";
import type { TooltipDoc, WireRoutePlan } from "@saxonberg/types";
import { tokens } from "../ui";
import { Tip } from "../tooltip/Tip";
import {
  DIRECTION_VECTORS,
  longDirection,
  type ViewEdge,
  type ViewPlace,
  type ZoneView,
} from "../../store/navSelectors";

export type Zoom = "whole" | "nearby" | "close";
export const ZOOMS: readonly Zoom[] = ["whole", "nearby", "close"];
export type LensName = "frontier" | "route" | "refusals" | "boundaries";
export const LENSES: readonly LensName[] = ["frontier", "route", "refusals", "boundaries"];

/** A border the boundaries lens draws: a cell side, or a stub. */
export interface BoundarySide {
  x: number;
  y: number;
  /** The side of the cell (`north` · `east` · …). */
  side: string;
}

export interface ZoneMapProps {
  view: ZoneView;
  /** Where you stand, when it is in this zone. */
  here?: { x: number; y: number; level: number };
  /** The level shown. */
  level: number;
  zoom?: Zoom;
  thumbnail?: boolean;
  lenses?: ReadonlySet<LensName>;
  route?: readonly WireRoutePlan[];
  boundaries?: readonly BoundarySide[];
  /** The rendered width in px, to decide what is too small to draw. */
  pxWidth?: number;
  onPlaceClick?: (place: ViewPlace) => void;
  onEdgeClick?: (edge: ViewEdge) => void;
  onPreview?: (command: string | null) => void;
  commandFor?: (mark: { place?: ViewPlace; edge?: ViewEdge }) => string | null;
  tipFor?: (mark: { place?: ViewPlace; edge?: ViewEdge; lens?: LensName; leg?: number }) => TooltipDoc | null;
  /**
   * The box shown, in world cells (north up) — the map-app camera. When
   * given it wins over `zoom`: the caller pans and zooms continuously.
   */
  box?: { minX: number; maxX: number; minY: number; maxY: number };
  /**
   * The ways from where you stand that the ways section says leave this
   * zone: drawn as leaving, never as a `?` — a look does not record that a
   * way crosses into another zone, but standing at it you can see it does.
   */
  leavesFrom?: { place: string; dirs: ReadonlySet<string> };
  /** Horizon sightings: a tick at the map's edge in their rough direction. */
  ticks?: readonly { id: string; point: string; name: string; doc?: TooltipDoc; onClick?: () => void }[];
}

/** Half a place mark, in cells. */
const HALF = 0.4;

const STATE_COLOR: Record<string, string> = {
  open: tokens.color.fg,
  shut: tokens.color.fgEmphasis,
  locked: tokens.color.danger,
  window: tokens.color.info,
};

/** Places within `hops` edges of `from`, on one level (D4). */
function withinHops(view: ZoneView, from: string, hops: number): Set<string> {
  const adj = new Map<string, string[]>();
  for (const e of view.edges) {
    if (!e.to || (e.shape !== "link" && e.shape !== "track" && e.shape !== "vertical")) continue;
    adj.set(e.from, [...(adj.get(e.from) ?? []), e.to]);
    adj.set(e.to, [...(adj.get(e.to) ?? []), e.from]);
  }
  const seen = new Set([from]);
  let frontier = [from];
  for (let h = 0; h < hops; h++) {
    const next: string[] = [];
    for (const k of frontier) {
      for (const n of adj.get(k) ?? []) {
        if (!seen.has(n)) {
          seen.add(n);
          next.push(n);
        }
      }
    }
    frontier = next;
  }
  return seen;
}

/** The box shown, in cell units (x, world y). */
export function viewBoxFor(
  view: ZoneView,
  level: number,
  zoom: Zoom,
  here?: { x: number; y: number; level: number },
): { minX: number; maxX: number; minY: number; maxY: number } {
  const onLevel = view.places.filter((p) => p.level === level);
  let pts = onLevel.map((p) => [p.x, p.y] as const);
  let min = 1;
  if (zoom !== "whole" && here && here.level === level) {
    const herePlace = onLevel.find((p) => p.x === here.x && p.y === here.y);
    const hops = zoom === "nearby" ? 2 : 1;
    min = zoom === "nearby" ? 5 : 3;
    if (herePlace) {
      const near = withinHops(view, herePlace.key, hops);
      pts = onLevel.filter((p) => near.has(p.key)).map((p) => [p.x, p.y] as const);
    } else {
      pts = [[here.x, here.y]];
    }
  }
  if (here && here.level === level) pts = [...pts, [here.x, here.y]];
  if (pts.length === 0) pts = [[0, 0]];
  let minX = Math.min(...pts.map((p) => p[0]));
  let maxX = Math.max(...pts.map((p) => p[0]));
  let minY = Math.min(...pts.map((p) => p[1]));
  let maxY = Math.max(...pts.map((p) => p[1]));
  const grow = (lo: number, hi: number): [number, number] => {
    const span = hi - lo + 1;
    if (span >= min) return [lo, hi];
    const add = (min - span) / 2;
    return [lo - add, hi + add];
  };
  [minX, maxX] = grow(minX, maxX);
  [minY, maxY] = grow(minY, maxY);
  return { minX, maxX, minY, maxY };
}

/**
 * A transparent band along a segment — the edge's hit area. ⚠ A straight
 * north–south or east–west line has a zero-width box: a person can barely
 * click it and a browser test reads it as not visible at all.
 */
function hitBand(x1: number, y1: number, x2: number, y2: number, w = 0.14): React.ReactElement {
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const nx = (-(y2 - y1) / len) * w;
  const ny = ((x2 - x1) / len) * w;
  return (
    <polygon
      points={`${x1 + nx},${y1 + ny} ${x2 + nx},${y2 + ny} ${x2 - nx},${y2 - ny} ${x1 - nx},${y1 - ny}`}
      fill="transparent"
      stroke="none"
      pointerEvents="all"
    />
  );
}

const sx = (x: number): number => x;
const sy = (y: number): number => -y;

export function ZoneMap(props: ZoneMapProps): React.ReactElement {
  const {
    view,
    here,
    level,
    zoom = "whole",
    thumbnail = false,
    lenses = new Set<LensName>(),
    route = [],
    boundaries = [],
    pxWidth = thumbnail ? 96 : 320,
  } = props;
  const fitted = viewBoxFor(view, level, thumbnail ? "whole" : zoom, here);
  const margin = props.box && !thumbnail ? 0 : 0.9;
  const box = props.box && !thumbnail ? props.box : fitted;
  const vbX = box.minX - margin;
  const vbY = -box.maxY - margin;
  const vbW = box.maxX - box.minX + 2 * margin;
  const vbH = box.maxY - box.minY + 2 * margin;
  // A mark is never smaller on screen than about 1/24 of the view (a
  // sparse zone still reads at *whole zone*).
  // A mark is never smaller on screen than about 1/24 of the view — but
  // never more than a cell, so one place alone is not a giant square.
  const half = Math.min(HALF * 1.25, Math.max(HALF, vbW / 48));
  const cellPx = pxWidth / vbW;
  const smallCells = cellPx < 10;

  const places = view.places.filter((p) => p.level === level);
  const placeAtKey = new Map(view.places.map((p) => [p.key, p]));
  const edges = view.edges.filter((e) => placeAtKey.get(e.from)?.level === level);

  const interactive = !thumbnail;
  const marks = React.useRef<(SVGGElement | null)[]>([]);
  marks.current = [];

  const markProps = (
    label: string,
    command: string | null,
    onClick?: () => void,
  ): React.SVGProps<SVGGElement> =>
    interactive
      ? {
          role: "button",
          "aria-label": label,
          tabIndex: -1,
          style: { cursor: onClick ? "pointer" : "default", outline: "none" },
          onClick: onClick ? () => onClick() : undefined,
          onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === "Enter" && onClick) {
              e.preventDefault();
              onClick();
            }
          },
          onMouseEnter: () => props.onPreview?.(command),
          onMouseLeave: () => props.onPreview?.(null),
          ref: (el: SVGGElement | null) => {
            if (el) marks.current.push(el);
          },
        }
      : { "aria-hidden": true };

  const wrap = (doc: TooltipDoc | null | undefined, el: React.ReactElement, key: string): React.ReactElement =>
    interactive && doc ? (
      <Tip key={key} tip={doc}>
        {el}
      </Tip>
    ) : (
      <React.Fragment key={key}>{el}</React.Fragment>
    );

  // ── edges ─────────────────────────────────────────────────────────────
  const edgeEls: React.ReactElement[] = [];
  const stubEls: React.ReactElement[] = [];
  const glyphEls: React.ReactElement[] = [];
  const frontierEls: React.ReactElement[] = [];
  const refusalEls: React.ReactElement[] = [];
  const namedCount = new Map<string, number>();

  for (const raw of edges) {
    const e: ViewEdge =
      raw.shape === "opening" && props.leavesFrom?.place === raw.from && props.leavesFrom.dirs.has(raw.dir)
        ? { ...raw, shape: "leaves" }
        : raw;
    const from = placeAtKey.get(e.from)!;
    const far = e.to ? placeAtKey.get(e.to) : undefined;
    const color = STATE_COLOR[e.state ?? "open"] ?? tokens.color.fg;
    const vec = DIRECTION_VECTORS[e.dir];
    const off = e.variant * 0.14;
    const dash = e.stale ? "2 3" : e.shape === "track" ? "6 4" : undefined;
    const command = props.commandFor?.({ edge: e }) ?? null;
    const click = props.onEdgeClick ? () => props.onEdgeClick!(e) : undefined;
    const common = {
      "data-testid": "nav-edge",
      "data-shape": e.shape,
      "data-dir": e.dir,
      "data-state": e.state ?? "open",
      "data-stale": e.stale ? "true" : undefined,
      "data-found": e.foundBySearching ? "searched" : undefined,
      "data-conflict": e.conflict ? "true" : undefined,
    };
    const label = `${e.dir} from ${from.name}`;
    const doc = props.tipFor?.({ edge: e });

    if ((e.shape === "link" || e.shape === "track") && far) {
      const dx = far.x - from.x;
      const dy = far.y - from.y;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      // Orthogonal: edge to edge; diagonal: corner to corner (the unit
      // vector scaled to reach the corner of a square mark).
      const reach = Math.abs(ux) > 0.01 && Math.abs(uy) > 0.01 ? half * Math.SQRT2 : half;
      const x1 = sx(from.x + ux * reach) + off;
      const y1 = sy(from.y + uy * reach) + off;
      const x2 = sx(far.x - ux * reach) + off;
      const y2 = sy(far.y - uy * reach) + off;
      const diagonal = Math.abs(ux) > 0.01 && Math.abs(uy) > 0.01;
      edgeEls.push(
        wrap(
          doc,
          <g {...common} {...markProps(label, command, click)}>
            {diagonal ? (
              // The casing: where two diagonals cross, the later one reads
              // as passing over.
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={tokens.color.surface} strokeWidth={6} vectorEffect="non-scaling-stroke" />
            ) : null}
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={2} strokeDasharray={dash} vectorEffect="non-scaling-stroke" />
            {hitBand(x1, y1, x2, y2)}
            {e.conflict ? <circle cx={(x1 + x2) / 2} cy={(y1 + y2) / 2} r={0.08} fill={tokens.color.warning} data-testid="nav-conflict" /> : null}
          </g>,
          e.id,
        ),
      );
      if (lenses.has("refusals") && (e.state === "locked" || e.state === "shut")) {
        refusalEls.push(
          <circle key={`r${e.id}`} data-testid="nav-refusal" cx={(x1 + x2) / 2} cy={(y1 + y2) / 2} r={0.16} fill="none" stroke={tokens.color.danger} strokeWidth={2} vectorEffect="non-scaling-stroke" />,
        );
      }
      continue;
    }

    if (e.shape === "vertical") {
      if (smallCells) continue;
      const up = e.dir === "up";
      const cx = sx(from.x) + half * 0.62;
      const cy = sy(from.y) + (up ? -half * 0.62 : half * 0.62);
      const s = half * 0.32;
      const pts = up
        ? `${cx - s},${cy + s * 0.6} ${cx + s},${cy + s * 0.6} ${cx},${cy - s * 0.8}`
        : `${cx - s},${cy - s * 0.6} ${cx + s},${cy - s * 0.6} ${cx},${cy + s * 0.8}`;
      glyphEls.push(
        wrap(
          doc,
          <g {...common} {...markProps(label, command, click)}>
            <polygon points={pts} fill={e.farKnown ? color : "none"} stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
          </g>,
          e.id,
        ),
      );
      if (lenses.has("frontier") && !e.farKnown) {
        frontierEls.push(
          <text key={`f${e.id}`} data-testid="nav-frontier" x={cx + s} y={cy} fontSize={half * 0.5} fill={tokens.color.fgMuted}>
            ?
          </text>,
        );
      }
      continue;
    }

    if (e.shape === "named" || (!vec && e.shape === "leaves")) {
      const n = namedCount.get(e.from) ?? 0;
      namedCount.set(e.from, n + 1);
      const w = half * 0.36;
      const x = sx(from.x) - half + w * 0.4 + n * w * 1.3;
      const y = sy(from.y) + half;
      stubEls.push(
        wrap(
          doc,
          <g {...common} {...markProps(label, command, click)}>
            <rect x={x} y={y} width={w} height={w * 0.7} fill={e.shape === "leaves" ? tokens.color.surface : color} stroke={color} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
          </g>,
          e.id,
        ),
      );
      continue;
    }

    // An opening, or a way to a place your map has in another zone: a
    // half-cell stub in its direction.
    if (vec) {
      const len = Math.hypot(vec[0], vec[1]) || 1;
      const ux = vec[0] / len;
      const uy = vec[1] / len;
      const reach = Math.abs(ux) > 0.01 && Math.abs(uy) > 0.01 ? half * Math.SQRT2 : half;
      const x1 = sx(from.x + ux * reach) + off;
      const y1 = sy(from.y + uy * reach) + off;
      const x2 = sx(from.x + ux * (reach + 0.5)) + off;
      const y2 = sy(from.y + uy * (reach + 0.5)) + off;
      stubEls.push(
        wrap(
          doc,
          <g {...common} {...markProps(label, command, click)}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={2} strokeDasharray={dash} vectorEffect="non-scaling-stroke" />
            {hitBand(x1, y1, x2, y2)}
            {e.shape === "leaves" ? (
              <polyline
                data-testid="nav-leaves"
                points={`${x2 - uy * 0.12 - ux * 0.12},${y2 - ux * 0.12 + uy * 0.12} ${x2},${y2} ${x2 + uy * 0.12 - ux * 0.12},${y2 + ux * 0.12 + uy * 0.12}`}
                fill="none"
                stroke={color}
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
          </g>,
          e.id,
        ),
      );
      if (e.shape === "opening" && lenses.has("frontier")) {
        frontierEls.push(
          <text key={`f${e.id}`} data-testid="nav-frontier" x={x2 + ux * 0.08} y={y2 - uy * 0.08 + 0.1} fontSize={0.3} textAnchor="middle" fill={tokens.color.fgMuted}>
            ?
          </text>,
        );
      }
      if (lenses.has("refusals") && (e.state === "locked" || e.state === "shut")) {
        refusalEls.push(
          <circle key={`r${e.id}`} data-testid="nav-refusal" cx={(x1 + x2) / 2} cy={(y1 + y2) / 2} r={0.14} fill="none" stroke={tokens.color.danger} strokeWidth={2} vectorEffect="non-scaling-stroke" />,
        );
      }
    }
  }

  // ── places ────────────────────────────────────────────────────────────
  const placeEls = places.map((p) => {
    const command = props.commandFor?.({ place: p }) ?? null;
    const click = props.onPlaceClick ? () => props.onPlaceClick!(p) : undefined;
    const walked = p.tier === "walked";
    return wrap(
      props.tipFor?.({ place: p }),
      <g
        data-testid="nav-place"
        data-tier={p.tier}
        data-place-name={p.name}
        {...markProps(p.name, command, click)}
      >
        <rect
          x={sx(p.x) - half}
          y={sy(p.y) - half}
          width={half * 2}
          height={half * 2}
          rx={half * 0.25}
          fill={walked ? tokens.color.borderEmphasis : "none"}
          stroke={walked ? tokens.color.fgDim : tokens.color.fgMuted}
          strokeWidth={walked ? 1 : 1.5}
          strokeDasharray={walked ? undefined : "3 2"}
          vectorEffect="non-scaling-stroke"
        />
        {(cellPx >= 44 || zoom === "close") && !thumbnail ? (
          <text x={sx(p.x)} y={sy(p.y) + half + 0.28} fontSize={0.22} textAnchor="middle" fill={tokens.color.fg}>
            {p.name}
          </text>
        ) : null}
      </g>,
      `p${p.key}`,
    );
  });

  // ── the route ─────────────────────────────────────────────────────────
  const routeEls: React.ReactElement[] = [];
  if (lenses.has("route")) {
    route.slice(0, 2).forEach((plan, pi) => {
      plan.legs.forEach((leg, li) => {
        const a = placeAtKey.get(leg.from.path);
        const b = placeAtKey.get(leg.to.path);
        if (!a || !b || a.level !== level || b.level !== level) return;
        const least = li === plan.leastCertain;
        const midX = (sx(a.x) + sx(b.x)) / 2;
        const midY = (sy(a.y) + sy(b.y)) / 2;
        routeEls.push(
          <g key={`route${pi}-${li}`} data-testid="nav-route-leg" data-plan={pi} data-least={least ? "true" : undefined}>
            <line
              x1={sx(a.x)}
              y1={sy(a.y)}
              x2={sx(b.x)}
              y2={sy(b.y)}
              stroke={tokens.color.accent}
              strokeWidth={pi === 0 ? 4 : 3}
              strokeOpacity={0.75}
              strokeDasharray={pi === 0 ? undefined : "4 3"}
              vectorEffect="non-scaling-stroke"
            />
            {hitBand(sx(a.x), sy(a.y), sx(b.x), sy(b.y), 0.08)}
          </g>,
        );
        if (least) {
          routeEls.push(
            wrap(
              props.tipFor?.({ lens: "route", leg: li }),
              <g data-testid="nav-route-uncertain" {...markProps("the least certain leg", null)}>
                <circle cx={midX} cy={midY} r={0.17} fill={tokens.color.surface} stroke={tokens.color.warning} strokeWidth={2} vectorEffect="non-scaling-stroke" />
                <text x={midX} y={midY + 0.08} fontSize={0.22} textAnchor="middle" fill={tokens.color.warning}>
                  ?
                </text>
              </g>,
              `routeq${pi}-${li}`,
            ),
          );
        }
      });
    });
  }

  // ── boundaries ────────────────────────────────────────────────────────
  const boundaryEls = lenses.has("boundaries")
    ? boundaries.map((b, i) => {
        const v = DIRECTION_VECTORS[b.side] ?? [0, 0, 0];
        const cx = sx(b.x) + v[0] * 0.5;
        const cy = sy(b.y) - v[1] * 0.5;
        const horizontal = v[1] !== 0;
        return (
          <line
            key={`b${i}`}
            data-testid="nav-boundary"
            x1={horizontal ? cx - 0.5 : cx}
            y1={horizontal ? cy : cy - 0.5}
            x2={horizontal ? cx + 0.5 : cx}
            y2={horizontal ? cy : cy + 0.5}
            stroke={tokens.palette.violet}
            strokeWidth={3}
            strokeDasharray="1 3"
            vectorEffect="non-scaling-stroke"
          />
        );
      })
    : [];

  // ── the horizon's ticks ───────────────────────────────────────────────
  const tickEls = (props.ticks ?? []).flatMap((t) => {
    // `query horizon` says "to the east"; the vector wants the bare word.
    const v = DIRECTION_VECTORS[longDirection(t.point.replace(/^to the\s+/i, "").trim())];
    if (!v || (v[0] === 0 && v[1] === 0)) return [];
    const cx = vbX + vbW / 2;
    const cy = vbY + vbH / 2;
    const len = Math.hypot(v[0], v[1]);
    const ux = v[0] / len;
    const uy = -v[1] / len;
    // To the box's edge along the bearing.
    const k = Math.min(Math.abs(ux) > 1e-6 ? (vbW / 2) / Math.abs(ux) : Infinity, Math.abs(uy) > 1e-6 ? (vbH / 2) / Math.abs(uy) : Infinity);
    const ex = cx + ux * k * 0.97;
    const ey = cy + uy * k * 0.97;
    return [
      wrap(
        t.doc,
        <g data-testid="nav-tick" {...markProps(t.name, null, t.onClick)}>
          <line x1={ex - ux * 0.35} y1={ey - uy * 0.35} x2={ex} y2={ey} stroke={tokens.color.fgEmphasis} strokeWidth={3} vectorEffect="non-scaling-stroke" />
        </g>,
        `tick${t.id}`,
      ),
    ];
  });

  // ── you ───────────────────────────────────────────────────────────────
  const hereEl =
    here && here.level === level ? (
      <g data-testid="nav-here" aria-hidden="true">
        <circle cx={sx(here.x)} cy={sy(here.y)} r={half * 0.45} fill={tokens.color.accent} stroke={tokens.color.surface} strokeWidth={2} vectorEffect="non-scaling-stroke" />
      </g>
    ) : null;

  // ⭐ One tab stop for the whole map; the arrow keys move among marks.
  const onKeyDown = (e: React.KeyboardEvent<SVGSVGElement>): void => {
    if (!interactive) return;
    const list = marks.current.filter(Boolean) as SVGGElement[];
    if (list.length === 0) return;
    const at = list.indexOf(document.activeElement as SVGGElement);
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = at < 0 ? 0 : (at + 1) % list.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = at <= 0 ? list.length - 1 : at - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = list.length - 1;
    if (next >= 0) {
      e.preventDefault();
      list[next]!.focus();
    }
  };

  return (
    <svg
      data-testid={thumbnail ? "nav-thumb" : "nav-map"}
      data-zoom={thumbnail ? "whole" : zoom}
      data-level={level}
      role={interactive ? "group" : "img"}
      aria-label={interactive ? "Map of the zone, as you know it" : "A small map of a zone you know"}
      viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
      preserveAspectRatio="xMidYMid meet"
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={onKeyDown}
      style={{
        width: thumbnail ? 96 : "100%",
        height: thumbnail ? 96 : undefined,
        aspectRatio: thumbnail ? undefined : "4 / 3",
        touchAction: "none",
        display: "block",
        background: tokens.color.surfaceSunken,
        borderRadius: 4,
      }}
    >
      <g data-layer="edges">{edgeEls}</g>
      {/* Places above every way: a way's hit band never takes a place's click. */}
      <g data-layer="stubs">{stubEls}</g>
      <g data-layer="places">{placeEls}</g>
      <g data-layer="glyphs">{glyphEls}</g>
      <g data-layer="lens-boundaries">{boundaryEls}</g>
      <g data-layer="lens-refusals">{refusalEls}</g>
      <g data-layer="lens-frontier">{frontierEls}</g>
      <g data-layer="lens-route">{routeEls}</g>
      <g data-layer="ticks">{tickEls}</g>
      <g data-layer="here">{hereEl}</g>
    </svg>
  );
}
