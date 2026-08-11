/**
 * Shared infrastructure for the mixin suite.
 *
 * Scope: things genuinely global to the suite as a whole — the base
 * constructor type and the registry of mixin names. Individual mixin
 * interfaces (Named, Container, Visible, etc.) live with their mixin
 * module, not here.
 */

/**
 * Mixin constructor type.
 * A mixin is a function that takes a base class and returns an extended class.
 * Supports both concrete and abstract constructors.
 */
// `any[]` constructor args are intrinsic to the TS mixin pattern: a
// mixin extends an arbitrary base and forwards `super(...args)`, which
// `unknown[]`/`never[]` can't type. This is the canonical exception
// (see the TypeScript handbook's mixin section), so it's the one place
// the rule is deliberately suppressed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MixinConstructor<T = object> = (new (...args: any[]) => T) | (abstract new (...args: any[]) => T);

/**
 * What ONE field declares about itself.
 *
 * `static fieldMeta` inverts the old arrangement. Field metadata used to
 * live in four parallel statics — `persistentFields`, `fieldMarshallers`,
 * `instructionFields`, `globIdentityFields` — each keyed by field name,
 * so answering "what is true of this field?" meant consulting four
 * places and adding a fifth concern meant adding a fifth static. Here
 * each field is a key and everything about it is its value.
 *
 * Declared per class body and collected up the prototype chain by
 * {@link MixinApi.getAllFieldMeta}, own-property only, concrete class
 * first. **The merge is PROPERTY-level, not field-level**: a subclass
 * declaring `{ marshaller }` for a field its base declares
 * `{ persistent: true }` for gets both. Field-level shadowing would
 * silently drop the base's declaration — `Weapon`/`Tangible` `mass` is
 * the live case, and it would have stopped persisting.
 *
 * Lives here rather than in `api/` so 200+ `lib/` mixins can annotate a
 * static without importing out of the Api tier.
 */
export interface FieldMetaEntry {
  /** Round-trips through persistence. Was `static persistentFields`. */
  persistent?: true;
  /**
   * TemplatePath of the Marshaller that converts this field to and from
   * stored form. Was `static fieldMarshallers`.
   */
  marshaller?: string;
  /**
   * Applied by an `apply<Field>` method at hydrate Phase 2 rather than
   * assigned. Was `static instructionFields`.
   */
  instruction?: true;
  /**
   * Participates in glob stack identity — two globs merge only when
   * every such field is equal. Was `static globIdentityFields`.
   */
  globIdentity?: true;

  /**
   * **Axis 1** — what this field points at when it points at other
   * Stuff.
   *
   * `identity` stores a templatePath ("what kind of thing"), is
   * persistable, and re-resolves on read, so it cannot dangle.
   * `instance` stores a live ref ("this particular object") and is
   * never persistable, because `stuffId` does not survive a reboot.
   *
   * The discriminator is **the holder's meaning, not a property of the
   * target** — "the room I am in" is an instance ref even though rooms
   * have unique paths. That is why it is declared and not inferred.
   */
  ref?: 'identity' | 'instance';
  /**
   * **Axis 2** — what happens to the target when this holder destructs.
   * Instance refs only; an identity ref re-resolves and cannot dangle.
   *
   * Read-side self-heal is the DEFAULT for every single instance ref, so
   * this names only the *destruct-side* rule: `weak` means "none",
   * `symmetric` clears the named {@link inverse} on the other side, and
   * `owned` destructs the target.
   *
   * `owned` is the dangerous one — it means "this has no existence
   * without me", NOT "I hold it". `Container.contents` looks exactly
   * like the shipped `owned` exemplars and must never be declared one.
   */
  lifetime?: 'weak' | 'symmetric' | 'owned';
  /** The reciprocal field on the other side. Required for `symmetric`. */
  inverse?: string;

  /** Author-editable in the Studio. Was the `@authorable` TSDoc tag. */
  authorable?: true;
  /** Studio picker type for an authorable ref. Was `@authorable ref:<T>`. */
  authorPicker?: string;
  /**
   * Engine-written rather than author-editable. Was `@runtimeState`.
   * A **subset** of `persistent`, not a contradiction with it.
   */
  runtimeState?: true;

  /**
   * **Reveal level of this field's VALUE wherever it surfaces.**
   *
   * A derived panel emits live field values, and some of those are
   * spoilers — a species' resistances, a hazard's trigger, a creature's
   * weakness. Authored prose carries page defaults and inline tags;
   * derived fields carry nothing, so without this a composition panel
   * is a hole straight through the reveal model.
   *
   * ⭐ **Declared on the field, not in the component**, because the
   * same field is a spoiler *wherever* it surfaces — a wiki panel, the
   * Studio, help, a future codex. A policy table owned by the wiki
   * would be wrong the moment anything else rendered the same value.
   *
   * ⚠ **Absent means level 0 — OPEN.** This is a reveal system
   * defaulting to reveal, so the reasoning is worth stating: the
   * alternative empties every panel until several hundred mundane
   * fields are tagged, and trains authors to tag reflexively rather
   * than thoughtfully.
   *
   * ⭐ **The line the sweep settled on: collapse what the WORLD
   * measures; never collapse what the PLAYER operates.** A material's
   * density, a biome's temperature, a species' natural attacks, a
   * recipe's inputs, a condition's cure — all level 1, because a
   * reader may want to meet those in play and can open any of them in
   * one click. A locomotion mode's speed and a combat formation's
   * roles stay open: those are the player's own controls, and hiding
   * how your own legs work teaches nothing.
   *
   * (This note used to say "density and hardness are not spoilers".
   * They are now level 1 — a deliberate reversal, not drift. What
   * makes it coherent is the **reader rung**: level 1 is collapsed by
   * default rather than forbidden, so tagging a measurement costs a
   * reader one click instead of locking them out. Before that rung
   * existed, level 1 meant "no ordinary player, ever", and under those
   * semantics the old advice was right.)
   *
   * The cost is real and is not being papered over — a newly-added
   * spoilery field is visible until somebody tags it. It is covered
   * the way the sandbox boundary exemptions are: **by enumeration, not
   * inference.** A snapshot test lists every field a panel can surface
   * with its level, so introducing a spoiler without a tag shows up as
   * a diff in review rather than as a leak in production.
   */
  spoiler?: 0 | 1 | 2 | 3;

  /**
   * **Reveal level of this field's NAME** — the level at which a
   * reader learns the field *exists at all*. Defaults to
   * {@link spoiler}, which is the whole-row behaviour: on a creature
   * whose `fireVulnerability` is a spoiler, knowing it HAS one is most
   * of the information, so name and value hide together.
   *
   * ⭐ Declare it lower than `spoiler` where **the existence is schema
   * and only the measurement is content**. "This material has a
   * density" is not a secret — it is what `help` and the generated API
   * docs publish. `750 kg/m³` is the thing worth working for. So
   * `Material`'s measured properties carry `spoilerName: 0` beside
   * `spoiler: 1`, and a reader sees the property list with the numbers
   * collapsed rather than a table of blanks.
   *
   * ⚠ Splitting them is **opting into a redaction marker**, which the
   * reveal model refuses everywhere else. That is coherent only
   * because the marker reveals nothing here: the name was already
   * public. Do not split a field whose existence is the reveal — the
   * empty cell would announce exactly what the level was protecting.
   */
  spoilerName?: 0 | 1 | 2 | 3;
}

/** One class body's field declarations, keyed by instance field name. */
export type FieldMeta = Record<string, FieldMetaEntry>;

/**
 * Mixin name constants.
 * Use these constants instead of string literals when checking for mixins.
 */
export const Mixins = {
  Named: 'NamedMixin',
  Gendered: 'GenderedMixin',
  Persona: 'PersonaMixin',
  Advancement: 'AdvancementMixin',
  Container: 'ContainerMixin',
  Containable: 'ContainableMixin',
  Surfaced: 'SurfacedMixin',
  Visible: 'VisibleMixin',
  Sensor: 'SensorMixin',
  Vocal: 'VocalMixin',
  Aether: 'AetherMixin',
  AetherHosted: 'AetherHostedMixin',
  Comms: 'CommsMixin',
  Forums: 'ForumsMixin',
  Perceptible: 'PerceptibleMixin',
  // Presence-concealment — "how hard is it to notice this is here?". One
  // level on every loose perceivable (Thing/Creature/Exit); subsumes the
  // old Exit.hidden boolean. Read by the detection gate (PerceptionApi).
  Concealable: 'ConcealableMixin',
  // The actor-side of concealment — a Character's dynamic `hide` state,
  // overriding getConcealment() with a derived level while hidden. Composed
  // outside Creature's ConcealableMixin. See lib/concealment/Hiding.
  Hiding: 'HidingMixin',
  // A self-resolving trap/hazard — state + delivery + its own resolution,
  // sprung at the traverse (Mobile) or an interact (OpenController). No Api.
  Hazard: 'HazardMixin',
  Detailed: 'DetailedMixin',
  Propertied: 'PropertiedMixin',
  CommandGiver: 'CommandGiverMixin',
  Focused: 'FocusedMixin',
  Mobile: 'MobileMixin',
  CartesianCoordinates: 'CartesianCoordinatesMixin',
  SphericalCoordinates: 'SphericalCoordinatesMixin',
  Exitable: 'ExitableMixin',
  Sealable: 'SealableMixin',
  // Binary on/off — a lamppost, a beacon, a machine.
  Switchable: 'SwitchableMixin',
  // Binary locked/unlocked — composed onto Door beneath Sealable.
  Lockable: 'LockableMixin',
  // Binary folded/unfolded — a folding chair refuses its posture slots.
  Foldable: 'FoldableMixin',
  // Displays game-time — a pocket watch, a clock tower, a sundial.
  Timekeeping: 'TimekeepingMixin',
  // The windable/drifting clockwork inside a mechanical timepiece.
  MechanicalMovement: 'MechanicalMovementMixin',
  AroundSaveHook: 'AroundSaveHookMixin',
  AroundDeleteHook: 'AroundDeleteHookMixin',
  PostRegistration: 'PostRegistrationMixin',
  HasInteractive: 'HasInteractiveMixin',
  Environment: 'EnvironmentMixin',
  Alias: 'AliasMixin',
  Singleton: 'SingletonMixin',
  DoorBearing: 'DoorBearingMixin',
  Adornable: 'AdornableMixin',
  Adornment: 'AdornmentMixin',
  AmbientLit: 'AmbientLitMixin',
  LightSource: 'LightSourceMixin',
  SmellSource: 'SmellSourceMixin',
  SoundSource: 'SoundSourceMixin',
  // Discrete-event sound push — a whistle, a bell, an alarm, a chime.
  Audible: 'AudibleMixin',
  Augment: 'AugmentMixin',
  Perception: 'PerceptionMixin',
  Tangible: 'TangibleMixin',
  Organism: 'OrganismMixin',
  Sexed: 'SexedMixin',
  Vitals: 'VitalsMixin',
  // What a body does after it stops: the decay clock, the forensic
  // readability curve, and the eviction veto that keeps a corpse in the
  // world long enough to be studied.
  Postmortem: 'PostmortemMixin',
  // Present, but unable to touch anything — the capability half of
  // function-over-form. Platform verbs ride the participant; embodied
  // verbs are refused by the `requiresEmbodied` validator.
  Incorporeal: 'IncorporealMixin',
  // First-aid dressing capability — any item that can dress a wound
  // (bandage / gauze / clean rag). The harm build's medic vertical.
  Dressing: 'DressingMixin',
  Reserved: 'ReservedMixin',
  Radioactive: 'RadioactiveMixin',
  // The form axis — a material worked into a Construction (materials-
  // response). Composed by armor (resist profile) and weapons (delivery).
  Constructed: 'ConstructedMixin',
  Branded: 'BrandedMixin',
  // Chattel — a movable good's durable per-instance identity, the key its
  // unspoofable ownership is stamped against (the parcel-title twin).
  // Composed at the Thing tier; refused on fungible stacks (Globbable).
  Chattel: 'ChattelMixin',
  // Estate — owner-based persistence: the goods a principal holds title to,
  // wherever they sit. The counterpart to the Container slice's skip rule.
  Estate: 'EstateMixin',
  // Commerce — the shared authored price-list (Law 1: worth on the offer,
  // not the good). Composed by the bar's Menu and the store's Stock.
  PricedOffer: 'PricedOfferMixin',
  // Residency — the game-time reset (repop) sweep's consumer marker: an
  // object that restores itself on the sweep (the shop's Stock tops up).
  Resettable: 'ResettableMixin',
  // Consignment — the store's brokerage shelf: holds player-owned goods in
  // custody (ownership stays with the consignor) + the listing registry.
  ConsignmentShelf: 'ConsignmentShelfMixin',
  Workspace: 'WorkspaceMixin',
  Author: 'AuthorMixin',
  Perceiver: 'PerceiverMixin',
  Scryable: 'ScryableMixin',
  Slotted: 'SlottedMixin',
  Slottable: 'SlottableMixin',
  Wearable: 'WearableMixin',
  Wieldable: 'WieldableMixin',
  Postured: 'PosturedMixin',
  Posed: 'PosedMixin',
  Mountable: 'MountableMixin',
  Drivable: 'DrivableMixin',
  Climbable: 'ClimbableMixin',
  Swimmable: 'SwimmableMixin',
  Flyable: 'FlyableMixin',
  Spawner: 'SpawnerMixin',
  Spawned: 'SpawnedMixin',
  Populates: 'PopulatesMixin',
  Persistable: 'PersistableMixin',
  Forkable: 'ForkableMixin',
  Globbable: 'GlobbableMixin',
  Bulkable: 'BulkableMixin',
  UnboundedSource: 'UnboundedSourceMixin',
  Engaged: 'EngagedMixin',
  Atmospheric: 'AtmosphericMixin',
  Addressable: 'AddressableMixin',
  SkyExposed: 'SkyExposedMixin',
  Soul: 'SoulMixin',
  Contacts: 'ContactsMixin',
  NotifyPolicy: 'NotifyPolicyMixin',
  SubjectSubscriber: 'SubjectSubscriberMixin',
  WarrenMember: 'WarrenMemberMixin',
  Lounge: 'LoungeMixin',
  FastTravel: 'FastTravelMixin',
  Fixture: 'FixtureMixin',
  LoadBearing: 'LoadBearingMixin',
  BeliefStore: 'BeliefStoreMixin',
  Disguisable: 'DisguisableMixin',
  DisguiseBearing: 'DisguiseBearingMixin',
  Status: 'StatusMixin',
  Identifiable: 'IdentifiableMixin',
  Metabolic: 'MetabolicMixin',
  NutritionLabel: 'NutritionLabelMixin',
  Thermal: 'ThermalMixin',
  ThermalRegulation: 'ThermalRegulationMixin',
  Respiration: 'RespirationMixin',
  // The cross-cutting wetness gauge — any Thing / body can be wet.
  Wet: 'WetMixin',
  // The living-world growth model — a cultivated thing that grows.
  Growing: 'GrowingMixin',
  // Ground that holds plants: soil + N plant slots. A pot is this at N = 1;
  // a garden bed is the same surface with a bigger N.
  Cultivable: 'CultivableMixin',
  // A thing that can be put in the ground and grows into something —
  // a seed, and equally a cutting / tuber / bulb once those exist.
  Plantable: 'PlantableMixin',
  Behaved: 'BehavedMixin',
  Graded: 'GradedMixin',
  // A physical thing that wears out with use (the condition/wear gauge).
  // Composed by tools, weapons, and armor alike — durability is not "tool".
  Durable: 'DurableMixin',
  // The working-surface (edge) wear axis — Durable's fast-cycling sibling.
  Keen: 'KeenMixin',
  Tool: 'ToolMixin',
  Crafted: 'CraftedMixin',
  Maker: 'MakerMixin',
  ManualBuild: 'ManualBuildMixin',
  Bank: 'BankMixin',
  // The unified credential holder — one keyed store of credentials-as-data,
  // composed on the born-with wallet app and on the physical cards.
  CredentialWallet: 'CredentialWalletMixin',
  // Haulage — a dragged container (cart) and the creature that pulls it.
  Haulable: 'HaulableMixin',
  Hauler: 'HaulerMixin',
  // Employment — the org chart (positions + holders + the appointing
  // authority), the Business that trades on top of it, and an actor's
  // employment relationships (an on-shift Position confers its duties via
  // augments). A ministry is an organization that does not trade.
  Organization: 'OrganizationMixin',
  Business: 'BusinessMixin',
  Employed: 'EmployedMixin',
  // Press — an organization that publishes: the realm it speaks in, the
  // reach of what it publishes, its feed branch, and which of its
  // positions may publish through it.
  Publisher: 'PublisherMixin',
  // Attendant — the universal storefront-attention substrate: a service-point
  // fixture holding the queue + being-attended leases (a server's attention).
  Attendant: 'AttendantMixin',
  // Combat — "I can fight": combat verb affordances + the innate-attack
  // hook. All fight state is session-scoped, never on the Creature.
  Combatant: 'CombatantMixin',
  // Combat-reactive — the instrument dynamics seam: the marker the combat
  // engine scans for, whose hooks fire at fixed beat-lifecycle points.
  CombatReactive: 'CombatReactiveMixin',
  // Party — "I can belong to a party": the sparse active-party pointer on
  // Avatars + the hireable Mercenary NPC. Combat's friend/foe seam reads it.
  PartyMember: 'PartyMemberMixin',
  // Electricity — "I am a source held at a potential": a live wire, a stun
  // baton, the deferred wall socket / Lightning bolt. Read by the
  // conduction walk (ElectricityApi) to impose a potential difference.
  Energized: 'EnergizedMixin',
  // Fire — "I can burn": flammable matter carrying a fuel reserve + a
  // Burning active state, driven past its (wetness-adjusted) ignition point
  // by the combustion driver (FireApi). Reads its material's
  // autoignitionTemperature / heatOfCombustion.
  Combustible: 'CombustibleMixin',
  // Phase change — "I can melt": a solid whose material melts past its
  // meltingPoint (a latent-heat plateau), flowing to a Bulkable liquid.
  // Driven by heat (ThermalApi.reconcilePhase), not fire-specific.
  Meltable: 'MeltableMixin',
  // Furnace — a Combustible-fuelled sustained heat source (forge/kiln/oven/
  // campfire): pinned hot while lit + fuelled, bellows-boosted, heats the
  // Meltables in its scope. Generalizes the Campfire pin.
  Furnace: 'FurnaceMixin',
  // Magic — the anatomical casting faculty (mana reserve + serenity
  // recovery + composure read + overchannel strain). Composed on
  // Character, gated: active only when the Species intrinsically confers
  // it (innateMixins) or an augment does. See docs/subsystems/magic.md.
  Caster: 'CasterMixin',
  // Arcane — "I produce magic-tagged effects, and here is my grid
  // footprint". The one shared declaration suppression, dispel, rarity
  // and the census all read. Sits BELOW distribution (Circulating reads
  // it, never declares it) and is named for the property, not the object
  // kind, so traps and NPC powers can wear it later. See D35.
  Arcane: 'ArcaneMixin',
  // Consumable — a discrete item packaging ONE act, which spends itself
  // performing it (scrolls, single-use wands). Deliberately NOT composed
  // with Bulkable: potions have volume and ride bulk instead (D4), which
  // keeps this concept small rather than universal.
  Consumable: 'ConsumableMixin',
  // Potable — a LIQUID that carries a working. Composes onto the
  // Material, not the flask, so the magic travels with the substance:
  // decanting, dilution, splitting and spilling are all real for free.
  Potable: 'PotableMixin',
  // Marked — a thing that bears marks (scroll, book, label, signpost),
  // carrying the modality they can be taken in through. `read` =
  // perceive + decode, and an embossed text reads in the dark. See D33.
  Marked: 'MarkedMixin',
  // Charged — a BATTERY: supplies energy AND specification, spends on
  // use, and LEAKS. The decay is load-bearing, not flavour: without it
  // stock grows without bound at any inflow throttle; with it, stock
  // settles at S* = inflow/d. The item is its own endpoint, so recoil
  // and waste heat land on it. See D5/D6/D7.
  Charged: 'ChargedMixin',
  Conduit: 'ConduitMixin',
  // Focus — supplies SPECIFICATION only; the user pays the energy and
  // is therefore the endpoint. Perishes by pattern rot on a much slower
  // schedule than charge: a binding is a state held away from
  // equilibrium. "Magic perishes, matter doesn't." See D9.
  // Blessable — the blessed/uncursed/cursed axis, as a potency level on
  // the item's OWN effect axis (never a hidden alignment tag). Opt-in
  // per template. The paradigm hidden-state axis, so also the paradigm
  // leak risk: stack identity keys on the per-viewer BUCKET, never the
  // true band. Cursed sticks — and a cursed CHARGED item discharges into
  // whoever is wearing it. See D11.
  Blessable: 'BlessableMixin',
  // Labelled — a player-written name on a thing. General annotation, not
  // a potions feature: it serves storage, shops and gifts too. It is the
  // fix for derived appearance's one cost — descriptors rotate, labels
  // do not, so a careful stash survives a turnover. See D28.
  Labelled: 'LabelledMixin',
  // Memorized — the specifications a mind is currently HOLDING. Claim
  // lives in the chronicle (append-only, right for "I read of this");
  // sharpness lives here, because it decays. Competence never fades;
  // specifications do. No slot count — interference is the limiter, so
  // Vancian preparation emerges instead of being imposed. See D15.
  Memorized: 'MemorizedMixin',
  // Circulating — "this is part of the world's stock, and here is how to
  // count it". Carries MATERIAL tags (place affinity) and a census key;
  // READS its effect tags from Arcane rather than declaring them, so a
  // ward never has to consult the distribution subsystem. See D21/D35.
  Circulating: 'CirculatingMixin',
} as const;

/**
 * Type for mixin names.
 */
export type MixinName = typeof Mixins[keyof typeof Mixins];

/**
 * How a mixin refuses, in the player's words.
 *
 * A command spec declares what a slot accepts with `requires:` (see
 * `FieldDefinition.requires`), and the framework synthesises the check.
 * The refusal sentence has to come from somewhere, and it belongs
 * **here** rather than on the arg: the phrase is a property of the
 * capability, not of the verb. `SealableMixin` means the same thing to
 * `open`, `close` and `knock`, and `VisibleMixin` is declared at 34 arg
 * sites — a per-arg phrase would be the same sentence copied 34 times,
 * drifting one edit at a time.
 *
 * ⭐ `{}` is the target's `getPresentation()`. It is a placeholder, not
 * a suffix rule, because the noun does not always land last: a thing
 * that can't be sealed reads `"a rock doesn't open and close"`, while
 * one with no visible face reads `"you can't see a rock"`. Both were
 * hand-written sentences before this map existed and both survive it
 * verbatim — the collapse was supposed to delete 34 files, not 34
 * carefully-worded refusals.
 *
 * ⚠ **Only kind refusals live here.** "Is this the kind of thing that
 * burns" belongs to the mixin; "is it currently alight", "is it within
 * reach", "do you own it" do not — those are the state and relation
 * axes, they change between one moment and the next, and they stay in
 * validators and controllers where they can. See
 * `docs/slates/builds/affordance-suggestion-slate.md` § 3.
 *
 * ⚠⚠ **This map is PARTIAL, and that is the hole `lint:arg-kinds`
 * closes.** Most of the 200-odd mixins will never be named by a
 * `requires:`, so a total `Record` would be absurd — which means
 * nothing in the type system says *"you added a constraint but no words
 * for it"*. A spec author can name any mixin at all.
 *
 * So the two halves are split deliberately:
 *
 *   - **at runtime**, a missing phrase falls back to a generic
 *     sentence. Worse copy, never a broken verb.
 *   - **at build**, `pnpm lint:arg-kinds --lint` FAILS on any mixin a
 *     spec requires without a phrase here, and prints the line to add.
 *     A `requires:` is a refusal players will hit, and a refusal they
 *     cannot act on is a dead end — so shipping the generic sentence is
 *     shipping a dead end.
 *
 * The gate also *reports* the reverse — a phrase nothing requires — but
 * does not fail on it: dead copy is harmless, and it may be sitting
 * there for a constraint about to be written.
 */
export const MixinRefusals: Partial<Record<MixinName, string>> = {
  // Perception / substance — the two broadest, and the reason the
  // phrases are templates: neither of these reads well as a suffix.
  VisibleMixin: "you can't see {}",
  TangibleMixin: "{} isn't tangible",

  // Containment & placement.
  ContainerMixin: "{} isn't a place",
  ContainableMixin: "{} can't be carried",
  SurfacedMixin: "{} isn't a surface you can put things on",

  // Boundaries & mechanisms.
  SealableMixin: "{} doesn't open and close",
  LockableMixin: "{} doesn't lock",
  SwitchableMixin: "{} doesn't switch on and off",
  FoldableMixin: "{} doesn't fold",
  HazardMixin: "{} isn't a trap",

  // Fire & heat. ⚠ `CombustibleMixin`'s phrase carries the whole
  // `CombustibleMixin|FurnaceMixin` alternation `ignite` declares — an
  // alternation reports its FIRST member's phrase, and "won't burn" is
  // the true sentence for both halves.
  CombustibleMixin: "{} won't burn",
  FurnaceMixin: "{} isn't a furnace",

  // Bodies & behavior.
  VitalsMixin: "{} isn't alive",
  BehavedMixin: "{} has nothing to say",
  PosturedMixin: "you can't change posture on {}",

  // Growing things.
  SlottableMixin: "{} doesn't sit in anything",
  CultivableMixin: "{} isn't ground you can plant in",
  GrowingMixin: "{} isn't growing",
  PlantableMixin: "{} isn't something you can plant",

  // Making & wear.
  ManualBuildMixin: "{} isn't a vessel you can work in",
  DurableMixin: "{} doesn't wear out",
  KeenMixin: "{} doesn't take an edge",
  WearableMixin: "{} isn't something you can wear",
  WieldableMixin: "{} isn't something you can wield",

  // Stacks, charges, marks, labels.
  GlobbableMixin: "{} doesn't come in stacks",
  ChargedMixin: "{} doesn't hold a charge",
  MarkedMixin: "{} doesn't carry a mark",
  LabelledMixin: "{} can't be labelled",

  // Conveyance & haulage.
  MountableMixin: "you can't ride {}",
  DrivableMixin: "you can't drive {}",
  HaulableMixin: "{} isn't something you can hitch",
  HaulerMixin: "{} can't pull a cart",

  // Storefronts.
  PricedOfferMixin: "{} isn't something with a price list",

  // Instruments — both of these sit on a slot that names the TOOL, not
  // the subject, so the phrase reads from the actor's side.
  ScryableMixin: "you can't scry with {}",
  CredentialWalletMixin: "{} isn't a card",
};
