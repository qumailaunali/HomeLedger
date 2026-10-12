"use client";

import * as React from "react";
import { CloudOff, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { syncOfflineRecords } from "@/server/actions/transactions";
import { markRejected, readQueue, removeFromQueue, subscribeQueue, type PendingRecord } from "@/lib/offline-queue";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";

function useQueue() {
  const [queue, setQueue] = React.useState<PendingRecord[]>([]);
  React.useEffect(() => {
    const update = () => setQueue(readQueue());
    update();
    return subscribeQueue(update);
  }, []);
  return queue;
}

function useOnline() {
  return React.useSyncExternalStore(
    (cb) => {
      window.addEventListener("online", cb);
      window.addEventListener("offline", cb);
      return () => {
        window.removeEventListener("online", cb);
        window.removeEventListener("offline", cb);
      };
    },
    () => navigator.onLine,
    () => true,
  );
}

/**
 * Shows an offline banner and the count of records waiting to sync, and
 * syncs them automatically when the connection comes back.
 */
export function OfflineSync() {
  const queue = useQueue();
  const online = useOnline();
  const toast = useToast();
  const [syncing, setSyncing] = React.useState(false);
  const busy = React.useRef(false);

  const sync = React.useCallback(async () => {
    const pending = readQueue().filter((r) => !r.error);
    if (busy.current || !pending.length || !navigator.onLine) return;
    busy.current = true;
    setSyncing(true);
    try {
      const res = await syncOfflineRecords(pending.map(({ kind, clientId, payload }) => ({ kind, clientId, payload }) as PendingRecord));
      if (res.ok) {
        removeFromQueue(res.data.synced);
        if (res.data.rejected.length) markRejected(res.data.rejected);
        if (res.data.synced.length) {
          toast.success(`${res.data.synced.length} offline record${res.data.synced.length === 1 ? "" : "s"} synced`);
        }
      }
    } catch {
      // Still offline — try again on the next "online" event.
    } finally {
      busy.current = false;
      setSyncing(false);
    }
  }, [toast]);

  React.useEffect(() => {
    if (online) void sync();
  }, [online, sync, queue.length]);

  const rejected = queue.filter((r) => r.error);
  if (online && queue.length === 0) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-3 sm:px-6 lg:px-8" role="status">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-warning/30 bg-warning-soft px-3.5 py-2.5 text-sm">
        {syncing ? <Loader2 className="size-4 animate-spin text-warning" aria-hidden /> : <CloudOff className="size-4 text-warning" aria-hidden />}
        <span className="flex-1">
          {!online && "You're offline. "}
          {queue.length > 0
            ? `${queue.length - rejected.length} record${queue.length - rejected.length === 1 ? "" : "s"} waiting to sync.`
            : "Previously loaded pages are still available."}
          {rejected.length > 0 && ` ${rejected.length} could not be saved (${rejected[0].error}).`}
        </span>
        {online && queue.length - rejected.length > 0 && (
          <Button size="sm" variant="outline" onClick={sync} disabled={syncing}>
            <RefreshCw /> Sync now
          </Button>
        )}
        {rejected.length > 0 && (
          <Button size="sm" variant="ghost" onClick={() => removeFromQueue(rejected.map((r) => r.clientId))}>
            <Trash2 /> Discard failed
          </Button>
        )}
      </div>
    </div>
  );
}
