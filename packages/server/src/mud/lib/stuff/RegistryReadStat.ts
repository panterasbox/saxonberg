/**
 * RegistryReadStat — **what one wide read of the object registry cost.**
 *
 * The registry can be read two ways that are not about a single object:
 * `StuffApi.findByMixin` (a composition bucket) and
 * `StuffApi.getAllObjects` (all of it). Both are gated, and both count
 * themselves here, keyed by the `(template, method)` pair the gate
 * resolved — so the answer to *"which reader is getting expensive"* is
 * a table rather than a profiler run after somebody complains.
 *
 * ⚠ **Process-local.** It resets on restart. A freshly-booted server
 * reads as all zeros, which looks identical to "nothing scans" and is
 * the opposite of the finding — so read it from a server that has been
 * up a while.
 *
 * See `StuffApi.registryReadStats` and the `/stats` endpoint.
 */
export interface RegistryReadStat {
  /** `"<template>#<method>"` — the function the gate admitted. */
  reader: string;
  /** How many times it was admitted. */
  calls: number;
  /** Objects read across all of them. */
  returned: number;
  /** ⭐ The load-bearing column: the largest single read. */
  maxReturned: number;
  /** Wall-clock ms of the most recent read. */
  lastAt: number;
}
