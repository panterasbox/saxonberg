/**
 * ⭐⭐ The ONE icon map. Every icon the client draws is looked up here by a
 * name in OUR vocabulary — a card control, a branch, later a mixin or a
 * trade key — never imported at its call site.
 *
 * Why one table (iconography-slate; the owner's direction, 2026-10-31):
 * - drawing our own marks later is an edit to this table, not a sweep;
 * - an unmapped name falls back to a visible generic glyph, never to
 *   nothing (a missing icon is not information);
 * - the same names can serve the wiki's mixin pages and the overlay.
 *
 * Sources by role: CHROME and actions are line icons (Lucide, ISC). Domain
 * nouns (trades, materials, creatures) will be silhouettes (game-icons.net,
 * CC BY 3.0 — attribution owed when the first one lands) inside a fixed
 * frame, so a line glyph and a filled one never sit side by side unframed.
 */

import {
  ArrowDown,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  Bird,
  ChevronsDown,
  ChevronsUp,
  CircleDashed,
  DoorClosed,
  Eye,
  Footprints,
  Lock,
  LogOut,
  Mountain,
  Signpost,
  TriangleAlert,
  Waves,
  Box,
  CircleHelp,
  Lightbulb,
  MapPin,
  Maximize2,
  Minimize2,
  PictureInPicture2,
  Pin,
  Square,
  User,
  X,
  Binoculars,
  Building2,
  ChevronDown,
  ChevronRight,
  Cloud,
  Droplets,
  Fence,
  Flag,
  Grid3x3,
  House,
  Info,
  Landmark,
  LocateFixed,
  Map,
  Minus,
  Moon,
  Package,
  Plus,
  Route,
  Ship,
  Sun,
  Users,
  Swords,
  type LucideIcon,
} from "lucide-react";

export const ICONS = {
  // ── card controls ─────────────────────────────────────────────
  "card.bigger": Maximize2,
  "card.smaller": Minimize2,
  "card.pin": Pin,
  "card.close": X,
  /** Pop a card out into its own window (broadcast-ready D13). */
  "card.popout": PictureInPicture2,
  /** A card in the tray with no kind of its own. */
  "card.tray": Square,
  // ── the four branches (placeholders until the marks are drawn) ─
  "kind.location": MapPin,
  "kind.agent": User,
  "kind.thing": Box,
  "kind.idea": Lightbulb,
  // ── the ways (navigation card W3) ──────────────────────────────
  "dir.north": ArrowUp,
  "dir.northeast": ArrowUpRight,
  "dir.east": ArrowRight,
  "dir.southeast": ArrowDownRight,
  "dir.south": ArrowDown,
  "dir.southwest": ArrowDownLeft,
  "dir.west": ArrowLeft,
  "dir.northwest": ArrowUpLeft,
  "dir.up": ChevronsUp,
  "dir.down": ChevronsDown,
  /** A way with a name, not a bearing (`out`, `pumphouse`). */
  "dir.named": Signpost,
  "way.locked": Lock,
  "way.shut": DoorClosed,
  /** A window: it shows the far side and passes no body. */
  "way.window": Eye,
  /** Not for you as you stand — trying says why. */
  "way.refuses": TriangleAlert,
  /** Open as far as you know: you cannot see the far side. */
  "way.unseen": CircleDashed,
  /** It leaves this zone. */
  "way.leaves": LogOut,
  // ── the ways a body moves, when a way needs one ───────────────
  "mode.walk": Footprints,
  "mode.climb": Mountain,
  "mode.swim": Waves,
  "mode.fly": Bird,
  // ── the navigation card's vocabulary (owner, review: an icon on
  //    everything, one name per idea, reused wherever the idea appears) ──
  /** A larger place you are in — a Locality on the trail. */
  "nav.area": Map,
  /** The room you stand in. */
  "nav.room": MapPin,
  /** You, on the map. */
  "nav.you": User,
  /** Look — at a room, a thing, anything. */
  "act.look": Eye,
  "map.zoomIn": Plus,
  "map.zoomOut": Minus,
  "map.findMe": LocateFixed,
  "map.fit": Maximize2,
  "map.grid": Grid3x3,
  "map.legend": Info,
  /** A room you have not been in. */
  "map.unvisited": Square,
  "lens.frontier": Flag,
  "lens.route": Route,
  "lens.refusals": Lock,
  "lens.boundaries": Fence,
  /** Whose ground — the government that keeps it. */
  "place.ground": Landmark,
  "place.lit": Sun,
  "place.dark": Moon,
  "place.sky": Cloud,
  "place.roof": House,
  "place.water": Droplets,
  "place.crowd": Users,
  "place.elevation": Mountain,
  "section.horizon": Binoculars,
  "section.structure": Building2,
  "section.ship": Ship,
  "section.place": MapPin,
  "section.you": User,
  "you.load": Package,
  "you.fighting": Swords,
  "ui.open": ChevronDown,
  "ui.closed": ChevronRight,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

/** What an unmapped name draws: visibly a placeholder, never blank. */
export const FALLBACK_ICON: LucideIcon = CircleHelp;
