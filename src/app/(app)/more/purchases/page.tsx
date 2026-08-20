import Link from "next/link";
import { ChevronLeft, ShoppingBag } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function PurchasesPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
      <Link href="/more" className="inline-flex items-center gap-1 text-sm text-text-secondary">
        <ChevronLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="text-xl font-bold">Purchases</h1>
      <Card className="flex flex-col items-center gap-2 py-12 text-center">
        <ShoppingBag className="h-8 w-8 text-text-secondary" />
        <p className="text-sm font-medium">Not built yet</p>
        <p className="max-w-xs text-sm text-text-secondary">
          Receiving stock with cost, expiry and batch capture (spec Phase 3) isn&apos;t wired up in
          the UI yet — the purchases/inventory_batches schema and FEFO logic are ready for it.
        </p>
      </Card>
    </div>
  );
}
