"use client";

import { useState } from "react";
import { updateMemberRole, removeMember } from "@/app/(app)/more/staff/actions";
import { Card } from "@/components/ui/card";

interface MemberProps {
  member: {
    id: string;
    email: string;
    role: string;
    roleLabel: string;
    isCurrentUser: boolean;
  };
  isOwner: boolean;
}

const ROLES = [
  { value: "manager", label: "Manager" },
  { value: "cashier", label: "Cashier" },
  { value: "stock_manager", label: "Stock Manager" },
];

export function MemberRow({ member, isOwner }: MemberProps) {
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canEdit = isOwner && !member.isCurrentUser && member.role !== "owner";

  async function handleRoleChange(newRole: string) {
    const fd = new FormData();
    fd.set("member_id", member.id);
    fd.set("role", newRole);
    const result = await updateMemberRole({ success: false }, fd);
    if (result.error) setError(result.error);
  }

  async function handleRemove() {
    if (!confirm("Remove this staff member?")) return;
    setRemoving(true);
    const result = await removeMember(member.id);
    if (result.error) {
      setError(result.error);
      setRemoving(false);
    }
  }

  return (
    <Card className="flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold">
          {member.email}
          {member.isCurrentUser && <span className="ml-1 text-xs font-normal text-text-secondary">(you)</span>}
        </p>
        {canEdit ? (
          <select
            value={member.role}
            onChange={(e) => handleRoleChange(e.target.value)}
            className="mt-0.5 rounded border border-border bg-surface px-1.5 py-0.5 text-xs text-text-secondary"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-xs text-text-secondary">{member.roleLabel}</p>
        )}
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>
      {canEdit && (
        <button
          type="button"
          onClick={handleRemove}
          disabled={removing}
          className="text-xs font-medium text-danger hover:text-danger/80"
        >
          {removing ? "Removing…" : "Remove"}
        </button>
      )}
    </Card>
  );
}
