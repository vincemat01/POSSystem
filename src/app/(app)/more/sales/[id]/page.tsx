import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusinessContext } from "@/lib/business-context";
import { Card } from "@/components/ui/card";
import { formatMoney, formatDateTime } from "@/lib/utils";
import { ReceiptActions } from "@/components/sales/receipt-actions";

const METHOD_LABEL: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  eft: "EFT",
  credit: "Credit",
  other: "Other",
};

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");

  const supabase = await createClient();
  const { business } = context;

  const { data: businessDetails } = await supabase
    .from("businesses")
    .select("name, address, phone, receipt_footer")
    .eq("id", business.id)
    .maybeSingle();

  // Accept either the sale's real id or its client_transaction_id — the POS navigates here right
  // after checkout using the client id, since the server-generated sale id isn't known client-side.
  const { data: sale } = await supabase
    .from("sales")
    .select("*")
    .eq("business_id", business.id)
    .or(`id.eq.${id},client_transaction_id.eq.${id}`)
    .maybeSingle();

  if (!sale) notFound();

  const [{ data: items }, { data: payments }, { data: customer }] = await Promise.all([
    supabase
      .from("sale_items")
      .select("id, product_id, quantity, unit_price, discount, line_total")
      .eq("sale_id", sale.id)
      .eq("business_id", business.id),
    supabase
      .from("payments")
      .select("id, method, amount, tendered_amount, change_amount")
      .eq("sale_id", sale.id)
      .eq("business_id", business.id),
    sale.customer_id
      ? supabase.from("customers").select("name, phone").eq("id", sale.customer_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const productIds = [...new Set((items ?? []).map((i) => i.product_id))];
  const { data: products } =
    productIds.length > 0
      ? await supabase.from("products").select("id, name, unit").in("id", productIds)
      : { data: [] };
  const productMap = new Map((products ?? []).map((p) => [p.id, p]));

  const { data: creditTxn } = sale.customer_id
    ? await supabase
        .from("credit_transactions")
        .select("due_date")
        .eq("sale_id", sale.id)
        .eq("type", "credit_sale")
        .maybeSingle()
    : { data: null };

  return (
    <div className="mx-auto max-w-md space-y-4 p-4 md:p-6 print:max-w-full">
      <Link href="/more/sales" className="inline-flex items-center gap-1 text-sm text-text-secondary print:hidden">
        <ChevronLeft className="h-4 w-4" /> Back to sales
      </Link>

      <Card className="space-y-4">
        <div className="text-center">
          <p className="text-lg font-bold">{businessDetails?.name ?? business.name}</p>
          {businessDetails?.address && <p className="text-xs text-text-secondary">{businessDetails.address}</p>}
          {businessDetails?.phone && <p className="text-xs text-text-secondary">{businessDetails.phone}</p>}
        </div>

        <div className="border-t border-dashed border-border pt-3 text-center">
          <p className="text-sm font-semibold">{sale.sale_number}</p>
          <p className="text-xs text-text-secondary">{formatDateTime(sale.sold_at)}</p>
          {sale.status !== "completed" && (
            <p className="mt-1 text-xs font-semibold uppercase text-warning">{sale.status.replace("_", " ")}</p>
          )}
        </div>

        {customer && (
          <p className="text-xs text-text-secondary">
            Customer: {customer.name}
            {customer.phone ? ` (${customer.phone})` : ""}
          </p>
        )}

        <div className="border-t border-dashed border-border pt-3 space-y-2">
          {(items ?? []).map((item) => {
            const product = productMap.get(item.product_id);
            return (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <div>
                  <p>{product?.name ?? "Unknown product"}</p>
                  <p className="text-xs text-text-secondary">
                    {item.quantity} {product?.unit ?? ""} × {formatMoney(item.unit_price, business.currency)}
                    {item.discount > 0 ? ` − ${formatMoney(item.discount, business.currency)}` : ""}
                  </p>
                </div>
                <p className="font-medium">{formatMoney(item.line_total, business.currency)}</p>
              </div>
            );
          })}
        </div>

        <div className="border-t border-dashed border-border pt-3 space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">Subtotal</span>
            <span>{formatMoney(sale.subtotal, business.currency)}</span>
          </div>
          {sale.discount_total > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Discount</span>
              <span>−{formatMoney(sale.discount_total, business.currency)}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-base font-bold">
            <span>Total</span>
            <span>{formatMoney(sale.total, business.currency)}</span>
          </div>
        </div>

        <div className="border-t border-dashed border-border pt-3 space-y-1">
          {(payments ?? []).map((p) => (
            <div key={p.id}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">{METHOD_LABEL[p.method] ?? p.method}</span>
                <span>{formatMoney(p.amount, business.currency)}</span>
              </div>
              {p.tendered_amount !== null && (
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span>Received {formatMoney(p.tendered_amount, business.currency)}</span>
                  <span>Change {formatMoney(p.change_amount ?? 0, business.currency)}</span>
                </div>
              )}
            </div>
          ))}
          {creditTxn?.due_date && (
            <p className="pt-1 text-xs text-text-secondary">Payment due: {formatDateTime(creditTxn.due_date)}</p>
          )}
        </div>

        {businessDetails?.receipt_footer && (
          <p className="border-t border-dashed border-border pt-3 text-center text-xs text-text-secondary">
            {businessDetails.receipt_footer}
          </p>
        )}
      </Card>

      <ReceiptActions receiptText={buildReceiptText()} />
    </div>
  );

  function buildReceiptText() {
    const s = sale!;
    const lines: string[] = [];
    const bName = businessDetails?.name ?? business.name;
    lines.push(bName);
    if (businessDetails?.address) lines.push(businessDetails.address);
    if (businessDetails?.phone) lines.push(businessDetails.phone);
    lines.push("");
    lines.push(`Receipt: ${s.sale_number}`);
    lines.push(`Date: ${formatDateTime(s.sold_at)}`);
    if (customer) lines.push(`Customer: ${customer.name}${customer.phone ? ` (${customer.phone})` : ""}`);
    lines.push("");

    for (const item of items ?? []) {
      const product = productMap.get(item.product_id);
      const name = product?.name ?? "Product";
      const disc = item.discount > 0 ? ` -${formatMoney(item.discount, business.currency)}` : "";
      lines.push(`${item.quantity} x ${name} @ ${formatMoney(item.unit_price, business.currency)}${disc} = ${formatMoney(item.line_total, business.currency)}`);
    }

    lines.push("");
    if (s.discount_total > 0) {
      lines.push(`Subtotal: ${formatMoney(s.subtotal, business.currency)}`);
      lines.push(`Discount: -${formatMoney(s.discount_total, business.currency)}`);
    }
    lines.push(`*Total: ${formatMoney(s.total, business.currency)}*`);
    lines.push("");

    for (const p of payments ?? []) {
      lines.push(`${METHOD_LABEL[p.method] ?? p.method}: ${formatMoney(p.amount, business.currency)}`);
      if (p.tendered_amount !== null) {
        lines.push(`  Received ${formatMoney(p.tendered_amount, business.currency)} | Change ${formatMoney(p.change_amount ?? 0, business.currency)}`);
      }
    }

    if (creditTxn?.due_date) lines.push(`Payment due: ${formatDateTime(creditTxn.due_date)}`);
    if (businessDetails?.receipt_footer) {
      lines.push("");
      lines.push(businessDetails.receipt_footer);
    }

    return lines.join("\n");
  }
}
