import Link from "next/link";
import { moreNav } from "@/components/nav";
import { Card } from "@/components/ui/card";

export default function MorePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
      <h1 className="text-xl font-bold">More</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {moreNav.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="flex flex-col items-center gap-2 py-6 text-center hover:border-primary/30">
              <item.icon className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium">{item.label}</span>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
