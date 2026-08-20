"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Offline sales still work via IndexedDB even if the shell worker fails to register.
      });
    }
  }, []);

  return null;
}
