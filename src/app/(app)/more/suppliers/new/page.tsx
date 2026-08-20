"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createSupplier, type SupplierFormState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

const initialState: SupplierFormState = {};

export default function NewSupplierPage() {
  const [state, formAction, pending] = useActionState(createSupplier, initialState);

  return (
    <div className="mx-auto max-w-md space-y-4 p-4 md:p-6">
      <Link href="/more/suppliers" className="inline-flex items-center gap-1 text-sm text-text-secondary">
        <ChevronLeft className="h-4 w-4" /> Back to Suppliers
      </Link>

      <h1 className="text-xl font-bold">Add Supplier</h1>

      <Card className="p-5">
        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="e.g. ABC Wholesalers" required autoFocus />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" type="tel" placeholder="Optional" />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="Optional" />
          </div>
          <div>
            <Label htmlFor="address">Address</Label>
            <Input id="address" name="address" placeholder="Optional" />
          </div>

          {state.error && (
            <p className="rounded-[10px] bg-danger-light px-3 py-2 text-sm text-danger">{state.error}</p>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={pending}>
            {pending ? "Saving…" : "Save supplier"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
