/**
 * AssembledMixin — a durable thing **made of parts that keep their
 * identity** (assembly D3, D7, D8).
 *
 * Crafting is transformation by default: a recipe consumes its inputs and
 * the output is one material and one mass, with no memory of what went in.
 * That is right for a knife from a bar and wrong for a pick, whose haft
 * splits while its head is still good — and for a cask, which is thirty
 * staves, two heads and six hoops, and is mended one stave at a time.
 *
 * Two records, on two different things:
 *
 * - **The BILL is on the KIND** (the row, `bill:`, authored): what parts a
 *   thing of this kind is made of, in what roles, held by which joints.
 *   A part whose own row has a bill is a sub-assembly — nesting is by row
 *   reference, so the depth of an assembly is bounded by what a player
 *   DECIDES about, never by how many pieces it has (the leaf rule).
 * - **The PARTS RECORD is on the INSTANCE** (`parts` + `joints`, runtime
 *   state): what actually went in — which material, what grade, who made
 *   it, how worn, how many members have failed — and the tension of every
 *   joint. Plain arrays of plain records (no Map, no class instance — the
 *   `imparts` precedent), so they persist with the host and need no
 *   marshaller, and they are NOT child objects: thirty staves are a line
 *   with `count: 30`, never thirty things to walk.
 *
 * ⭐ **Wear and failure are two things.** A line's `condition` is the set's
 * gradual wear; `failed` counts discrete member failures. *The haft is
 * split* is `failed 1` on a count-1 line; *one stave is sprung* is `failed
 * 1` on a count-30 line; *the hoops are slack* is a joint whose `tension`
 * fell with every line sound.
 *
 * ⭐⭐ **Composed only by things that ARE made of parts.** A class composes
 * this mixin only when every row of it has a bill — the pick is an
 * `AssembledTool`, a dagger is a plain `Tool` — and `lint:bills` holds
 * both directions. So no caller asks "is this one really an assembly?":
 * composing it is the answer (the base-class narrowing's rule; an earlier
 * cut composed it on whole families and guarded every read with an
 * emptiness check, the mixin-on-the-wrong-host tell).
 *
 * A FOUND thing (spawned from a row with a bill, never crafted) reads its
 * derived properties off the bill at defaults and MATERIALIZES its record
 * on its first mutating act (`ensureParts`) — so a spawned cask yields
 * thirty generic oak staves to a salvager, and a spawned pick that takes a
 * jar gets a haft line at that moment.
 *
 * Requires {@link DurableMixin} beneath it — an assembly is a durable good
 * whose wear has somewhere to go.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import { Mixins } from '../mixin';
import type { AnyConstructor } from '../../api/mixin';
import { MixinApi } from '../../api/mixin';
import type { MarkupAugmenter } from '../../api/mml';
import type { CommandContributions } from '../../api/command';
import type { Stuff } from '../stuff/Stuff';
import type { Durable, MendRecord } from '../material/Durable';
import type Material from '../material/Material';
import { Construction } from '../material/Construction';
import type { Channel } from '../material/Channel';
import { Grade, type GradeBand } from './Grade';
import { StuffApi } from '../../api/stuff';
import { MaterialApi } from '../../api/material';
import { GrammarApi } from '../../api/grammar';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../config/AppSettings';
import { TemplatePaths } from '../paths';
import { WorldClockApi } from '../../api/worldclock';
import type JointCatalogue from '../../platform/idea/JointCatalogue';
import type { JointDescriptor } from '../../platform/idea/Joint';

// ---------------------------------------------------------------- the bill

/** What a part DOES in the whole — the four roles (assembly D3). */
export const PART_ROLES = ['structural', 'fastener', 'wear', 'facing'] as const;
export type PartRole = (typeof PART_ROLES)[number];

/** One line of a kind's bill: a part, the row it is, how many, its role. */
export interface BillPart {
  /** The part's name in this whole — `haft`, `stave`, `hoop`. A NOUN. */
  part: string;
  /** The row a fitted member is (or, for a found thing, would have been). */
  template: string;
  count: number;
  role: PartRole;
  /** The plural noun, when `part + 's'` is wrong (`stave` → `staves`). */
  plural?: string;
  /**
   * What a FOUND thing's part is made of — a material path. Absent, a
   * found thing's part is the whole's material (a cask's staves are oak).
   * A crafted thing never reads it: its record is what actually went in.
   */
  material?: string;
  /**
   * What SHAPE a found thing's part is (`bladed` on an axe's head) — the
   * edge a found tool has to be honed. A crafted thing's line reads the
   * consumed part's own form instead.
   */
  form?: string;
  /**
   * ⭐ The name a FOUND thing's part bears (repair D18, the heirloom): the
   * name lives in the part, so a re-hilted blade keeps it. Only a found
   * thing reads it — a crafted sword is nameless.
   */
  name?: string;
}

/** One joint of a kind's bill: which parts it holds, by which method. */
export interface BillJoint {
  /** The joint's name in this whole — `hafting`, `hooping`. */
  key: string;
  /** The `Joint` row's key — `wedged`, `hooped`. */
  method: string;
  /** The parts the joint holds together. A joint spans a SET (D16). */
  members: string[];
  /** The `role: fastener` part that makes the joint, if any (the hoop). */
  fastener?: string;
}

/** A kind's bill — authored on the row. */
export interface Bill {
  parts: BillPart[];
  joints?: BillJoint[];
}

// ------------------------------------------------------- the parts record

/** What actually went in, per line (assembly D3). */
export interface PartLine {
  /** The bill's part name, or the recipe slot's when there is no bill. */
  part: string;
  /** The row that was consumed (or the bill's, for a found thing). */
  template: string;
  count: number;
  role: PartRole;
  /** The material path of what went in. */
  material: string;
  /** How it was SHAPED — a stock form (`riven`/`sawn`), a covering form. */
  form?: string;
  grade: GradeBand;
  /** 0..1 — the set's wear gauge. */
  condition: number;
  /** Members that have failed discretely (sprung, split, warped). */
  failed: number;
  /** Worked unseasoned (the seasoning axis, assembly D2). */
  green?: boolean;
  /** Game-seconds it was fitted green — the warp clock starts here. */
  greenAt?: number;
  /** It dried in place and moved: a member failed for that reason. */
  warped?: boolean;
  /**
   * A flat-sawn member that has dried — its face is hollow across the
   * width. Harmless in a pegged frame; a joint that needs its members
   * flat (glue) seats short of it.
   */
  cupped?: boolean;
  /** Identity paths of everyone who made or fitted a member of this line. */
  makers: string[];
  /** The nested record, when the fitted part was itself an assembly. */
  parts?: PartLine[];
  joints?: JointState[];
  /** Its plural noun, carried from the bill. */
  plural?: string;
  /**
   * 0..1 — the edge of a part whose form cuts or pierces (repair D3). Absent
   * reads keen. It is the loose part's own `keenness`, carried in.
   */
  keenness?: number;
  /** ⭐ The name this part bears — the seat of the whole's name (D18). */
  name?: string;
  /**
   * Identity path of whoever may NAME this part once — the hand that
   * reforged a named part, which took its name (Narsil's rule, D9).
   */
  nameGrant?: string;
  /** Every mend this part has had (repair D10), carried in and out. */
  mends?: MendRecord[];
  /** The recipe that made the member, when one did (repair D1). */
  recipe?: string;
  /** The trade of the mould the member set in, when it was cast (D1). */
  castDiscipline?: string;
}

/** What a part carries into a line when it is fitted (repair D2). */
export interface FittedMember {
  material: string;
  grade: GradeBand;
  form?: string;
  green?: boolean;
  cupped?: boolean;
  maker: string;
  parts?: PartLine[];
  joints?: JointState[];
  /** The part's own wear. Absent, a fitted member is sound. */
  condition?: number;
  keenness?: number;
  name?: string;
  nameGrant?: string;
  mends?: MendRecord[];
  recipe?: string;
  castDiscipline?: string;
}

/** One joint's live state. */
export interface JointState {
  /** The bill's joint key. */
  key: string;
  /** The Joint row's key. */
  method: string;
  /** The parts it holds. */
  members: string[];
  fastener?: string;
  /** 0..1 — slack below the `crafting.jointSlackThreshold` dial. */
  tension: number;
  /** Identity path of whoever made or last re-made it. */
  maker: string;
}

/** A gauger's record of a vessel's measure (assembly D13). */
export interface GaugeRecord {
  litres: number;
  /** Identity path of the gauger of record. */
  by: string;
  /** Game-time seconds. */
  at: number;
  /** The standard measure it was gauged against. */
  standardL: number;
  /** The polity whose standard it was. */
  government: string;
}

export interface Assembled {
  /** True when this thing has a bill or a parts record — it IS made of parts. */
  getBill(): Bill | null;
  /** The parts record (materialized from the bill first, for a found thing). */
  getParts(): PartLine[];
  getJoints(): JointState[];
  /** The line for a part name, or null. */
  getLine(part: string): PartLine | null;
  /**
   * Write the record the mint derived. The craft mint's ONE write — called
   * on an output the mint is stamping.
   */
  recordAssembly(parts: PartLine[], joints: JointState[]): void;
  /** Materialize the record from the bill if it has none (a found thing). */
  ensureParts(): void;
  /** Any structural line failed, or any joint slack. */
  leaks(): boolean;
  /** The line a blow on `channel` lands on — the best resister. */
  partAnswering(channel: Channel): PartLine | null;
  /** Wear one line's set (and fail a member when it wears through). */
  wearLine(part: string, amount: number): void;
  /** Slacken one joint. */
  slackenJoint(key: string, amount: number): void;
  /** The slack joints, below the dial. */
  slackJoints(): JointState[];
  /** The lines with a failed member. */
  failedLines(): PartLine[];
  /** Re-make a joint at full tension under `maker`'s hand. */
  tightenJoint(key: string, maker: string): void;
  /**
   * Replace `k` failed (or, when none failed, worn) members of a line with
   * newly fitted ones. Re-makes every joint the line is a member of.
   */
  replaceMembers(part: string, k: number, fitted: FittedMember): void;
  /** Restore every line's wear (not its failures) and every joint. */
  restoreAll(maker: string): void;
  getGauge(): GaugeRecord | null;
  /** The name a hand is shown by: as the world names it now, else as it was when it did the work. */
  handName(path: string): string | null;
  setGauge(record: GaugeRecord | null): void;
  /**
   * ⭐ No bill and no record — a thing of ONE piece (repair D4). Every
   * method here is total on that: a monolith's wear, edge, name and mends
   * are its own fields.
   */
  isOnePiece(): boolean;
  /** The lines whose form cuts or pierces — the edges a whetstone reaches. */
  edgedLines(): PartLine[];
  /** One line's edge (1 when the line has none recorded). */
  lineKeenness(part: string): number;
  setLineKeenness(part: string, value: number): void;
  /** Hone one line's edge to keen. */
  honeLine(part: string): void;
  /** Dull one line's edge by `amount`. */
  dullLine(part: string, amount: number): void;
  /**
   * The name the thing bears — the named line's, else its own (a
   * one-piece thing's). Empty when it bears none.
   */
  getSeatName(): string;
  /** Name it: the named line when it has one, else the thing itself. */
  setSeatName(value: string): void;
  /** Take the name away (a reforge), from the line that bears it. */
  clearSeatName(): void;
  /** Who may name it once — the hand that reforged its named part. */
  getNameGrant(): string;
  setNameGrant(value: string): void;
  /** Append a mend to one line's record. */
  recordLineMend(part: string, record: MendRecord): void;
}

/** Numeric AppSetting read, falling back to the seeded literal. */
function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === '' || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

/**
 * ⭐ How far through its species' seasoning a green part dries IN PLACE
 * before it moves enough to warp (assembly D2, AC 19). Grain: oak (365
 * days to season) warps a month after it was fitted green.
 */
const WARP_AFTER_SEASONING_FRACTION = 0.1;
/** How much of its shrinkage a warped member takes off its joints' tension. */
const WARP_SLACK_PER_SHRINKAGE = 6;
/**
 * How much of its shrinkage a CUPPED member takes off a joint that needs
 * its members flat — the same figure as a warp: both are the across-grain
 * shrinkage the board took as it dried, showing up as a gap.
 */
const CUP_SLACK_PER_SHRINKAGE = WARP_SLACK_PER_SHRINKAGE;

/** The default a joint is read at when its row is not (yet) warm. */
const JOINT_DEFAULT: Pick<JointDescriptor, 'strength' | 'failure'> = {
  strength: 0.5,
  failure: 'parted',
};

/**
 * The joint row for `method`, synchronously — the wear route and the look
 * cannot wait. ⭐ Loads on first use (the scan sweep's rule: a dictionary
 * warms when an act first needs it, never at boot): a cold catalogue is
 * stood up and warmed in the background, and this one read answers from
 * the defaults. Every read that DECIDES something — a joint made, fitted,
 * repaired or taken apart — goes through `CraftingLogic`, which awaits the
 * warm catalogue first, so only a wear figure or a label can read cold.
 */
function jointRow(method: string): JointDescriptor | null {
  const cat = StuffApi.findByTemplatePath<JointCatalogue>(
    TemplatePaths.jointCatalogue,
  );
  if (!cat) {
    void StuffApi.singleton<JointCatalogue>(TemplatePaths.jointCatalogue)
      .then((c) => c.allWarmed())
      .catch((err: unknown) => console.warn('Assembled: joint catalogue load failed:', err));
    return null;
  }
  return cat.peek(method);
}

function materialAt(path: string): Material | null {
  if (!path) return null;
  return StuffApi.findByTemplatePath<Material>(path) ?? null;
}

function constructionOf(form: string | undefined): Construction | null {
  if (!form || !Construction.isForm(form)) return null;
  return Construction.of(form);
}

/**
 * ⭐ Whether a form has an EDGE — it delivers a cut or a point as its
 * primary channel (repair D3). An edge is a fact about shape, and shape is
 * the form word: a mace has none, a billhook has one.
 */
function formCuts(form: string | undefined): boolean {
  const c = constructionOf(form);
  if (!c || !c.isWeapon()) return false;
  const p = c.primaryChannel();
  return p === 'edge' || p === 'point';
}

/** Write an optional field, or delete it when the value is absent. */
function setOrDelete<K extends keyof PartLine>(
  line: PartLine,
  key: K,
  value: PartLine[K] | undefined,
): void {
  if (value === undefined) delete line[key];
  else line[key] = value;
}

function isBillPart(v: unknown): v is BillPart {
  if (!v || typeof v !== 'object') return false;
  const p = v as Record<string, unknown>;
  return (
    typeof p.part === 'string' &&
    typeof p.template === 'string' &&
    typeof p.count === 'number' &&
    (PART_ROLES as readonly string[]).includes(p.role as string)
  );
}

/** The plural noun of a line or bill part. */
function nounOf(line: { part: string; plural?: string }, n: number): string {
  if (n === 1) return line.part;
  return line.plural && line.plural.length > 0 ? line.plural : `${line.part}s`;
}

/** The look line: what it is made of, what has failed, what is slack. */
function assemblyAugmenter(text: string, host: Stuff, _viewer: Stuff): string {
  if (!MixinApi.isAssembled(host)) return text;
  // ⭐ A thing with no bill is ONE piece (repair D4) — said, so the lesson
  // of `fit x to it` refusing is on the look before anyone tries.
  if (host.isOnePiece()) {
    const one = 'It is one piece.';
    return text && text.length > 0 ? `${text}\n\n${one}` : one;
  }
  const lines = host.getParts();
  if (lines.length === 0) return text;
  const describe = (l: PartLine): string => {
    const mat = materialAt(l.material)?.getName();
    const noun = nounOf(l, l.count);
    const qty = l.count === 1 ? GrammarApi.articleFor(mat ?? noun) : GrammarApi.inWords(l.count);
    // The grain, when the part was wood shaped one way or another — the
    // difference between a haft that snaps and one that does not.
    const grain = l.form === 'riven' || l.form === 'sawn' || l.form === 'hewn' ? `${l.form} ` : '';
    const first = `${grain}${mat ?? noun}`;
    const q = l.count === 1 ? GrammarApi.articleFor(first) : qty;
    return mat ? `${q} ${grain}${mat} ${noun}` : `${q} ${grain}${noun}`;
  };
  const sentences: string[] = [];
  const made = GrammarApi.joinList(lines.map(describe));
  const joints = host.getJoints();
  const methods = [
    ...new Set(
      joints.map((j) => jointRow(j.method)?.label ?? j.method).filter((m) => m),
    ),
  ];
  sentences.push(
    GrammarApi.cap(
      `It is made of ${made}${methods.length > 0 ? `, ${GrammarApi.joinList(methods)}` : ''}.`,
    ),
  );
  for (const l of host.failedLines()) {
    const word = failureWordFor(host, l);
    sentences.push(
      l.count === 1
        ? GrammarApi.cap(`The ${l.part} is ${word}.`)
        : GrammarApi.cap(
            `${GrammarApi.inWords(l.failed)} of the ${nounOf(l, l.count)} ${l.failed === 1 ? 'is' : 'are'} ${word}.`,
          ),
    );
  }
  for (const j of host.slackJoints()) {
    // ⭐ Say WHY when the cause is a cupped member under a flat joint —
    // the lesson is the quartered board, and the look is where it is read.
    const cupped = jointRow(j.method)?.needsFlat
      ? j.members
          .map((m) => lines.find((l) => l.part === m))
          .find((l) => l?.cupped)
      : undefined;
    sentences.push(
      cupped
        ? GrammarApi.cap(
            `The ${j.key} has never held: the ${cupped.part} has cupped as it dried, and will not lie flat under it.`,
          )
        : GrammarApi.cap(`The ${j.key} has gone slack.`),
    );
  }
  // ⭐ Whose hands are in it (drive 18): everyone who made or fitted a
  // part, or made a joint — so a mended cask reads two names: as the world
  // names them now, else as they were named when they did the work.
  const hands: string[] = [];
  const name = (path: string): void => {
    const shown = host.handName(path);
    if (shown && !hands.includes(shown)) hands.push(shown);
  };
  for (const l of lines) for (const m of l.makers) name(m);
  for (const j of joints) name(j.maker);
  if (hands.length > 0) {
    sentences.push(`It is the work of ${GrammarApi.joinList(hands)}.`);
  }
  const line = sentences.join(' ');
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}

/** How a failed line's member is described — by the joint it sits in. */
function failureWordFor(host: Assembled, line: PartLine): string {
  if (line.warped) return 'warped';
  if (line.role === 'wear') return 'worn through';
  for (const j of host.getJoints()) {
    if (j.members.includes(line.part)) {
      const f = jointRow(j.method)?.failure ?? JOINT_DEFAULT.failure;
      // `slack` is a JOINT word; a member that failed in a slack-prone
      // joint has sprung.
      return f === 'slack' ? 'sprung' : f === 'parted' ? 'broken' : f;
    }
  }
  return 'broken';
}

export function AssembledMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class AssembledMixin extends Base implements Assembled {
    static _mixinName: string = 'AssembledMixin';

    static markupAugmenters: MarkupAugmenter[] = [assemblyAugmenter];

    /**
     * ⭐ `fit` is afforded by WHAT IS BEING FITTED: every assembly in reach
     * makes `fit <part> to <it>` sayable, and every part in reach makes
     * the raise arm (`fit cask`) sayable beside it (assembly D5). A mixin
     * static UNIONS across a class's mixins — the shipped rule — so this
     * reaches every host without naming one.
     */
    static commandContributions: CommandContributions = {
      // ⭐ …and `repair` and `salvage` by the same argument: the rungs are
      // the assembly's (tighten a slack joint, refuse naming a failed part,
      // re-fire a spent cask; take it apart by its joints), and the refusal
      // is the lesson — so the verb must exist wherever the thing does. An
      // instrument-only affordance left a cooper with a driver and a cask
      // unable to say `repair cask` at all (the assembly drive).
      // ⚠ `environment` is how a HELD thing grants a verb to its holder
      // (`self` is the thing's own verbs, and grants nothing). It was
      // `self` until the browser walk: a pick in your hands could not be
      // repaired, a shield could not be salvaged — every drive checkpoint
      // had the assembly lying on the floor, which is `peers`.
      environment: [
        'platform/cmd/crafting/fit.yaml',
        'platform/cmd/crafting/repair.yaml',
        'platform/cmd/crafting/salvage.yaml',
      ],
      peers: [
        'platform/cmd/crafting/fit.yaml',
        'platform/cmd/crafting/repair.yaml',
        'platform/cmd/crafting/salvage.yaml',
      ],
    };

    static fieldMeta: FieldMeta = {
      // ⭐ The KIND's declaration — authored on the row. Open knowledge: a
      // cooper would tell you a cask is staves and hoops.
      bill: { persistent: true, authorable: true },
      parts: { persistent: true, runtimeState: true },
      joints: { persistent: true, runtimeState: true },
      gauge: { persistent: true, runtimeState: true },
      hands: { persistent: true, runtimeState: true },
      // ⭐ A one-piece thing's own name and its grant (repair D18) — a
      // thing of parts keeps both on the line that bears them.
      seatName: { persistent: true, runtimeState: true },
      nameGrant: { persistent: true, runtimeState: true },
    };

    // ⚠ Below `fieldMeta`, never above it: the wiki-spoiler audit's owner
    // scan files a field under the nearest `const` before it, and a
    // `const name` here filed every field of this mixin under `name.*`.
    static __validateComposition__(ctor: AnyConstructor): void {
      const name = (ctor as { name?: string }).name ?? 'class';
      if (!MixinApi.hasMixin(ctor, Mixins.Durable)) {
        throw new Error(
          `${name} composes AssembledMixin without DurableMixin; an ` +
            `assembly's wear has to have somewhere to go (assembly D8).`,
        );
      }
    }

    public bill: Bill | null = null;
    public parts: PartLine[] = [];
    public joints: JointState[] = [];
    public gauge: GaugeRecord | null = null;
    /**
     * ⭐ The name each hand went by when it did its work, by identity path —
     * a maker's mark. Recorded while the maker is live (they are acting),
     * so the work still says whose it is when they are not in the world.
     */
    public hands: Record<string, string> = {};

    /** A one-piece thing's own name — `''` when it bears none (D18). */
    public seatName: string = '';
    /** Who may name a one-piece thing once — the hand that reforged it. */
    public nameGrant: string = '';

    /** Remember the name a hand goes by, while it can be read. */
    private noteHand(path: string | undefined): void {
      if (!path || this.hands[path]) return;
      const who = StuffApi.findByTemplatePath<Stuff>(path);
      const shown = who ? who.getPresentation() : null;
      if (shown) this.hands = { ...this.hands, [path]: shown };
    }

    /** The name a hand is shown by: as it is now, else as it was. */
    handName(path: string): string | null {
      if (!path) return null;
      const who = StuffApi.findByTemplatePath<Stuff>(path);
      return (who ? who.getPresentation() : null) ?? this.hands[path] ?? null;
    }

    /** Validating setter — the applier's phase 1 prefers `set<Field>`. */
    setBill(value: unknown): void {
      if (value === null || value === undefined) {
        this.bill = null;
        return;
      }
      const v = value as { parts?: unknown; joints?: unknown };
      if (!Array.isArray(v.parts) || !v.parts.every(isBillPart)) {
        throw new Error(
          `AssembledMixin.setBill: a bill needs 'parts', each ` +
            `{part, template, count, role ∈ ${PART_ROLES.join('|')}}`,
        );
      }
      const joints = Array.isArray(v.joints)
        ? (v.joints as BillJoint[]).map((j) => ({
            key: String(j.key),
            method: String(j.method),
            members: Array.isArray(j.members) ? j.members.map(String) : [],
            ...(j.fastener ? { fastener: String(j.fastener) } : {}),
          }))
        : [];
      this.bill = {
        parts: (v.parts as BillPart[]).map((p) => ({ ...p })),
        joints,
      };
    }


    getBill(): Bill | null {
      if (!this.bill) return null;
      return {
        parts: this.bill.parts.map((p) => ({ ...p })),
        joints: (this.bill.joints ?? []).map((j) => ({ ...j, members: [...j.members] })),
      };
    }

    getParts(): PartLine[] {
      if (this.parts.length === 0) return this.billLines();
      this.reconcileWarp();
      return this.parts;
    }

    /**
     * ⭐ Green wood dries where it was fitted, shrinks, and MOVES: once a
     * green line has had a tenth of its species' seasoning in place, one of
     * its members has warped (it fails, and says so) and the joints it
     * sits in slacken by what the material shrinks. Reconcile-on-read, once
     * per line — the green flag clears when it has happened. This is the
     * stated reason green work fails (AC 19).
     */
    private reconcileWarp(): void {
      let nowS: number | null = null;
      for (const line of this.parts) {
        if (!line.green || !line.greenAt) continue;
        const m = materialAt(line.material);
        const days = m?.getSeasoningDays() ?? 0;
        if (days <= 0) continue;
        nowS ??= WorldClockApi.getNow().rawValue();
        if (nowS - line.greenAt < days * WARP_AFTER_SEASONING_FRACTION * 86_400) continue;
        line.green = false;
        line.warped = true;
        if (line.failed < line.count) line.failed += 1;
        const slack = (m?.getGreenShrinkage() ?? 0) * WARP_SLACK_PER_SHRINKAGE;
        for (const j of this.joints) {
          if (j.members.includes(line.part)) j.tension = Math.max(0, j.tension - slack);
        }
      }
    }

    getJoints(): JointState[] {
      if (this.parts.length > 0) {
        this.reconcileWarp();
        return this.joints;
      }
      return this.joints.length > 0 ? this.joints : this.billJoints();
    }

    getLine(part: string): PartLine | null {
      return this.getParts().find((l) => l.part === part) ?? null;
    }

    recordAssembly(parts: PartLine[], joints: JointState[]): void {
      this.parts = parts.map((l) => ({ ...l }));
      this.joints = joints.map((j) => ({ ...j, members: [...j.members] }));
      for (const l of this.parts) for (const m of l.makers) this.noteHand(m);
      for (const j of this.joints) this.noteHand(j.maker);
      this.seatFlatJoints();
    }

    /**
     * ⭐ A joint that needs its members FLAT (glue) seats short of a cupped
     * one, by what the member's species shrinks across the grain — and
     * no hand can close that gap, since the board is the wrong shape, not
     * the joint. Run whenever a joint is made or re-made; the remedy is a
     * flat member (a quartered board), fitted in its place.
     */
    private seatFlatJoints(): void {
      for (const j of this.joints) {
        if (!jointRow(j.method)?.needsFlat) continue;
        for (const name of j.members) {
          const line = this.parts.find((l) => l.part === name);
          if (!line?.cupped) continue;
          const slack =
            (materialAt(line.material)?.getGreenShrinkage() ?? 0) * CUP_SLACK_PER_SHRINKAGE;
          j.tension = Math.min(j.tension, Math.max(0, 1 - slack));
        }
      }
    }

    ensureParts(): void {
      if (this.parts.length > 0 || !this.bill) return;
      this.parts = this.billLines();
      this.joints = this.billJoints();
    }

    /** The bill read as a record at defaults — a found thing. */
    private billLines(): PartLine[] {
      if (!this.bill) return [];
      const own = MixinApi.isTangible(this as unknown as Stuff)
        ? ((this as unknown as Stuff & { getMaterial(): Material | null })
            .getMaterial()
            ?.getTemplatePath() ?? '')
        : '';
      return this.bill.parts.map((p) => ({
        part: p.part,
        template: p.template,
        count: p.count,
        role: p.role,
        // ⚠ A found thing does not know what each part was made of beyond
        // what the kind declares: the bill's `material`, else the whole's
        // (the cask is oak, so its staves are oak).
        material: p.material ?? own,
        grade: 'fair' as GradeBand,
        condition: 1,
        failed: 0,
        makers: [],
        ...(p.plural ? { plural: p.plural } : {}),
        ...(p.form ? { form: p.form } : {}),
        ...(p.name ? { name: p.name } : {}),
      }));
    }

    private billJoints(): JointState[] {
      return (this.bill?.joints ?? []).map((j) => ({
        key: j.key,
        method: j.method,
        members: [...j.members],
        ...(j.fastener ? { fastener: j.fastener } : {}),
        tension: 1,
        maker: '',
      }));
    }

    leaks(): boolean {
      return (
        this.getParts().some((l) => l.role === 'structural' && l.failed > 0) ||
        this.slackJoints().length > 0
      );
    }

    slackJoints(): JointState[] {
      const t = dial(AppSettingKeys.craftingJointSlackThreshold, 0.5);
      return this.getJoints().filter((j) => j.tension < t);
    }

    failedLines(): PartLine[] {
      return this.getParts().filter((l) => l.failed > 0);
    }

    partAnswering(channel: Channel): PartLine | null {
      const lines = this.getParts().filter((l) => l.failed < l.count);
      if (lines.length === 0) return null;
      const scores = MaterialApi.resistanceTo(
        channel,
        lines.map((l) => ({
          material: materialAt(l.material),
          construction: constructionOf(l.form),
        })),
      );
      let best = 0;
      for (let i = 1; i < scores.length; i++) {
        if ((scores[i] ?? 0) > (scores[best] ?? 0)) best = i;
      }
      return lines[best] ?? null;
    }

    /**
     * The line that gives FIRST on `channel` — the weakest resister among
     * the load-bearing lines (structural and wear; a fastener's failure is
     * a joint going slack, and a facing is answered by the fold).
     */
    private lineGivingFirst(channel: Channel): PartLine | null {
      const lines = this.parts.filter(
        (l) =>
          l.failed < l.count && (l.role === 'structural' || l.role === 'wear'),
      );
      if (lines.length === 0) return null;
      const scores = MaterialApi.resistanceTo(
        channel,
        lines.map((l) => ({
          material: materialAt(l.material),
          construction: constructionOf(l.form),
        })),
      );
      let worst = 0;
      for (let i = 1; i < scores.length; i++) {
        if ((scores[i] ?? 0) < (scores[worst] ?? 0)) worst = i;
      }
      return lines[worst] ?? null;
    }

    wearLine(part: string, amount: number): void {
      if (!Number.isFinite(amount) || amount <= 0) return;
      this.ensureParts();
      const line = this.parts.find((l) => l.part === part);
      if (!line) return;
      // ⭐ Green wood gives faster — what it was worked from is what it is.
      const rate = line.green ? dial(AppSettingKeys.craftingGreenWearFactor, 2) : 1;
      line.condition = Math.max(0, line.condition - amount * rate);
      const broken = dial(AppSettingKeys.craftingBrokenThreshold, 0.1);
      if (line.condition <= broken && line.failed < line.count) {
        // One member wears through — the worst of the set, which is the
        // one that failed. The rest are the set again, sound, until they
        // wear down to the next one (a count-1 line has no rest).
        line.failed += 1;
        line.condition = line.failed < line.count ? 1 : 0;
      }
    }

    slackenJoint(key: string, amount: number): void {
      if (!Number.isFinite(amount) || amount <= 0) return;
      this.ensureParts();
      const j = this.joints.find((x) => x.key === key);
      if (!j) return;
      j.tension = Math.max(0, j.tension - amount);
    }

    tightenJoint(key: string, maker: string): void {
      this.ensureParts();
      const j = this.joints.find((x) => x.key === key);
      if (!j) return;
      j.tension = 1;
      if (maker) j.maker = maker;
      this.noteHand(maker);
      this.seatFlatJoints();
    }

    replaceMembers(part: string, k: number, fitted: FittedMember): void {
      this.ensureParts();
      const line = this.parts.find((l) => l.part === part);
      if (!line || k <= 0) return;
      const n = line.count;
      const take = Math.min(k, n);
      // ⭐ A fitted member brings its OWN wear (repair D2): a worn haft
      // fitted is a worn haft in the whole. Absent, it is sound.
      const fittedCondition = Math.max(0, Math.min(1, fitted.condition ?? 1));
      // Failed members are replaced first; any remainder replaces the most
      // worn of the sound ones (the set's gauge is their average).
      const fromFailed = Math.min(take, line.failed);
      line.failed -= fromFailed;
      line.condition = (line.condition * (n - take) + take * fittedCondition) / n;
      if (n === 1 || take === n) {
        // The whole line is the new member — it IS what was fitted now,
        // and carries what the part carried: its edge, its name, its mends.
        line.material = fitted.material;
        line.grade = fitted.grade;
        line.condition = fittedCondition;
        line.failed = 0;
        setOrDelete(line, 'keenness', fitted.keenness);
        setOrDelete(line, 'name', fitted.name || undefined);
        setOrDelete(line, 'nameGrant', fitted.nameGrant || undefined);
        setOrDelete(
          line,
          'mends',
          fitted.mends && fitted.mends.length > 0 ? fitted.mends.map((m) => ({ ...m })) : undefined,
        );
        setOrDelete(line, 'recipe', fitted.recipe || undefined);
        setOrDelete(line, 'castDiscipline', fitted.castDiscipline || undefined);
        if (fitted.form) line.form = fitted.form;
        else delete line.form;
        if (fitted.green) {
          line.green = true;
          line.greenAt = WorldClockApi.getNow().rawValue();
        } else {
          delete line.green;
          delete line.greenAt;
        }
        delete line.warped;
        if (fitted.cupped) line.cupped = true;
        else delete line.cupped;
        if (fitted.parts && fitted.parts.length > 0) {
          line.parts = fitted.parts.map((p) => ({ ...p }));
          line.joints = (fitted.joints ?? []).map((j) => ({ ...j }));
        } else {
          delete line.parts;
          delete line.joints;
        }
      } else {
        // A set takes the weakest link: the line's grade is the worse of
        // the two, and a green member makes the set green.
        line.grade = Grade.of(line.grade).min(Grade.of(fitted.grade)).getBand();
        if (fitted.green && !line.green) {
          line.green = true;
          line.greenAt = WorldClockApi.getNow().rawValue();
        }
        if (line.failed === 0) delete line.warped;
        if (fitted.cupped) line.cupped = true;
      }
      if (fitted.maker && !line.makers.includes(fitted.maker)) {
        line.makers.push(fitted.maker);
      }
      this.noteHand(fitted.maker);
      // ⭐ Re-make every joint the new member sits in — under THIS hand.
      for (const j of this.joints) {
        if (j.members.includes(part) || j.fastener === part) {
          j.tension = 1;
          if (fitted.maker) j.maker = fitted.maker;
        }
      }
      this.seatFlatJoints();
    }

    restoreAll(maker: string): void {
      this.ensureParts();
      for (const l of this.parts) l.condition = 1;
      for (const j of this.joints) {
        j.tension = 1;
        if (maker) j.maker = maker;
      }
      this.noteHand(maker);
      this.seatFlatJoints();
    }

    getGauge(): GaugeRecord | null {
      return this.gauge ? { ...this.gauge } : null;
    }

    setGauge(record: GaugeRecord | null): void {
      this.gauge = record ? { ...record } : null;
    }

    // ------------------------------------------- one piece, edges, names

    isOnePiece(): boolean {
      return this.bill === null && this.parts.length === 0;
    }

    edgedLines(): PartLine[] {
      return this.getParts().filter((l) => formCuts(l.form));
    }

    lineKeenness(part: string): number {
      return this.getLine(part)?.keenness ?? 1;
    }

    setLineKeenness(part: string, value: number): void {
      this.ensureParts();
      const line = this.parts.find((l) => l.part === part);
      if (!line) return;
      line.keenness = Math.max(0, Math.min(1, value));
    }

    honeLine(part: string): void {
      this.setLineKeenness(part, 1);
    }

    dullLine(part: string, amount: number): void {
      if (!Number.isFinite(amount) || amount <= 0) return;
      this.setLineKeenness(part, this.lineKeenness(part) - amount);
    }

    getSeatName(): string {
      const named = this.getParts().find((l) => l.name);
      return named?.name ?? this.seatName;
    }

    setSeatName(value: string): void {
      this.ensureParts();
      // ⭐ The name lives in the part that bears it, or the part that may
      // be named (its grant), else the thing itself (a one-piece thing).
      const seat =
        this.parts.find((l) => l.name) ?? this.parts.find((l) => l.nameGrant);
      if (seat) seat.name = value;
      else this.seatName = value;
    }

    clearSeatName(): void {
      this.ensureParts();
      for (const l of this.parts) delete l.name;
      this.seatName = '';
    }

    getNameGrant(): string {
      const granted = this.getParts().find((l) => l.nameGrant);
      return granted?.nameGrant ?? this.nameGrant;
    }

    setNameGrant(value: string): void {
      this.ensureParts();
      const seat =
        this.parts.find((l) => l.nameGrant) ?? this.parts.find((l) => l.name);
      if (seat) {
        if (value) seat.nameGrant = value;
        else delete seat.nameGrant;
      } else this.nameGrant = value;
    }

    recordLineMend(part: string, record: MendRecord): void {
      this.ensureParts();
      const line = this.parts.find((l) => l.part === part);
      if (!line) return;
      line.mends = [...(line.mends ?? []), { ...record }];
    }

    /**
     * ⭐ A thing answers to the name it bears — `get Brightwater` finds the
     * sword whose blade is named (repair D18).
     */
    hasKeyword(keyword: string): boolean {
      const own = (Base.prototype as unknown as { hasKeyword?: (k: string) => boolean })
        .hasKeyword;
      if (own && own.call(this, keyword)) return true;
      const name = this.getSeatName();
      return !!name && name.toLowerCase() === keyword.toLowerCase();
    }

    // ---------------------------------------------- the Durable overrides

    /** Its own mends, and every part's (repair D10). */
    getMends(): MendRecord[] {
      const own = (Base.prototype as unknown as Durable).getMends.call(this);
      const lines = this.parts.flatMap((l) => (l.mends ?? []).map((m) => ({ ...m })));
      return [...own, ...lines].sort((a, b) => a.at - b.at);
    }

    /**
     * ⭐ An assembly is as sound as its worst line, and no sounder than a
     * structural member that has failed. A one-material thing reads its
     * own gauge exactly as before.
     */
    getCondition(): number {
      const own = (Base.prototype as unknown as Durable).getCondition.call(this);
      if (this.parts.length === 0) return own;
      let c = own;
      for (const l of this.parts) {
        if (l.role === 'structural' && l.failed > 0) return 0;
        c = Math.min(c, l.condition);
      }
      return c;
    }

    /**
     * Setting the whole's condition sets every line's wear with it (repair's
     * material-priced rung restores the set). Failures are not wear — a
     * split haft is not mended by setting a number.
     */
    setCondition(value: number): void {
      (Base.prototype as unknown as Durable).setCondition.call(this, value);
      for (const l of this.parts) {
        l.condition = Math.max(0, Math.min(1, value));
      }
    }

    isBroken(): boolean {
      if (this.parts.length > 0) {
        if (this.parts.some((l) => l.role === 'structural' && l.failed > 0)) {
          return true;
        }
        const broken = dial(AppSettingKeys.craftingBrokenThreshold, 0.1);
        if (this.joints.some((j) => j.tension <= broken)) return true;
        return this.getCondition() <= broken;
      }
      return (Base.prototype as unknown as Durable).isBroken.call(this);
    }

    /**
     * ⭐⭐ **Wear routes to the part that answers it** (assembly D7). With a
     * channel, the line that gives first on it takes the wear — the haft
     * under the sledge's jar, never the head — and every joint that line
     * sits in slackens by the share its row does not absorb. Without one,
     * the declared `wear` part takes it (the share wears, the beam does
     * not), else it spreads across the structural lines. A thing with no
     * parts wears its own gauge exactly as before.
     */
    wear(amount?: number, channel?: Channel): void {
      const a = amount ?? 0.01;
      if (!Number.isFinite(a) || a < 0) return;
      this.ensureParts();
      // No parts recorded or billed (a test fixture): its own gauge.
      if (this.parts.length === 0) {
        (Base.prototype as unknown as Durable).wear.call(this, a);
        return;
      }
      if (channel) {
        const line = this.lineGivingFirst(channel);
        if (!line) {
          (Base.prototype as unknown as Durable).wear.call(this, a);
          return;
        }
        this.wearLine(line.part, a);
        for (const j of this.joints) {
          if (!j.members.includes(line.part)) continue;
          const strength = jointRow(j.method)?.strength ?? JOINT_DEFAULT.strength;
          this.slackenJoint(j.key, a * (1 - strength));
        }
        return;
      }
      const wearing = this.parts.filter((l) => l.role === 'wear' && l.failed < l.count);
      if (wearing.length > 0) {
        for (const l of wearing) this.wearLine(l.part, a);
        return;
      }
      const structural = this.parts.filter(
        (l) => l.role === 'structural' && l.failed < l.count,
      );
      if (structural.length === 0) {
        (Base.prototype as unknown as Durable).wear.call(this, a);
        return;
      }
      for (const l of structural) this.wearLine(l.part, a / structural.length);
    }
  };
}
