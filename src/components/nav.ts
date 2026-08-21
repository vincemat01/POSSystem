import type { LucideIcon } from "lucide-react";
import { Home, ShoppingCart, Package, Wallet, MoreHorizontal, Boxes, ClipboardList, Truck, ShoppingBag, Users, UserPlus, Receipt, History, BarChart3, CalendarClock, Settings, Banknote, Clock, UserCircle } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const primaryNav: NavItem[] = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/sale", label: "Sale", icon: ShoppingCart },
  { href: "/products", label: "Products", icon: Package },
  { href: "/credit", label: "Credit", icon: Wallet },
  { href: "/more", label: "More", icon: MoreHorizontal },
];

export const moreNav: NavItem[] = [
  { href: "/more/sales", label: "Sales", icon: History },
  { href: "/more/cash-up", label: "Cash Up", icon: Banknote },
  { href: "/more/inventory", label: "Inventory", icon: Boxes },
  { href: "/more/stock-take", label: "Stock Take", icon: ClipboardList },
  { href: "/more/suppliers", label: "Suppliers", icon: Truck },
  { href: "/more/purchases", label: "Purchases", icon: ShoppingBag },
  { href: "/more/customers", label: "Customers", icon: Users },
  { href: "/more/expenses", label: "Expenses", icon: Receipt },
  { href: "/more/reports", label: "Reports", icon: BarChart3 },
  { href: "/more/expiry", label: "Expiry", icon: CalendarClock },
  { href: "/more/shifts", label: "Shifts", icon: Clock },
  { href: "/more/staff", label: "Staff", icon: UserPlus },
  { href: "/more/profile", label: "My Profile", icon: UserCircle },
  { href: "/more/settings", label: "Settings", icon: Settings },
];
