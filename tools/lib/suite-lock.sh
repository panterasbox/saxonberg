# suite-lock.sh — the cross-worktree lock and the memory reserve, shared
# by tools/suite and tools/soak. Sourced, never run.
#
# ⭐ ONE lock and ONE reserve for everything that loads the box: a full
# test suite and a soak world both take minutes and gigabytes, and two of
# them at once is how a green tree reads as flake. So they queue behind
# the same lock beside the bare repo, and both leave the same reserve for
# the editor, the agents and a sibling's dev server.
#
# The caller sets, before sourcing:
#   WORKTREE   the worktree it runs for (written into the lock's owner)
#   ROOT       the directory holding the worktrees (the lock lives there)
#   WAIT       1 to queue behind a holder, 0 to exit 3 instead
#   TAG        the message prefix ("suite", "soak")
#
# Overridable by env: SUITE_LOCK (the lock dir), SUITE_RESERVE_GB.

LOCK=${SUITE_LOCK:-$ROOT/.suite.lock}
RESERVE_GB=${SUITE_RESERVE_GB:-4}   # left for the editor, the agents, a sibling's dev server

avail_mb() { awk '/^MemAvailable:/{print int($2/1024)}' /proc/meminfo; }

# `mkdir` is the atomic primitive every shell has. The holder writes its
# pid and worktree inside, so a stale lock can be told from a live one
# rather than guessed at — and a dead holder's lock is taken, not waited
# on, because the common way a lock goes stale here is `tools/panic`.

# Print "pid worktree" of a LIVE holder, or nothing. A stale lock (its
# holder gone) is cleared on the way.
lock_holder() {
  [ -d "$LOCK" ] || return 0
  holder=$(sed -n 1p "$LOCK/owner" 2>/dev/null)
  where=$(sed -n 2p "$LOCK/owner" 2>/dev/null)
  if [ -z "${holder:-}" ] || [ ! -d "/proc/$holder" ]; then
    echo "$TAG: clearing a stale lock (holder ${holder:-?} is gone)." >&2
    rm -rf "$LOCK"
    return 0
  fi
  echo "$holder ${where:-?}"
}

take_lock() {
  while :; do
    if mkdir "$LOCK" 2>/dev/null; then
      printf '%s\n%s\n' "$$" "$WORKTREE" > "$LOCK/owner"
      return 0
    fi
    h=$(lock_holder)
    [ -z "$h" ] && continue
    holder=${h%% *}
    where=${h#* }
    if [ "$WAIT" = 0 ]; then
      echo "$TAG: ${where} (pid $holder) holds the suite lock. --no-wait, so stopping." >&2
      exit 3
    fi
    echo "$TAG: waiting for ${where} (pid $holder) to finish..."
    sleep 20
  done
}

drop_lock() { [ -f "$LOCK/owner" ] && grep -qx "$$" "$LOCK/owner" 2>/dev/null && rm -rf "$LOCK"; }
