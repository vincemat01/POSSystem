import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusinessContext } from "@/lib/business-context";
import { Card } from "@/components/ui/card";
import { CategoryList } from "@/components/settings/category-list";

export default async function CategoriesPage() {
  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");

  const canManage = context.role === "owner" || context.role === "manager";

  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, created_at")
    .eq("business_id", context.business.id)
    .order("name");

  const categoryIds = (categories ?? []).map((c) => c.id);

  let productCounts = new Map<string, number>();
  if (categoryIds.length > 0) {
    const { data: products } = await supabase
      .from("products")
      .select("category_id")
      .eq("business_id", context.business.id)
      .eq("active", true)
      .in("category_id", categoryIds);

    for (const p of products ?? []) {
      if (p.category_id) {
        productCounts.set(p.category_id, (productCounts.get(p.category_id) ?? 0) + 1);
      }
    }
  }

  const items = (categories ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    productCount: productCounts.get(c.id) ?? 0,
  }));

  return (
    <div className="mx-auto max-w-lg space-y-4 p-4 md:p-6">
      <Link href="/more/settings" className="inline-flex items-center gap-1 text-sm text-text-secondary">
        <ChevronLeft className="h-4 w-4" /> Settings
      </Link>

      <h1 className="text-xl font-bold">Categories</h1>

      {!canManage ? (
        <Card className="py-8 text-center text-sm text-text-secondary">
          Only owners and managers can manage categories.
        </Card>
      ) : (
        <CategoryList categories={items} />
      )}
    </div>
  );
}
