"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <Button variant="secondary" size="lg" className="w-full print:hidden" onClick={() => window.print()}>
      <Printer className="h-4 w-4" /> Print receipt
    </Button>
  );
}
