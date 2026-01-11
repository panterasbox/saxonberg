# PLAN.md Comprehensive Consistency Review

Generated: 2026-01-10
Document Size: 10,272 lines

## Executive Summary

Overall, the document is **well-structured and mostly consistent**. Found a few minor issues that should be addressed, and identified one framework needing more detail.

---

## 1. TERMINOLOGY CONSISTENCY ✅ Mostly Good

### Core Terms (Correctly Used Throughout)

**Three-Layer Object System** - Consistently defined and used:
- **Blueprint** = JavaScript class/prototype (the code)
- **Template** = JSON document in MongoDB (the configuration)
- **Clone** = Runtime instance in memory (the actual object)

**Identifiers**:
- `stuffId` = Runtime instance identifier (used consistently)
- `templateKey` = MongoDB document `_id` (used consistently)
- Blueprint reference format: `[package]:[path]#[export]` (used consistently)

**Object Hierarchy**:
- Stuff → Idea → User, Player, GoogleProfile, Interactive
- Stuff → Agent → Character → Avatar, NPCs
- Thing, Location, Receptacle (all extend Stuff)

### Minor Terminology Issues

1. **"CommandGiver" vs "CommandGiverMixin"** - Used inconsistently
   - Line 3988: "Phase 4: Sensor, Vocal, CommandGiver" (no Mixin suffix)
   - Line 6090: "class CommandGiverMixin {" (has Mixin suffix)
   - Line 9329: "**CommandGiver Mixin**" (space instead of no space)

   **Recommendation**: Use `CommandGiverMixin` consistently (matches other mixins: NamedMixin, GenderedMixin, etc.)

2. **Framework numbering out of order in document** - Not an error, but confusing:
   - Document order: 1, 2, 3, 9, 4, 5, 6, 7, 8, 10, 11, 12
   - This happened because we added hot-reloading (Framework 9) late

   **Recommendation**: Either renumber frameworks in document order, OR add a note explaining they're numbered by conceptual dependencies, not document order.

---

## 2. CROSS-REFERENCE CONSISTENCY ✅ Good

All framework cross-references checked and valid:
- Framework 2 (Persistence) referenced correctly in multiple phases
- Framework 3 (Object Lifecycle) referenced correctly
- Framework 7 (MQL) vs Framework 8 (Event) vs Framework 10 (Command) - all correct
- Framework 11 (Prompt Stack) referenced correctly in client section
- Framework 12 (Sandboxing) referenced correctly in Phase 9-10

No broken references found.

---

## 3. MIXIN NAMING CONSISTENCY ✅ Good

All mixins follow `<Name>Mixin` pattern:
- ✅ NamedMixin (14 occurrences)
- ✅ GlobbedMixin (12 occurrences)
- ✅ GenderedMixin (9 occurrences)
- ✅ VisibleMixin (6 occurrences)
- ✅ PropertiedMixin (6 occurrences)
- ✅ ContainerMixin, ContainableMixin, DetailedMixin, etc.

Exception: CommandGiver sometimes missing "Mixin" suffix (see issue #1 above)

---

## 4. PHASE CONSISTENCY ✅ Good

### Phase Dependencies
All phase dependencies are correctly specified:
- Phase 0: Skeleton (no dependencies)
- Phase 1: Core Infrastructure (depends on Phase 0)
- Phase 2: Identity Models (depends on Phase 1 + Framework 5 Mixin)
- Phase 3: Starting Room (depends on Phase 2)
- Phase 4: Commands (depends on Phase 3 + Framework 10)
- Phase 5: Communications **MVP COMPLETE** (depends on Phase 4)
- Phases 6-10: Post-MVP enhancements

### MVP Milestone Definition
Clearly stated after Phase 5:
> **🎉 MVP COMPLETE!** Users can log in and talk to each other!

This is consistent throughout the document.

---

## 5. API/INTERFACE CONSISTENCY ✅ Good

### CommandController Interface
All examples use consistent signature after update:
```typescript
abstract class CommandController<TModel extends CommandModel = CommandModel> {
  abstract execute(model: TModel, context: CommandContext): CommandResult;
}
```

### CommandContext Interface
Used consistently throughout:
```typescript
interface CommandContext {
  avatar: Avatar;
  interactive: Interactive;
  location: Location;
  commandText: string;
  executionId: string;
}
```

### CommandResult Interface
Used consistently:
```typescript
interface CommandResult {
  success: boolean;
  output?: { text: string };
  error?: string;
  model?: Record<string, any>;  // For piping (Phase 9+)
}
```

---

## 6. FRAMEWORK DETAIL LEVELS ⚠️ ONE ISSUE

### Well-Detailed Frameworks (100-600+ lines each)
- ✅ Framework 2: Persistence (detailed with auto-sync, Thing persistence notes)
- ✅ Framework 3: Object Lifecycle (comprehensive CMS integration)
- ✅ Framework 4: Call Security (comprehensive shadow system)
- ✅ Framework 5: Mixin (complete mixin architecture)
- ✅ Framework 7: MQL (detailed BNF grammar, 3 phases)
- ✅ Framework 9: Hot-Reload (detailed with recreate patterns)
- ✅ Framework 10: Command (1000+ lines - very detailed)
- ✅ Framework 11: Prompt Stack (detailed client/server integration)
- ✅ Framework 12: Sandboxing (very detailed, production-ready)

### LIGHT Framework (needs more detail)

**⚠️ Framework 8: Event System** (~50 lines)

**Current Coverage**:
- Symbol-based event keys ✅
- Basic subscribe/dispatch pattern ✅
- WellKnownEvents enum ✅
- Event lifecycle (4 steps) ✅
- Future extensions noted ✅

**Missing Details** (compared to peer frameworks):
- EventApi full interface definition
- Event subscription management (unsubscribe, once)
- Event error handling details
- Event ordering/priorities
- Async vs sync event handlers
- Event payload validation
- Memory management (subscription cleanup)
- Integration examples with other frameworks
- Testing strategies

**Recommendation**: Expand Framework 8 to ~200-300 lines with:
1. Complete EventApi interface
2. Subscription lifecycle management
3. Error handling patterns
4. Integration examples (e.g., how commands dispatch events)
5. Performance considerations
6. Testing approach

### Adequately Detailed Frameworks
- ✅ Framework 1: Message Protocol (~40 lines - appropriate for simple protocol)
- ✅ Framework 6: API Layer (~100 lines - clear principles)

---

## 7. CODE EXAMPLE CONSISTENCY ✅ Good

All code examples follow these patterns:

### TypeScript Style
- ✅ Strict typing throughout
- ✅ Interface definitions before usage
- ✅ Consistent use of async/await
- ✅ Consistent error handling patterns

### Command Examples
All command examples updated to use typed models:
```typescript
interface SayModel extends CommandModel { ... }
class SayController extends CommandController<SayModel> { ... }
```

### Mixin Examples
All follow higher-order function pattern:
```typescript
function NamedMixin<T extends Constructor<Base>>(base: T) {
  class Named extends base { ... }
  MixinApi.registerMixin(Named.prototype, Mixins.Named);
  return Named;
}
```

---

## 8. SPECIAL CASES & CAVEATS ✅ Well Documented

### Properly Documented Special Cases
- ✅ Money/Currency: Marked as "special case, needs separate design"
- ✅ Globbing: Detailed section with GlobbedMixin vs multi-object selection distinction
- ✅ Shadow Persistence: Acknowledged complexity in Framework 2
- ✅ Hot-Reload Behavior: Clear that existing clones keep old prototype
- ✅ PropertiedMixin: "DO NOT let objects add properties willy-nilly"

---

## 9. CHECKLIST CONSISTENCY ✅ Good

### Phase Checklists
All phases have clear implementation checklists:
- Phase 4: [ ] items for MVP features
- Phase 5: [ ] items for communications
- Phase 8: [ ] items for advanced features
- Phase 9-10: [ ] items for production readiness

### Verification Checklists
Each phase has numbered verification steps (1. ✅ Can do X, 2. ✅ Can do Y, etc.)

---

## 10. REDUNDANCIES Found

### Acceptable Redundancies (intentional, for clarity)
1. Three-Layer Object System explained in:
   - Key Architectural Insights (detailed)
   - Framework 3 (implementation focus)
   - **Justification**: Different audiences, different levels of detail ✅

2. Blueprint Reference Notation explained in:
   - Key Architectural Insights (complete syntax)
   - Framework 3 (usage examples)
   - **Justification**: Reference vs implementation ✅

3. CommandModel interface defined multiple times:
   - Framework 10 (base interface)
   - Multiple command examples (specific models)
   - **Justification**: Base vs specific types ✅

### Potential Redundancy (minor)
PropertiedMixin usage note appears in:
- Framework 2 (Thing persistence section)
- Phase 6 (PropertiedMixin definition)

**Recommendation**: This is fine - first is context, second is definition.

---

## 11. CONTRADICTIONS/DISCREPANCIES Found

### None Found ✅

Checked for contradictions in:
- Object lifecycle descriptions
- Persistence behavior
- Hot-reload behavior
- Mixin application order
- Framework dependencies

All descriptions are consistent across references.

---

## 12. AREAS LIGHT ON DETAIL

### Critical: Framework 8 (Event System)
See Section 6 above - needs expansion.

### Optional Enhancement Opportunities

1. **Framework 1: Message Protocol** - Currently ~40 lines
   - Could add more WebSocket message types
   - Could add reconnection strategy
   - **Assessment**: Adequate for MVP, expand in Phase 5+ if needed

2. **Phase 3: Starting Room** - Currently focuses on single location
   - Could add more examples of room descriptions
   - Could add more details on "look" command output formatting
   - **Assessment**: Adequate for MVP, more examples emerge naturally in Phase 7

3. **Framework 6: API Layer** - Principles are clear, but:
   - Could add more API categories with examples
   - Could add guidelines for creating new APIs
   - **Assessment**: Good foundation, expand as APIs are built

---

## 13. POTENTIAL ISSUES FOR "CODING MODE"

### Document Size
At 10,272 lines, this may be challenging to feed into context. Consider:

**Option A: Feed Entire Document** (if context allows)
- Pros: Complete picture, no missing references
- Cons: May exceed context limits

**Option B: Feed by Phase**
- Start: General Guidelines + All Frameworks
- Then: Phase 0 (skeleton)
- Then: Phase 1 (infrastructure)
- Continue phase by phase
- Pros: More manageable chunks
- Cons: May need to reference back to frameworks

**Option C: Feed by System**
- Session 1: Core Architecture (Frameworks 1-6)
- Session 2: Command System (Framework 10 + Phase 4)
- Session 3: Identity System (Framework 2 + Phase 2)
- Session 4: Location System (Phase 3, 7)
- etc.
- Pros: Logical groupings
- Cons: Cross-cutting concerns may be split

**Recommendation**: Start with Option B (phase-by-phase) since phases have clear dependencies.

### Missing Implementation Guides
The plan has WHAT to build but not always HOW to build it. Consider adding:

1. **File structure conventions** - Where do files go?
   - Already have basic structure in Phase 0 ✅
   - But could add more detail on where new files go in each phase

2. **Testing approach** - How to verify each phase?
   - Each phase has verification checklist ✅
   - But could add more detail on HOW to test (unit tests, integration tests, etc.)

3. **Error handling patterns** - What's the standard approach?
   - Some examples exist ✅
   - But could add framework-wide error handling guide

**Assessment**: These can be addressed during implementation or as separate guides.

---

## 14. FINAL RECOMMENDATIONS

### Must Fix (Before Starting Implementation)

1. **Expand Framework 8: Event System**
   - Add ~150-200 lines of detail to match peer frameworks
   - Include EventApi interface, subscription management, examples

2. **Fix CommandGiver naming inconsistency**
   - Use "CommandGiverMixin" throughout (add "Mixin" suffix where missing)
   - Update lines 3988, 9329

### Should Fix (Nice to Have)

3. **Add Framework Ordering Note**
   - Add note at top of "Support Frameworks" section explaining numbering vs ordering
   - OR renumber frameworks in document order (more work)

### Optional Enhancements

4. **Add "Feeding into Coding Mode" Section**
   - Create a section at end of document suggesting how to break it up
   - Phase-by-phase approach with framework references

5. **Create Separate "Implementation Guide"**
   - Extract file structure, testing approach, error patterns into separate doc
   - Keep PLAN.md focused on WHAT, new doc focused on HOW

---

## 15. OVERALL ASSESSMENT

### Document Quality: A- (Excellent)

**Strengths**:
- ✅ Comprehensive coverage of all systems
- ✅ Clear architectural vision
- ✅ Consistent terminology (with minor exceptions)
- ✅ Well-structured progression (Phase 0 → MVP → Post-MVP)
- ✅ Good balance of theory and practical examples
- ✅ Clear MVP definition
- ✅ Framework interdependencies well-documented

**Areas for Improvement**:
- ⚠️ Framework 8 needs expansion (only major issue)
- ⚠️ CommandGiver naming inconsistency (minor issue)
- ℹ️ Framework ordering could use explanation (cosmetic issue)

**Readiness for Implementation**: 95%

The document is ready for implementation after expanding Framework 8. The other issues are minor and won't block progress.

---

## 16. SPECIFIC FIXES NEEDED

### Fix #1: Framework 8 Expansion (REQUIRED)

Add to Framework 8 (~200 lines):

```typescript
// Complete EventApi interface
class EventApi {
  // Core subscription methods
  static subscribe(event: symbol, handler: EventHandler): Subscription
  static unsubscribe(subscription: Subscription): void
  static once(event: symbol, handler: EventHandler): void

  // Dispatch methods
  static dispatch(event: symbol, payload: any): void
  static dispatchAsync(event: symbol, payload: any): Promise<void>

  // Error handling
  static setErrorHandler(handler: ErrorHandler): void

  // Subscription management
  static getAllSubscriptions(): Subscription[]
  static clearAllSubscriptions(): void
}

// Subscription lifecycle
interface Subscription {
  event: symbol;
  handler: EventHandler;
  unsubscribe(): void;
}

// Integration examples
// 1. Command dispatches event
class SayController {
  execute(...) {
    // ... say logic ...
    EventApi.dispatch(WellKnownEvents.MessageSent, {
      speaker: avatar,
      message,
      location
    });
  }
}

// 2. Achievement system listens for events
EventApi.subscribe(WellKnownEvents.MessageSent, (payload) => {
  AchievementSystem.checkChatAchievements(payload.speaker);
});

// Error handling pattern
EventApi.setErrorHandler((error, event, handler) => {
  MudlogApi.error('events', `Error in ${event.toString()}: ${error.message}`);
  // Don't crash - just log and continue
});
```

Add sections:
- Subscription Lifecycle Management
- Error Handling Patterns
- Memory Management (cleanup on disconnect)
- Testing Strategy
- Integration with Other Frameworks

### Fix #2: CommandGiver Naming (MINOR)

Replace:
- Line 3988: "CommandGiver" → "CommandGiverMixin"
- Line 9329: "**CommandGiver Mixin**" → "**CommandGiverMixin**"

### Fix #3: Framework Ordering Note (COSMETIC)

Add at line 1478 (before "# Support Frameworks"):

```markdown
**Note on Framework Numbering**: Frameworks are numbered by conceptual/dependency order, not document order. Framework 9 (Hot-Reloading) appears after Framework 3 because it depends on the object system being defined first, even though we discuss it earlier in the document for architectural clarity.
```

---

## CONCLUSION

The PLAN.md document is **comprehensive, well-structured, and 95% ready** for implementation.

**Required before coding**: Expand Framework 8 (Event System).

**Recommended before coding**: Fix CommandGiver naming inconsistency.

**Optional**: Add framework ordering note, create separate implementation guide.

The document provides excellent architectural guidance and should serve well as a reference during implementation.
