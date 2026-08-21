import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getBusinessContext } from "@/lib/business-context";
import { ProfileForm } from "@/components/staff/profile-form";

export default async function ProfilePage() {
  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");

  return (
    <div className="mx-auto max-w-lg space-y-4 p-4 md:p-6">
      <Link href="/more" className="inline-flex items-center gap-1 text-sm text-text-secondary">
        <ChevronLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="text-xl font-bold">My Profile</h1>
      <ProfileForm currentName={context.displayName ?? ""} />
    </div>
  );
}
