# terminus

The core-city **locality pack** (residences D18): the terminal,
Counting-House Row, the general store, the Registry and the city
budget, homed whole out of the transitional world-seed. Package
`@saxonberg/content-terminus`; namespace root `/world/terminus`.

- `content/world/terminus/**` — the city's rows (the suburb is
  hinkley-hills' own pack, nested under this root).
- `src/**` — the parked classes the rows name (`TicketClerk`) and the
  city's integration suites.
- `pack.yaml` — the `terminus` municipality group + the four city
  parcels (terminal, counting-houses, general-store, registry).

saxonberg-lounge stays a dependency for one reason: the departure
terminal's route names `/world/lounge/thing/terminal`. The corpo edges
carry the counting-houses affiliations.
