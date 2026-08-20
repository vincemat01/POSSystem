"use client";

import { Printer, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ReceiptActions({ receiptText }: { receiptText: string }) {
  function handleWhatsApp() {
    const encoded = encodeURIComponent(receiptText);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  }

  return (
    <div className="flex gap-3 print:hidden">
      <Button variant="secondary" size="lg" className="flex-1" onClick={() => window.print()}>
        <Printer className="h-4 w-4" /> Print
      </Button>
      <Button size="lg" className="flex-1" onClick={handleWhatsApp}>
        <Share2 className="h-4 w-4" /> WhatsApp
      </Button>
    </div>
  );
}
