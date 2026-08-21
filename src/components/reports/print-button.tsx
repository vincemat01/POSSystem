"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="flex items-center gap-1.5 rounded-[8px] border border-border px-3 py-2 text-sm font-medium text-text-secondary hover:border-primary/40"
    >
      <Printer className="h-4 w-4" />
      Print
    </button>
  );
}
