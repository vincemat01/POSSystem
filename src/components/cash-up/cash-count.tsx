"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { formatMoney } from "@/lib/utils";

export function CashCount({ expectedCash, currency }: { expectedCash: number; currency: string }) {
  const [counted, setCounted] = useState("");
  const countedNum = counted !== "" ? parseFloat(counted) : null;
  const variance = countedNum !== null ? countedNum - expectedCash : null;

  return (
    <Card className="space-y-3">
      <p className="text-sm font-semibold">Count the drawer</p>
      <div>
        <Label htmlFor="counted">Cash counted</Label>
        <Input
          id="counted"
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          placeholder={formatMoney(expectedCash, currency)}
          value={counted}
          onChange={(e) => setCounted(e.target.value)}
        />
      </div>
      {variance !== null && (
        <div
          className={`rounded-[10px] px-3 py-2 text-sm font-semibold ${
            variance === 0
              ? "bg-primary-light text-primary-dark"
              : variance > 0
                ? "bg-warning-light text-warning"
                : "bg-danger-light text-danger"
          }`}
        >
          {variance === 0
            ? "Drawer matches expected cash."
            : variance > 0
              ? `Over by ${formatMoney(variance, currency)}`
              : `Short by ${formatMoney(Math.abs(variance), currency)}`}
        </div>
      )}
    </Card>
  );
}
