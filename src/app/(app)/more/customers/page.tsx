import { redirect } from "next/navigation";

// Customer records live in the Credit Book (spec §13-14 treats them as the same entity) — this
// route exists so the More menu link (spec §9) resolves somewhere sensible.
export default function CustomersRedirectPage() {
  redirect("/credit");
}
