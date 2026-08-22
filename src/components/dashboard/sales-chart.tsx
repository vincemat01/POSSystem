"use client";

import { formatMoney } from "@/lib/utils";

interface DayData {
  label: string;
  revenue: number;
  isToday: boolean;
}

export function SalesChart({ days, currency }: { days: DayData[]; currency: string }) {
  const max = Math.max(...days.map((d) => d.revenue), 1);

  return (
    <div className="flex items-end gap-1.5 h-28">
      {days.map((day) => {
        const height = Math.max((day.revenue / max) * 100, 4);
        return (
          <div key={day.label} className="flex flex-1 flex-col items-center gap-1">
            <div className="relative w-full flex justify-center" style={{ height: "100px" }}>
              <div
                className={`w-full max-w-[2rem] rounded-t-[4px] transition-all ${
                  day.isToday ? "bg-primary" : "bg-primary/25"
                }`}
                style={{ height: `${height}%`, position: "absolute", bottom: 0 }}
                title={formatMoney(day.revenue, currency)}
              />
            </div>
            <span className={`text-[10px] ${day.isToday ? "font-bold text-primary" : "text-text-secondary"}`}>
              {day.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
