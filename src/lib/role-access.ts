import type { BusinessRole } from "@/lib/supabase/types";

const ROLE_PERMISSIONS: Record<BusinessRole, Set<string>> = {
  owner: new Set([
    "pos", "sales", "products", "inventory", "stock_take", "suppliers",
    "purchases", "customers", "credit", "expenses", "reports", "expiry",
    "staff", "settings", "categories", "cash_up", "shifts", "profile", "audit_log",
  ]),
  manager: new Set([
    "pos", "sales", "products", "inventory", "stock_take", "suppliers",
    "purchases", "customers", "credit", "expenses", "reports", "expiry",
    "staff", "categories", "cash_up", "shifts", "profile", "audit_log",
  ]),
  cashier: new Set([
    "pos", "sales", "customers", "credit", "cash_up", "shifts", "profile",
  ]),
  stock_manager: new Set([
    "pos", "sales", "products", "inventory", "stock_take", "suppliers",
    "purchases", "expiry", "cash_up", "shifts", "profile",
  ]),
};

export function hasPermission(role: BusinessRole, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

const PATH_PERMISSIONS: Record<string, string> = {
  "/sale": "pos",
  "/more/sales": "sales",
  "/products": "products",
  "/more/inventory": "inventory",
  "/more/stock-take": "stock_take",
  "/more/suppliers": "suppliers",
  "/more/purchases": "purchases",
  "/more/customers": "customers",
  "/credit": "credit",
  "/more/expenses": "expenses",
  "/more/reports": "reports",
  "/more/expiry": "expiry",
  "/more/shifts": "shifts",
  "/more/staff": "staff",
  "/more/profile": "profile",
  "/more/audit-log": "audit_log",
  "/more/settings/categories": "categories",
  "/more/settings": "settings",
  "/more/cash-up": "cash_up",
};

export function canAccessPath(role: BusinessRole, pathname: string): boolean {
  if (pathname === "/home" || pathname === "/more") return true;

  // Sort by path length descending so more-specific paths match before their prefixes
  const sorted = Object.entries(PATH_PERMISSIONS).sort((a, b) => b[0].length - a[0].length);
  for (const [path, permission] of sorted) {
    if (pathname === path || pathname.startsWith(`${path}/`)) {
      return hasPermission(role, permission);
    }
  }

  return true;
}

export function getFilteredMoreNav(role: BusinessRole) {
  return Object.entries(PATH_PERMISSIONS)
    .filter(([path]) => path.startsWith("/more/"))
    .reduce(
      (acc, [path, permission]) => {
        acc[path] = hasPermission(role, permission);
        return acc;
      },
      {} as Record<string, boolean>,
    );
}
