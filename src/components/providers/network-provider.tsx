"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onSyncStateChange, startAutoSync, type SyncState } from "@/lib/offline/sync";
import { syncCatalog } from "@/lib/offline/catalog-sync";

interface NetworkContextValue extends SyncState {
  online: boolean;
}

const NetworkContext = createContext<NetworkContextValue>({
  online: true,
  pending: 0,
  syncing: false,
  lastError: null,
});

export function useNetworkStatus() {
  return useContext(NetworkContext);
}

export function NetworkProvider({
  businessId,
  locationId,
  children,
}: {
  businessId: string;
  locationId: string;
  children: React.ReactNode;
}) {
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const [syncState, setSyncState] = useState<SyncState>({ pending: 0, syncing: false, lastError: null });

  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      void syncCatalog(businessId, locationId);
    };
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    const unsubscribe = onSyncStateChange(setSyncState);
    const stopAutoSync = startAutoSync();

    void syncCatalog(businessId, locationId);
    const catalogInterval = window.setInterval(() => void syncCatalog(businessId, locationId), 60_000);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      unsubscribe();
      stopAutoSync();
      window.clearInterval(catalogInterval);
    };
  }, [businessId, locationId]);

  return <NetworkContext.Provider value={{ online, ...syncState }}>{children}</NetworkContext.Provider>;
}
