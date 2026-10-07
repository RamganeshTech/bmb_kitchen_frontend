import type { ComponentType } from 'react';
import {
  ShoppingCart,
  ChefHat,
  LayoutGrid,
  Smartphone,
  UtensilsCrossed,
  Percent,
  XCircle,
  BarChart3,
  Lock,
  Package,
  Users,
  Settings,
  Store,
} from 'lucide-react';

// Keys must match PERMISSION_KEYS on the backend RoleModel
export interface PermissionOption {
  key: string;
  label: string;
  description: string;
  icon: ComponentType<{ size?: number }>;
}

export const PERMISSION_OPTIONS: PermissionOption[] = [
  { key: 'pos', label: 'POS billing', description: 'Create orders and take payments', icon: ShoppingCart },
  { key: 'kot', label: 'Kitchen (KOT)', description: 'See tickets and update item status', icon: ChefHat },
  { key: 'tables', label: 'Tables', description: 'Manage table status and reservations', icon: LayoutGrid },
  { key: 'captain', label: 'Captain ordering', description: 'Take orders from the floor', icon: Smartphone },
  { key: 'menu', label: 'Menu', description: 'Edit categories, items and prices', icon: UtensilsCrossed },
  { key: 'discount', label: 'Discounts', description: 'Apply offers and manual discounts', icon: Percent },
  { key: 'cancel', label: 'Cancel orders', description: 'Cancel running or billed orders', icon: XCircle },
  { key: 'reports', label: 'Reports', description: 'View sales and finance reports', icon: BarChart3 },
  { key: 'closing', label: 'Day closing', description: 'Close and reopen the day', icon: Lock },
  { key: 'inventory', label: 'Inventory', description: 'Stock, purchases and wastage', icon: Package },
  { key: 'staff', label: 'Staff', description: 'Add staff and assign roles', icon: Users },
  { key: 'settings', label: 'Settings', description: 'Tax, printers and integrations', icon: Settings },
  { key: 'outlets', label: 'Outlets', description: 'Manage outlets and transfers', icon: Store },
];

export const PERMISSION_LABEL_BY_KEY: Record<string, string> = Object.fromEntries(
  PERMISSION_OPTIONS.map((option) => [option.key, option.label])
);

// Plain-language help shown in the InfoTooltip of each permission box (for new staff)
export const PERMISSION_HELP: Record<string, string> = {
  pos: 'Controls the POS billing screen.\nView: see running and past bills.\nCreate: place new orders and take payment.\nEdit: add items to an order or change a bill.\nDelete: remove a bill.',
  kot: 'Controls the kitchen ticket board.\nView: see incoming tickets.\nCreate: send items to the kitchen.\nEdit: move items between preparing, ready and served.\nDelete: clear a ticket.',
  tables: 'Controls the floor plan.\nView: see table status.\nCreate: add a table.\nEdit: change status, details or reservations.\nDelete: remove a table.',
  captain: 'Controls ordering from the floor on a phone or tablet.\nView: see tables and running orders.\nCreate: take a new order.\nEdit: add items to an order.\nDelete: remove an item before it reaches the kitchen.',
  menu: 'Controls categories and menu items.\nView: browse the menu.\nCreate: add categories or items.\nEdit: change prices, variants and availability.\nDelete: deactivate or remove items.',
  discount: 'Controls offers and manual discounts.\nView: see offers.\nCreate: add an offer.\nEdit: change offer rules or apply a discount on a bill.\nDelete: remove an offer.',
  cancel: 'Controls order cancellation.\nView: see cancelled orders.\nCreate: not normally needed.\nEdit: cancel a running order.\nDelete: remove cancelled records.',
  reports: 'Controls sales and finance reports.\nView: open reports and dashboards.\nCreate: export or generate a report.\nEdit: not normally needed.\nDelete: not normally needed.',
  closing: 'Controls end-of-day closing.\nView: see closing summaries.\nCreate: close the day.\nEdit: reopen a closed day.\nDelete: remove a closing record.',
  inventory: 'Controls stock, purchases, vendors and wastage.\nView: see stock levels.\nCreate: add items, purchases or wastage entries.\nEdit: adjust stock and rates.\nDelete: deactivate or remove records.',
  staff: 'Controls the team.\nView: see staff and their access.\nCreate: add a staff member.\nEdit: change details, roles and permissions.\nDelete: remove a staff member.',
  settings: 'Controls business settings such as tax, printers and integrations.\nView: see current settings.\nCreate: add a printer, tax slab or integration.\nEdit: change settings.\nDelete: remove a printer or slab.',
  outlets: 'Controls outlets and stock transfers between them.\nView: see outlets and transfers.\nCreate: add an outlet or request a transfer.\nEdit: change outlet details or move a transfer forward.\nDelete: remove an outlet.',
};
