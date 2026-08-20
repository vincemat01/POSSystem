"use client";

import { useNetworkStatus } from "@/components/providers/network-provider";
import { cn } from "@/lib/utils";

export function NetworkStatusBadge() {
  const { online, pending, syncing } = useNetworkStatus();

  if (online && pending === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary">
        <span className="h-1.5 w-1.5 rounded-full bg-success" />
        Online
      </span>
    );
  }

  if (!online) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-xs font-medium text-warning",
          pending > 0 && "cursor-help",
        )}
        title={pending > 0 ? `${pending} sale${pending === 1 ? "" : "s"} waiting to sync` : undefined}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-warning" />
        Offline — sales continue
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary">
      <span className={cn("h-1.5 w-1.5 rounded-full bg-accent-gold", syncing && "animate-pulse")} />
      {syncing ? "Syncing…" : `${pending} waiting to sync`}
    </span>
  );
}
