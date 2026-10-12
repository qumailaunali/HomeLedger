"use client";

import type { QueuedRecord } from "@/server/actions/transactions";

/**
 * Records created while offline are kept in localStorage until they sync.
 * Each record carries a client-generated ID; the server treats that ID as an
 * idempotency key, so a retried or duplicated sync can never double-insert.
 */

const KEY = "homeledger.offline-queue.v1";
const EVENT = "homeledger:queue-changed";

export type PendingRecord = QueuedRecord & { queuedAt: string; label: string; error?: string };

export function readQueue(): PendingRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PendingRecord[]) : [];
  } catch {
    return [];
  }
}

function write(queue: PendingRecord[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(queue));
  } catch {
    // Storage full or blocked — nothing more we can do offline.
  }
  window.dispatchEvent(new Event(EVENT));
}

export function enqueue(record: PendingRecord) {
  const queue = readQueue().filter((r) => r.clientId !== record.clientId);
  write([...queue, record]);
}

export function removeFromQueue(clientIds: string[]) {
  const ids = new Set(clientIds);
  write(readQueue().filter((r) => !ids.has(r.clientId)));
}

export function markRejected(rejected: { clientId: string; error: string }[]) {
  const map = new Map(rejected.map((r) => [r.clientId, r.error]));
  write(readQueue().map((r) => (map.has(r.clientId) ? { ...r, error: map.get(r.clientId) } : r)));
}

export function subscribeQueue(callback: () => void) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/** True when an exception from a server action call means "could not reach the server". */
export function isNetworkError(err: unknown) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  return err instanceof TypeError || (err instanceof Error && /fetch|network|load failed/i.test(err.message));
}
