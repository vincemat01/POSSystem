import { redirect } from "next/navigation";
import { getBusinessContext } from "@/lib/business-context";
import { AppShell } from "@/components/app-shell";
import { signOut } from "@/app/(auth)/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");

  return (
    <AppShell
      businessName={context.business.name}
      businessId={context.business.id}
      locationId={context.locationId}
      role={context.role}
      onSignOut={signOut}
    >
      {children}
    </AppShell>
  );
}
