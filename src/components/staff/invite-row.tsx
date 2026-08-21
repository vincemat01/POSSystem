"use client";

import { useState } from "react";
import { deleteInvite } from "@/app/(app)/more/staff/actions";
import { Card } from "@/components/ui/card";

interface InviteRowProps {
  invite: {
    id: string;
    code: string;
    role: string;
    expiresAt: string;
  };
}

export function InviteRow({ invite }: InviteRowProps) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    await deleteInvite(invite.id);
  }

  return (
    <Card className="flex items-center justify-between">
      <div>
        <p className="font-mono text-sm font-bold tracking-widest">{invite.code}</p>
        <p className="text-xs text-text-secondary">
          {invite.role} · Expires {invite.expiresAt}
        </p>
      </div>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="text-xs font-medium text-danger hover:text-danger/80"
      >
        {deleting ? "…" : "Revoke"}
      </button>
    </Card>
  );
}
